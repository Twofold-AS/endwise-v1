import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database } from '../src/client.ts';

/**
 * Reproduserer prod-500 etter #120 og Mons-negativer etter PR #121 v2.
 * Docker-eieren er superuser, så RLS-negativer SET ROLE til en
 * ikke-superuser som ikke eier tabellen. Trigger-tester kjører som eier
 * (trigger fyrer også for superuser).
 */

const OWNER_URL = process.env.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

const PROBE = 'endwise_owner_returning_probe';

describeDb('FORCE RLS eier INSERT … RETURNING på invitations', () => {
  let owner: Database;
  const tenantId = randomUUID();
  const otherTenantId = randomUUID();
  const invitedBy = '06bbcfb0-2c91-4ecc-9f90-b38c1b65f67a';

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    await owner.execute(
      sql.raw(`
      do $$
      begin
        if not exists (select 1 from pg_roles where rolname = '${PROBE}') then
          create role ${PROBE} nosuperuser nobypassrls nologin;
        end if;
      end $$;
    `),
    );
    await owner.execute(
      sql.raw(`
      grant usage on schema public to ${PROBE};
      grant select, insert, update on public.tenants to ${PROBE};
      grant select, insert, update on public.invitations to ${PROBE};
      grant usage on type public.job_function to ${PROBE};
    `),
    );
    await owner.execute(sql`
      insert into tenants (id, name, slug, kind)
      values
        (${tenantId}::uuid, 'Probe AS', ${`probe-${tenantId.slice(0, 8)}`}, 'live'),
        (${otherTenantId}::uuid, 'Annen AS', ${`probe-${otherTenantId.slice(0, 8)}`}, 'live')
    `);
    await owner.execute(sql`
      insert into invitations (
        tenant_id, email, token_hash, kind, job_function, role, invited_by, expires_at
      ) values
        (
          ${tenantId}::uuid,
          'probe-seed@example.invalid',
          ${`hash-seed-${tenantId}`},
          'owner', 'leder', 'dealer_admin', ${invitedBy},
          now() + interval '7 days'
        ),
        (
          ${otherTenantId}::uuid,
          'annen-seed@example.invalid',
          ${`hash-seed-${otherTenantId}`},
          'owner', 'leder', 'dealer_admin', ${invitedBy},
          now() + interval '7 days'
        )
    `);
  });

  afterAll(async () => {
    await owner.execute(
      sql`delete from invitations where tenant_id in (${tenantId}::uuid, ${otherTenantId}::uuid)`,
    );
    await owner.execute(
      sql`delete from tenants where id in (${tenantId}::uuid, ${otherTenantId}::uuid)`,
    );
    await owner.execute(sql.raw(`drop role if exists ${PROBE}`));
  });

  it('withTenant-GUC + INSERT tenants krever ingen preexisting tenants-rad', async () => {
    const res = await owner.execute(sql`
      select id from tenants where id = ${tenantId}::uuid
    `);
    expect(res.rows).toHaveLength(1);
  });

  it('INSERT uten RETURNING som eier-probe passerer WITH CHECK', async () => {
    await owner.transaction(async (tx) => {
      await tx.execute(sql.raw(`set local role ${PROBE}`));
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
      await tx.execute(sql`
        insert into invitations (
          tenant_id, email, token_hash, kind, job_function, role, invited_by, expires_at
        ) values (
          ${tenantId}::uuid,
          'probe-no-returning@example.invalid',
          ${`hash-no-ret-${tenantId}`},
          'owner',
          'leder',
          'dealer_admin',
          ${invitedBy},
          now() + interval '7 days'
        )
      `);
    });
  });

  it('negativ: uten platform_admin ser probe-rollen 0 invitations (CWE-862)', async () => {
    const res = await owner.transaction(async (tx) => {
      await tx.execute(sql.raw(`set local role ${PROBE}`));
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      return tx.execute(sql`select id from invitations where tenant_id = ${tenantId}::uuid`);
    });
    expect(res.rows).toHaveLength(0);
  });

  it('negativ: user-set platform_admin gir ikke SELECT/revoke (ikke tabelleier)', async () => {
    const sel = await owner.transaction(async (tx) => {
      await tx.execute(sql.raw(`set local role ${PROBE}`));
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
      return tx.execute(sql`select id from invitations where tenant_id = ${tenantId}::uuid`);
    });
    expect(sel.rows).toHaveLength(0);

    const rev = await owner.transaction(async (tx) => {
      await tx.execute(sql.raw(`set local role ${PROBE}`));
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
      return tx.execute(sql`
        update invitations
           set revoked_at = now()
         where tenant_id = ${tenantId}::uuid
           and kind = 'owner'
           and accepted_at is null
           and revoked_at is null
      `);
    });
    expect(Number(rev.rowCount ?? 0)).toBe(0);
  });

  it('negativ: tom tenant-guc matcher ikke alle rader', async () => {
    const totalt = await owner.execute(sql`
      select count(*)::int as n from invitations
       where tenant_id in (${tenantId}::uuid, ${otherTenantId}::uuid)
    `);
    expect(Number((totalt.rows[0] as { n: number }).n)).toBeGreaterThan(1);

    const res = await owner.transaction(async (tx) => {
      await tx.execute(sql.raw(`set local role ${PROBE}`));
      await tx.execute(sql`select set_config('app.tenant_id', '', true)`);
      await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
      return tx.execute(sql`
        select id from invitations
         where tenant_id in (${tenantId}::uuid, ${otherTenantId}::uuid)
      `);
    });
    expect(res.rows).toHaveLength(0);
  });

  it('negativ: probe (ikke tabelleier) får ikke INSERT … RETURNING selv med GUC-er', async () => {
    await expect(
      owner.transaction(async (tx) => {
        await tx.execute(sql.raw(`set local role ${PROBE}`));
        await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
        await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
        return tx.execute(sql`
          insert into invitations (
            tenant_id, email, token_hash, kind, job_function, role, invited_by, expires_at
          ) values (
            ${tenantId}::uuid,
            'probe-returning@example.invalid',
            ${`hash-ret-${tenantId}`},
            'owner',
            'leder',
            'dealer_admin',
            ${invitedBy},
            now() + interval '7 days'
          )
          returning id
        `);
      }),
    ).rejects.toThrow();
  });

  it('negativ: probe kan ikke endre e-post/hash/kind/rolle (CWE-915)', async () => {
    const res = await owner.transaction(async (tx) => {
      await tx.execute(sql.raw(`set local role ${PROBE}`));
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
      return tx.execute(sql`
        update invitations
           set email = 'stjelt@example.invalid',
               kind = 'platform',
               role = 'endwise_admin',
               token_hash = 'mutert'
         where tenant_id = ${tenantId}::uuid
      `);
    });
    expect(Number(res.rowCount ?? 0)).toBe(0);

    await expect(
      owner.execute(sql`
        update invitations
           set email = 'stjelt@example.invalid',
               kind = 'platform',
               role = 'endwise_admin',
               token_hash = 'mutert'
         where tenant_id = ${tenantId}::uuid
           and email = 'probe-seed@example.invalid'
      `),
    ).rejects.toThrow(/låst|accepted_at|revoked_at/i);
  });

  it('negativ: ikke-eier kan ikke revoke selv med platform_admin', async () => {
    const res = await owner.transaction(async (tx) => {
      await tx.execute(sql.raw(`set local role ${PROBE}`));
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
      return tx.execute(sql`
        update invitations set revoked_at = now()
         where email = 'probe-seed@example.invalid'
      `);
    });
    expect(Number(res.rowCount ?? 0)).toBe(0);
  });

  it('negativ: expires_at kan ikke forlenges og accepted_at kan ikke rearmes', async () => {
    await expect(
      owner.execute(sql`
        update invitations
           set expires_at = now() + interval '30 days'
         where tenant_id = ${tenantId}::uuid
           and email = 'probe-seed@example.invalid'
      `),
    ).rejects.toThrow(/låst|accepted_at|revoked_at/i);

    const [rad] = (
      await owner.execute(sql`
        insert into invitations (
          tenant_id, email, token_hash, kind, job_function, role, invited_by, expires_at
        ) values (
          ${tenantId}::uuid,
          'probe-accept@example.invalid',
          ${`hash-accept-${tenantId}`},
          'owner', 'leder', 'dealer_admin', ${invitedBy},
          now() + interval '7 days'
        )
        returning id
      `)
    ).rows as { id: string }[];

    await owner.execute(sql`
      update invitations set accepted_at = now() where id = ${rad.id}::uuid
    `);

    await expect(
      owner.execute(sql`
        update invitations set accepted_at = null where id = ${rad.id}::uuid
      `),
    ).rejects.toThrow(/låst|accepted_at|revoked_at/i);

    await expect(
      owner.execute(sql`
        update invitations set accepted_at = now() + interval '1 day' where id = ${rad.id}::uuid
      `),
    ).rejects.toThrow(/låst|accepted_at|revoked_at/i);
  });

  it('hjelpe-GUC er tom etter revoke-sti (ingen stale markør i tx)', async () => {
    const res = await owner.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
      await tx.execute(sql`
        update invitations
           set revoked_at = now()
         where tenant_id = ${tenantId}::uuid
           and email = 'probe-no-returning@example.invalid'
           and revoked_at is null
      `);
      await tx.execute(sql`select set_config('app.platform_admin', '', true)`);
      return tx.execute(sql`
        select
          current_setting('app.platform_admin', true) as platform_admin,
          current_setting('app.invite_revoke_tenant', true) as invite_revoke
      `);
    });
    const guc = res.rows[0] as { platform_admin: string; invite_revoke: string };
    expect(guc.platform_admin).toBe('');
    expect(guc.invite_revoke ?? '').toBe('');
  });

  it('DEFINER-revoke-funksjonen er DROP-et', async () => {
    const res = await owner.execute(sql`
      select exists (
        select 1
          from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname = 'revoke_open_owner_invitations'
      ) as ok
    `);
    expect((res.rows[0] as { ok: boolean }).ok).toBe(false);
  });
});
