import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database } from '../src/client.ts';

/**
 * Reproduserer prod-500 etter #120: eier-rolle under FORCE RLS.
 * Docker-eieren `endwise` er superuser og bypasser FORCE RLS, så vi
 * SET ROLE til en ikke-superuser som ikke er authenticated/endwise_app
 * — samme predikat som invitations_platform_admin_insert_owner.
 *
 * INSERT uten RETURNING passerer WITH CHECK (0037).
 * INSERT … RETURNING krever også SELECT-policy. Uten
 * invitations_platform_admin_select_owner kaster Postgres 42501.
 */

const OWNER_URL = process.env.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

const PROBE = 'endwise_owner_returning_probe';

describeDb('FORCE RLS eier INSERT … RETURNING på invitations', () => {
  let owner: Database;
  const tenantId = randomUUID();

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
  });

  afterAll(async () => {
    await owner.execute(sql`delete from invitations where tenant_id = ${tenantId}::uuid`);
    await owner.execute(sql`delete from tenants where id = ${tenantId}::uuid`);
    await owner.execute(sql.raw(`drop role if exists ${PROBE}`));
  });

  it('withTenant-GUC + INSERT tenants krever ingen preexisting tenants-rad', async () => {
    await owner.execute(sql`
      insert into tenants (id, name, slug, kind)
      values (${tenantId}::uuid, 'Probe AS', ${`probe-${tenantId.slice(0, 8)}`}, 'live')
    `);
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
          ${'06bbcfb0-2c91-4ecc-9f90-b38c1b65f67a'},
          now() + interval '7 days'
        )
      `);
    });
  });

  it('INSERT … RETURNING som eier-probe krever eier-SELECT (prod-500 etter #120)', async () => {
    const res = await owner.transaction(async (tx) => {
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
          ${'06bbcfb0-2c91-4ecc-9f90-b38c1b65f67a'},
          now() + interval '7 days'
        )
        returning id, tenant_id, kind, role
      `);
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]?.kind).toBe('owner');
    expect(res.rows[0]?.role).toBe('dealer_admin');
  });
});
