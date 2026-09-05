import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database } from '../src/client.ts';

/**
 * Prod APP_DATABASE_URL = rolle `endwise` under FORCE RLS.
 * 0039 ga eier-SELECT. onboarding.fullfor gjør deretter UPDATE på
 * tenants (navn + onboarding_completed_at) og tenant_modules
 * (enabled/source). Team-steg: INSERT … RETURNING invitations
 * uten platform_admin.
 *
 * Docker-eieren er superuser — samme stand-in som tenants-owner-select.
 */

const OWNER_URL = process.env.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

const STANDIN = 'endwise_tenant_update_owner_probe';

describeDb('SET ROLE endwise — owner UPDATE under FORCE RLS (fullfor)', () => {
  let owner: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  let eierRolle = 'endwise';
  let originalEier = 'endwise';
  const tabeller = ['tenants', 'tenant_modules', 'invitations'] as const;

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    const eierRad = await owner.execute(sql`
      select pg_get_userbyid(c.relowner) as eier, r.rolsuper
        from pg_class c
        join pg_roles r on r.oid = c.relowner
       where c.oid = 'public.tenants'::regclass
    `);
    const rad = eierRad.rows[0] as { eier: string; rolsuper: boolean };
    originalEier = rad.eier;

    await owner.execute(
      sql.raw(`
      do $$
      begin
        if not exists (select 1 from pg_roles where rolname = '${STANDIN}') then
          create role ${STANDIN} nosuperuser nobypassrls nologin;
        end if;
      end $$;
    `),
    );

    if (rad.rolsuper) {
      eierRolle = STANDIN;
      for (const t of tabeller) {
        await owner.execute(sql.raw(`alter table public.${t} owner to ${STANDIN}`));
      }
    } else {
      eierRolle = rad.eier;
    }

    await owner.execute(sql`
      insert into tenants (id, name, slug, kind)
      values
        (${tenantA}::uuid, 'Fullfor probe A', ${`upd-a-${tenantA.slice(0, 8)}`}, 'live'),
        (${tenantB}::uuid, 'Fullfor probe B', ${`upd-b-${tenantB.slice(0, 8)}`}, 'live')
    `);
    await owner.execute(sql`
      insert into tenant_modules (tenant_id, module_key, enabled, source)
      values
        (${tenantA}::uuid, 'ai-support', false, 'optional'),
        (${tenantB}::uuid, 'ai-support', false, 'optional')
    `);
  });

  afterAll(async () => {
    await owner.execute(
      sql`delete from invitations where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from tenant_modules where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(sql`delete from tenants where id in (${tenantA}::uuid, ${tenantB}::uuid)`);
    if (eierRolle === STANDIN) {
      for (const t of tabeller) {
        await owner.execute(sql.raw(`alter table public.${t} owner to ${originalEier}`));
      }
    }
    await owner.execute(sql.raw(`drop role if exists ${STANDIN}`));
  });

  async function somEier<T>(
    fn: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>,
  ): Promise<T> {
    return owner.transaction(async (tx) => {
      await tx.execute(sql.raw(`set local role ${eierRolle}`));
      return fn(tx);
    });
  }

  it('SET ROLE med withTenant-GUC SELECT ser egen tenant', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`select id, name from tenants where id = ${tenantA}::uuid`);
    });
    expect(res.rows).toHaveLength(1);
    expect((res.rows[0] as { name: string }).name).toBe('Fullfor probe A');
  });

  it('fullfor UPDATE-sti: eier med tenant-GUC kan sette navn + onboarding_completed_at', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        update tenants
           set name = 'Nytt visningsnavn AS',
               onboarding_completed_at = now(),
               updated_at = now()
         where id = ${tenantA}::uuid
        returning name, onboarding_completed_at
      `);
    });
    expect(res.rows).toHaveLength(1);
    const rad = res.rows[0] as { name: string; onboarding_completed_at: Date | string };
    expect(rad.name).toBe('Nytt visningsnavn AS');
    expect(rad.onboarding_completed_at).toBeTruthy();
  });

  it('fullfor UPDATE-sti: eier kan slå på optional tenant_modules (source=dealer)', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        update tenant_modules
           set enabled = true, source = 'dealer', updated_at = now()
         where tenant_id = ${tenantA}::uuid and module_key = 'ai-support'
        returning enabled, source
      `);
    });
    expect(res.rows).toHaveLength(1);
    const rad = res.rows[0] as { enabled: boolean; source: string };
    expect(rad.enabled).toBe(true);
    expect(rad.source).toBe('dealer');
  });

  it('uten tenant-GUC avvises UPDATE (empty GUC denied)', async () => {
    const tenants = await somEier(async (tx) =>
      tx.execute(sql`
        update tenants
           set name = 'Skal ikke', updated_at = now()
         where id = ${tenantA}::uuid
        returning id
      `),
    );
    expect(tenants.rows).toHaveLength(0);

    const modules = await somEier(async (tx) =>
      tx.execute(sql`
        update tenant_modules
           set enabled = false
         where tenant_id = ${tenantA}::uuid
        returning module_key
      `),
    );
    expect(modules.rows).toHaveLength(0);
  });

  it('tom tenant-GUC matcher ikke UPDATE', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', '', true)`);
      return tx.execute(sql`
        update tenants
           set name = 'Tom GUC', updated_at = now()
         where id = ${tenantA}::uuid
        returning id
      `);
    });
    expect(res.rows).toHaveLength(0);
  });

  it('tenant-GUC kan ikke UPDATE den andre tenanten', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        update tenants
           set name = 'Cross', updated_at = now()
         where id = ${tenantB}::uuid
        returning id
      `);
    });
    expect(res.rows).toHaveLength(0);
  });

  it('platform_admin alene (uten tenant-guc) gir ikke UPDATE', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
      return tx.execute(sql`
        update tenants
           set name = 'Bare admin', updated_at = now()
         where id = ${tenantA}::uuid
        returning id
      `);
    });
    expect(res.rows).toHaveLength(0);
  });

  it('eier-UPDATE kan ikke sette kind=platform', async () => {
    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
        return tx.execute(sql`
          update tenants
             set kind = 'platform', updated_at = now()
           where id = ${tenantA}::uuid
        `);
      }),
    ).rejects.toThrow(/kind=platform|42501/i);
  });

  it('staff-invite: eier med tenant-GUC kan INSERT … RETURNING uten platform_admin', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into invitations (
          tenant_id, email, token_hash, kind, job_function, role, invited_by, expires_at
        ) values (
          ${tenantA}::uuid,
          'staff-fullfor@example.invalid',
          ${`hash-staff-${tenantA}`},
          'staff', 'selger', 'dealer_staff',
          '06bbcfb0-2c91-4ecc-9f90-b38c1b65f67a',
          now() + interval '7 days'
        )
        returning id, email, kind
      `);
    });
    expect(res.rows).toHaveLength(1);
    expect((res.rows[0] as { kind: string; email: string }).kind).toBe('staff');
    expect((res.rows[0] as { email: string }).email).toBe('staff-fullfor@example.invalid');
  });

  it('staff-invite SELECT uten tenant-GUC er 0 (empty GUC denied)', async () => {
    const res = await somEier(async (tx) =>
      tx.execute(sql`
        select id from invitations
         where tenant_id = ${tenantA}::uuid and kind = 'staff'
      `),
    );
    expect(res.rows).toHaveLength(0);
  });
});
