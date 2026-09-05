import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database } from '../src/client.ts';

/**
 * Prod APP_DATABASE_URL = rolle `endwise` under FORCE RLS.
 * services.create: INSERT services RETURNING, deretter INSERT service_versions.
 * update: UPDATE service_versions.valid_to + INSERT ny versjon.
 * deactivate/reactivate: UPDATE services.active.
 *
 * Docker-eieren er superuser — samme stand-in som member-profiles-owner-insert.
 */

const OWNER_URL = process.env.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

const STANDIN = 'endwise_services_write_probe';

describeDb('SET ROLE endwise — owner INSERT/RETURNING services under FORCE RLS', () => {
  let owner: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  let eierRolle = 'endwise';
  let originalEier = 'endwise';
  const tabeller = ['tenants', 'services', 'service_versions'] as const;

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    const eierRad = await owner.execute(sql`
      select pg_get_userbyid(c.relowner) as eier, r.rolsuper
        from pg_class c
        join pg_roles r on r.oid = c.relowner
       where c.oid = 'public.services'::regclass
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
        (${tenantA}::uuid, 'Tjeneste probe A', ${`svc-a-${tenantA.slice(0, 8)}`}, 'live'),
        (${tenantB}::uuid, 'Tjeneste probe B', ${`svc-b-${tenantB.slice(0, 8)}`}, 'live')
    `);
  });

  afterAll(async () => {
    await owner.execute(
      sql`delete from service_versions where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from services where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
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

  it('eier med tenant-GUC kan INSERT…RETURNING services (create-stien)', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into services (tenant_id, name, vehicle_type)
        values (${tenantA}::uuid, 'EU', 'mc')
        returning id, name, vehicle_type
      `);
    });
    expect(res.rows).toHaveLength(1);
    const rad = res.rows[0] as { name: string; vehicle_type: string };
    expect(rad.name).toBe('EU');
    expect(rad.vehicle_type).toBe('mc');
  });

  it('eier med tenant-GUC kan INSERT…RETURNING service_versions (pris + beskrivelse)', async () => {
    const opprettet = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into services (tenant_id, name, vehicle_type)
        values (${tenantA}::uuid, 'EU versjon', 'mc')
        returning id
      `);
    });
    const serviceId = (opprettet.rows[0] as { id: string }).id;
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into service_versions (
          tenant_id, service_id, version, duration_minutes, price_minor, description
        )
        values (
          ${tenantA}::uuid, ${serviceId}::uuid, 1, 60, 145000, 'Gjennomgang av kjøretøy før EU'
        )
        returning version, price_minor, description
      `);
    });
    expect(res.rows).toHaveLength(1);
    const rad = res.rows[0] as { version: number; price_minor: number; description: string };
    expect(rad.version).toBe(1);
    expect(rad.price_minor).toBe(145000);
    expect(rad.description).toBe('Gjennomgang av kjøretøy før EU');
  });

  it('uten tenant-GUC avvises services INSERT (ikke blanket eier-skriv)', async () => {
    await expect(
      somEier(async (tx) =>
        tx.execute(sql`
          insert into services (tenant_id, name, vehicle_type)
          values (${tenantA}::uuid, 'Uten GUC', 'mc')
        `),
      ),
    ).rejects.toThrow(/row-level security|42501|violates/i);
  });

  it('tom tenant-GUC matcher ikke', async () => {
    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.tenant_id', '', true)`);
        return tx.execute(sql`
          insert into services (tenant_id, name, vehicle_type)
          values (${tenantA}::uuid, 'Tom GUC', 'mc')
        `);
      }),
    ).rejects.toThrow(/row-level security|42501|violates/i);
  });

  it('tenant-GUC kan ikke skrive den andre tenanten', async () => {
    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
        return tx.execute(sql`
          insert into services (tenant_id, name, vehicle_type)
          values (${tenantB}::uuid, 'Cross', 'mc')
        `);
      }),
    ).rejects.toThrow(/row-level security|42501|violates/i);
  });

  it('platform_admin alene (uten tenant-guc) gir ikke INSERT', async () => {
    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
        return tx.execute(sql`
          insert into services (tenant_id, name, vehicle_type)
          values (${tenantA}::uuid, 'Bare admin', 'mc')
        `);
      }),
    ).rejects.toThrow(/row-level security|42501|violates/i);
  });

  it('eier med tenant-GUC kan deaktivere (UPDATE active)', async () => {
    const opprettet = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into services (tenant_id, name, vehicle_type)
        values (${tenantA}::uuid, 'Deaktiver meg', 'mc')
        returning id
      `);
    });
    const serviceId = (opprettet.rows[0] as { id: string }).id;
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        update services
           set active = false
         where id = ${serviceId}::uuid
        returning active
      `);
    });
    expect(res.rows).toHaveLength(1);
    expect((res.rows[0] as { active: boolean }).active).toBe(false);
  });

  it('eier-UPDATE kan ikke endre name eller vehicle_type', async () => {
    const opprettet = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into services (tenant_id, name, vehicle_type)
        values (${tenantA}::uuid, 'Låst navn', 'mc')
        returning id
      `);
    });
    const serviceId = (opprettet.rows[0] as { id: string }).id;
    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
        return tx.execute(sql`
          update services
             set name = 'Stjålet'
           where id = ${serviceId}::uuid
        `);
      }),
    ).rejects.toThrow(/bare sette active|42501/i);
  });

  it('eier kan lukke versjon med valid_to, ikke endre pris', async () => {
    const opprettet = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      const svc = await tx.execute(sql`
        insert into services (tenant_id, name, vehicle_type)
        values (${tenantA}::uuid, 'Prisvakt', 'mc')
        returning id
      `);
      const serviceId = (svc.rows[0] as { id: string }).id;
      return tx.execute(sql`
        insert into service_versions (
          tenant_id, service_id, version, duration_minutes, price_minor
        )
        values (${tenantA}::uuid, ${serviceId}::uuid, 1, 30, 10000)
        returning id
      `);
    });
    const versionId = (opprettet.rows[0] as { id: string }).id;

    const lukket = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        update service_versions
           set valid_to = now()
         where id = ${versionId}::uuid
        returning valid_to
      `);
    });
    expect(lukket.rows).toHaveLength(1);
    expect((lukket.rows[0] as { valid_to: Date | string }).valid_to).toBeTruthy();

    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
        return tx.execute(sql`
          update service_versions
             set price_minor = 1
           where id = ${versionId}::uuid
        `);
      }),
    ).rejects.toThrow(/bare sette valid_to|42501/i);
  });

  it('uten tenant-GUC avvises services UPDATE', async () => {
    const opprettet = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into services (tenant_id, name, vehicle_type)
        values (${tenantA}::uuid, 'Upd uten', 'mc')
        returning id
      `);
    });
    const serviceId = (opprettet.rows[0] as { id: string }).id;
    await expect(
      somEier(async (tx) =>
        tx.execute(sql`
          update services
             set active = false
           where id = ${serviceId}::uuid
        `),
      ),
    ).rejects.toThrow(/row-level security|42501|violates/i);
  });
});
