import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database } from '../src/client.ts';

/**
 * Prod APP_DATABASE_URL = rolle `endwise` under FORCE RLS.
 * 0039 ga eier-SELECT på member_profiles. godta gjør INSERT
 * (job_function leder på eier-invite). Uten eier-INSERT: 42501 /
 * «Failed query: insert into member_profiles».
 *
 * Docker-eieren er superuser — samme stand-in som tenants-owner-select.
 */

const OWNER_URL = process.env.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

const STANDIN = 'endwise_member_profiles_insert_probe';

describeDb('SET ROLE endwise — owner INSERT member_profiles under FORCE RLS', () => {
  let owner: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  let eierRolle = 'endwise';
  let originalEier = 'endwise';
  const tabeller = ['tenants', 'member_profiles'] as const;

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    const eierRad = await owner.execute(sql`
      select pg_get_userbyid(c.relowner) as eier, r.rolsuper
        from pg_class c
        join pg_roles r on r.oid = c.relowner
       where c.oid = 'public.member_profiles'::regclass
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
        (${tenantA}::uuid, 'Insert probe A', ${`mp-a-${tenantA.slice(0, 8)}`}, 'live'),
        (${tenantB}::uuid, 'Insert probe B', ${`mp-b-${tenantB.slice(0, 8)}`}, 'live')
    `);
  });

  afterAll(async () => {
    await owner.execute(
      sql`delete from member_profiles where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
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

  it('eier med tenant-GUC kan INSERT member_profiles (godta-stien)', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into member_profiles (tenant_id, user_id, job_function)
        values (${tenantA}::uuid, 'godta-eier', 'leder')
        returning user_id, job_function
      `);
    });
    expect(res.rows).toHaveLength(1);
    expect((res.rows[0] as { user_id: string; job_function: string }).job_function).toBe('leder');
  });

  it('uten tenant-GUC avvises INSERT (ikke blanket eier-skriv)', async () => {
    await expect(
      somEier(async (tx) =>
        tx.execute(sql`
          insert into member_profiles (tenant_id, user_id, job_function)
          values (${tenantA}::uuid, 'uten-guc', 'leder')
        `),
      ),
    ).rejects.toThrow(/row-level security|42501|violates/i);
  });

  it('tom tenant-GUC matcher ikke', async () => {
    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.tenant_id', '', true)`);
        return tx.execute(sql`
          insert into member_profiles (tenant_id, user_id, job_function)
          values (${tenantA}::uuid, 'tom-guc', 'leder')
        `);
      }),
    ).rejects.toThrow(/row-level security|42501|violates/i);
  });

  it('tenant-GUC kan ikke skrive den andre tenanten', async () => {
    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
        return tx.execute(sql`
          insert into member_profiles (tenant_id, user_id, job_function)
          values (${tenantB}::uuid, 'cross-tenant', 'leder')
        `);
      }),
    ).rejects.toThrow(/row-level security|42501|violates/i);
  });

  it('platform_admin alene (uten tenant-guc) gir ikke INSERT', async () => {
    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
        return tx.execute(sql`
          insert into member_profiles (tenant_id, user_id, job_function)
          values (${tenantA}::uuid, 'bare-admin', 'leder')
        `);
      }),
    ).rejects.toThrow(/row-level security|42501|violates/i);
  });
});
