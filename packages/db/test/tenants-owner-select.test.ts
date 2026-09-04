import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database } from '../src/client.ts';

/**
 * Prod: APP_DATABASE_URL = rolle `endwise` (tabelleier, ikke superuser)
 * under FORCE RLS. withTenant setter app.tenant_id. Uten eier-SELECT
 * som matcher den GUC-en er tenants usynlig → «Fant ikke forhandleren».
 *
 * Docker-eieren `endwise` er superuser og bypasser FORCE RLS, så
 * `SET ROLE endwise` alene ikke beviser isolasjon. Når eieren er
 * superuser overtar vi eierskap til en nosuperuser-rolle og SET ROLE
 * til den — samme predikat som policyen (current_user = tabelleier).
 * Når `endwise` ikke er superuser (Scaleway) kjører vi bokstavelig
 * SET ROLE endwise.
 */

const OWNER_URL = process.env.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

const STANDIN = 'endwise_tenant_select_owner_probe';

describeDb('SET ROLE endwise — owner SELECT under FORCE RLS', () => {
  let owner: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  let eierRolle = 'endwise';
  let originalEier = 'endwise';
  const tabeller = [
    'tenants',
    'dealer_profiles',
    'tenant_modules',
    'member_profiles',
    'mechanics',
  ] as const;

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
        (${tenantA}::uuid, 'Mikael RK probe', ${`probe-a-${tenantA.slice(0, 8)}`}, 'live'),
        (${tenantB}::uuid, 'Annen probe', ${`probe-b-${tenantB.slice(0, 8)}`}, 'live')
    `);
    await owner.execute(sql`
      insert into dealer_profiles (tenant_id, orgnr, address)
      values (${tenantA}::uuid, '123456789', 'Gate 1')
    `);
    await owner.execute(sql`
      insert into tenant_modules (tenant_id, module_key, enabled, source)
      values (${tenantA}::uuid, 'ai-support', true, 'included')
    `);
    await owner.execute(sql`
      insert into member_profiles (tenant_id, user_id, nickname)
      values (${tenantA}::uuid, 'probe-user', 'Probe')
    `);
    await owner.execute(sql`
      insert into mechanics (tenant_id, name, active)
      values (${tenantA}::uuid, 'Probe mekaniker', true)
    `);
  });

  afterAll(async () => {
    await owner.execute(sql`delete from mechanics where tenant_id = ${tenantA}::uuid`);
    await owner.execute(sql`delete from member_profiles where tenant_id = ${tenantA}::uuid`);
    await owner.execute(sql`delete from tenant_modules where tenant_id = ${tenantA}::uuid`);
    await owner.execute(sql`delete from dealer_profiles where tenant_id = ${tenantA}::uuid`);
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

  it('SET ROLE endwise (eller nosuperuser-eier) med withTenant-GUC ser egen tenant', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`select id, name from tenants where id = ${tenantA}::uuid`);
    });
    expect(res.rows).toHaveLength(1);
    expect((res.rows[0] as { name: string }).name).toBe('Mikael RK probe');
  });

  it('uten tenant-GUC ser eieren 0 tenants (ikke alle)', async () => {
    const res = await somEier(async (tx) => {
      return tx.execute(
        sql`select id from tenants where id in (${tenantA}::uuid, ${tenantB}::uuid)`,
      );
    });
    expect(res.rows).toHaveLength(0);
  });

  it('tom tenant-GUC matcher ikke (nullif)', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', '', true)`);
      return tx.execute(
        sql`select id from tenants where id in (${tenantA}::uuid, ${tenantB}::uuid)`,
      );
    });
    expect(res.rows).toHaveLength(0);
  });

  it('tenant-GUC viser ikke den andre tenanten', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`select id from tenants where id = ${tenantB}::uuid`);
    });
    expect(res.rows).toHaveLength(0);
  });

  it('platform_admin-stien er uendret (read_owner ser alle uten tenant-guc)', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
      return tx.execute(
        sql`select id from tenants where id in (${tenantA}::uuid, ${tenantB}::uuid) order by name`,
      );
    });
    expect(res.rows).toHaveLength(2);
  });

  it('dealer_profiles: withTenant-GUC ser egen rad, uten GUC 0', async () => {
    const med = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(
        sql`select tenant_id from dealer_profiles where tenant_id = ${tenantA}::uuid`,
      );
    });
    expect(med.rows).toHaveLength(1);

    const uten = await somEier(async (tx) => {
      return tx.execute(
        sql`select tenant_id from dealer_profiles where tenant_id = ${tenantA}::uuid`,
      );
    });
    expect(uten.rows).toHaveLength(0);
  });

  it('tenant_modules / member_profiles / mechanics: samme tenant-guc', async () => {
    const med = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      const modules = await tx.execute(
        sql`select module_key from tenant_modules where tenant_id = ${tenantA}::uuid`,
      );
      const profiler = await tx.execute(
        sql`select user_id from member_profiles where tenant_id = ${tenantA}::uuid`,
      );
      const mek = await tx.execute(
        sql`select name from mechanics where tenant_id = ${tenantA}::uuid`,
      );
      return { modules: modules.rows.length, profiler: profiler.rows.length, mek: mek.rows.length };
    });
    expect(med).toEqual({ modules: 1, profiler: 1, mek: 1 });

    const uten = await somEier(async (tx) => {
      const modules = await tx.execute(
        sql`select module_key from tenant_modules where tenant_id = ${tenantA}::uuid`,
      );
      return modules.rows.length;
    });
    expect(uten).toBe(0);
  });

  it('bokstavelig SET ROLE endwise når rollen finnes', async () => {
    const rolle = await owner.execute(sql`
      select rolname, rolsuper from pg_roles where rolname = 'endwise'
    `);
    expect(rolle.rows.length, 'rollen endwise skal finnes (Docker/prod)').toBeGreaterThan(0);
    await owner.transaction(async (tx) => {
      await tx.execute(sql.raw('set local role endwise'));
      const hvem = await tx.execute(sql`select current_user as u`);
      expect((hvem.rows[0] as { u: string }).u).toBe('endwise');
    });
  });
});
