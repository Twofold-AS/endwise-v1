import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database } from '../src/client.ts';

/**
 * Prod APP_DATABASE_URL = rolle `endwise` under FORCE RLS.
 * P0 dealer-skriv: INSERT … RETURNING + UPDATE der det trengs.
 * Docker-eieren er superuser — samme stand-in som services-owner-write.
 */

const OWNER_URL = process.env.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

const STANDIN = 'endwise_p0_dealer_write_probe';

const TABELLER = [
  'tenants',
  'customers',
  'customer_notes',
  'vehicles',
  'mechanics',
  'services',
  'service_versions',
  'bookings',
  'booking_services',
  'skills',
  'mechanic_skills',
  'threads',
  'thread_participants',
  'messages',
  'notifications',
  'parts',
  'stock_locations',
  'stock_levels',
  'stock_movements',
] as const;

describeDb('SET ROLE endwise — owner INSERT/RETURNING P0 dealer-skriv under FORCE RLS', () => {
  let owner: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  let eierRolle = 'endwise';
  let originalEier = 'endwise';
  let mechanicId = '';
  let serviceVersionId = '';

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    const eierRad = await owner.execute(sql`
      select pg_get_userbyid(c.relowner) as eier, r.rolsuper
        from pg_class c
        join pg_roles r on r.oid = c.relowner
       where c.oid = 'public.customers'::regclass
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
      for (const t of TABELLER) {
        await owner.execute(sql.raw(`alter table public.${t} owner to ${STANDIN}`));
      }
    } else {
      eierRolle = rad.eier;
    }

    await owner.execute(sql`
      insert into tenants (id, name, slug, kind)
      values
        (${tenantA}::uuid, 'P0 probe A', ${`p0-a-${tenantA.slice(0, 8)}`}, 'live'),
        (${tenantB}::uuid, 'P0 probe B', ${`p0-b-${tenantB.slice(0, 8)}`}, 'live')
    `);

    const mech = await owner.execute(sql`
      insert into mechanics (tenant_id, name)
      values (${tenantA}::uuid, 'P0 mekaniker')
      returning id
    `);
    mechanicId = (mech.rows[0] as { id: string }).id;

    const svc = await owner.execute(sql`
      insert into services (tenant_id, name, vehicle_type)
      values (${tenantA}::uuid, 'P0 EU', 'mc')
      returning id
    `);
    const serviceId = (svc.rows[0] as { id: string }).id;
    const ver = await owner.execute(sql`
      insert into service_versions (tenant_id, service_id, version, duration_minutes)
      values (${tenantA}::uuid, ${serviceId}::uuid, 1, 60)
      returning id
    `);
    serviceVersionId = (ver.rows[0] as { id: string }).id;
  });

  afterAll(async () => {
    await owner.execute(
      sql`delete from stock_movements where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from stock_levels where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from parts where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from stock_locations where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from messages where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from thread_participants where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from threads where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from notifications where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from booking_services where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from bookings where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from customer_notes where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from vehicles where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from mechanic_skills where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from skills where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from service_versions where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from services where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from mechanics where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from customers where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(sql`delete from tenants where id in (${tenantA}::uuid, ${tenantB}::uuid)`);
    if (eierRolle === STANDIN) {
      for (const t of [...TABELLER].reverse()) {
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

  it('eier med tenant-GUC kan INSERT…RETURNING customers (create-stien)', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into customers (tenant_id, name)
        values (${tenantA}::uuid, 'Ola Nordmann')
        returning id, name
      `);
    });
    expect(res.rows).toHaveLength(1);
    expect((res.rows[0] as { name: string }).name).toBe('Ola Nordmann');
  });

  it('eier med tenant-GUC kan INSERT…RETURNING customer_notes', async () => {
    const kunde = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into customers (tenant_id, name)
        values (${tenantA}::uuid, 'Notatkunde')
        returning id
      `);
    });
    const customerId = (kunde.rows[0] as { id: string }).id;
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into customer_notes (tenant_id, customer_id, author_id, body)
        values (${tenantA}::uuid, ${customerId}::uuid, 'user-1', 'Ring tilbake')
        returning body
      `);
    });
    expect((res.rows[0] as { body: string }).body).toBe('Ring tilbake');
  });

  it('eier med tenant-GUC kan INSERT…RETURNING vehicles', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into vehicles (tenant_id, type, reg_number)
        values (${tenantA}::uuid, 'mc', 'AB12345')
        returning reg_number
      `);
    });
    expect((res.rows[0] as { reg_number: string }).reg_number).toBe('AB12345');
  });

  it('eier med tenant-GUC kan INSERT…RETURNING bookings + booking_services', async () => {
    const start = new Date('2026-09-05T08:00:00Z');
    const slutt = new Date('2026-09-05T09:00:00Z');
    const booking = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into bookings (
          tenant_id, service_version_id, mechanic_id, starts_at, ends_at, source
        )
        values (
          ${tenantA}::uuid, ${serviceVersionId}::uuid, ${mechanicId}::uuid,
          ${start}, ${slutt}, 'admin'
        )
        returning id
      `);
    });
    expect(booking.rows).toHaveLength(1);
    const bookingId = (booking.rows[0] as { id: string }).id;
    const linje = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into booking_services (
          tenant_id, booking_id, service_version_id, duration_minutes
        )
        values (${tenantA}::uuid, ${bookingId}::uuid, ${serviceVersionId}::uuid, 60)
        returning duration_minutes
      `);
    });
    expect((linje.rows[0] as { duration_minutes: number }).duration_minutes).toBe(60);
  });

  it('eier med tenant-GUC kan INSERT…RETURNING skills', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into skills (tenant_id, key, name)
        values (${tenantA}::uuid, 'mc-eu', 'EU-kontroll')
        returning key, name
      `);
    });
    expect((res.rows[0] as { key: string }).key).toBe('mc-eu');
  });

  it('eier med tenant-GUC kan INSERT…RETURNING threads + messages', async () => {
    const traad = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into threads (tenant_id, kind, subject)
        values (${tenantA}::uuid, 'customer_dealer', 'Hei')
        returning id
      `);
    });
    const threadId = (traad.rows[0] as { id: string }).id;
    const msg = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into messages (tenant_id, thread_id, author_id, body)
        values (${tenantA}::uuid, ${threadId}::uuid, 'user-1', 'Hallo')
        returning body
      `);
    });
    expect((msg.rows[0] as { body: string }).body).toBe('Hallo');
  });

  it('eier med tenant-GUC kan INSERT…RETURNING parts + stock_movements', async () => {
    const del = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into parts (tenant_id, sku, name)
        values (${tenantA}::uuid, 'OLJE-1', 'Motorolje')
        returning id
      `);
    });
    const partId = (del.rows[0] as { id: string }).id;
    const lok = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into stock_locations (tenant_id, code, name)
        values (${tenantA}::uuid, 'A-01', 'Hylle A')
        returning id
      `);
    });
    const locationId = (lok.rows[0] as { id: string }).id;
    const bev = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into stock_movements (tenant_id, part_id, location_id, kind, quantity)
        values (${tenantA}::uuid, ${partId}::uuid, ${locationId}::uuid, 'in', 4)
        returning quantity
      `);
    });
    expect((bev.rows[0] as { quantity: number }).quantity).toBe(4);
  });

  it('uten tenant-GUC avvises customers INSERT (ikke blanket eier-skriv)', async () => {
    await expect(
      somEier(async (tx) =>
        tx.execute(sql`
          insert into customers (tenant_id, name)
          values (${tenantA}::uuid, 'Uten GUC')
        `),
      ),
    ).rejects.toThrow(/row-level security|42501|violates/i);
  });

  it('tom tenant-GUC matcher ikke', async () => {
    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.tenant_id', '', true)`);
        return tx.execute(sql`
          insert into customers (tenant_id, name)
          values (${tenantA}::uuid, 'Tom GUC')
        `);
      }),
    ).rejects.toThrow(/row-level security|42501|violates/i);
  });

  it('tenant-GUC kan ikke skrive den andre tenanten', async () => {
    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
        return tx.execute(sql`
          insert into customers (tenant_id, name)
          values (${tenantB}::uuid, 'Cross')
        `);
      }),
    ).rejects.toThrow(/row-level security|42501|violates/i);
  });

  it('platform_admin alene (uten tenant-guc) gir ikke INSERT', async () => {
    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
        return tx.execute(sql`
          insert into customers (tenant_id, name)
          values (${tenantA}::uuid, 'Bare admin')
        `);
      }),
    ).rejects.toThrow(/row-level security|42501|violates/i);
  });

  it('eier-UPDATE kan ikke flytte customer.tenant_id', async () => {
    const opprettet = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into customers (tenant_id, name)
        values (${tenantA}::uuid, 'Låst identitet')
        returning id
      `);
    });
    const id = (opprettet.rows[0] as { id: string }).id;
    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
        return tx.execute(sql`
          update customers
             set tenant_id = ${tenantB}::uuid
           where id = ${id}::uuid
        `);
      }),
    ).rejects.toThrow(/ikke endre id, tenant_id eller created_at|42501/i);
  });

  it('eier-UPDATE kan ikke endre messages.body', async () => {
    const traad = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      const t = await tx.execute(sql`
        insert into threads (tenant_id, kind)
        values (${tenantA}::uuid, 'customer_dealer')
        returning id
      `);
      const threadId = (t.rows[0] as { id: string }).id;
      return tx.execute(sql`
        insert into messages (tenant_id, thread_id, author_id, body)
        values (${tenantA}::uuid, ${threadId}::uuid, 'user-1', 'Original')
        returning id
      `);
    });
    const messageId = (traad.rows[0] as { id: string }).id;
    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
        return tx.execute(sql`
          update messages
             set body = 'Endret'
           where id = ${messageId}::uuid
        `);
      }),
    ).rejects.toThrow(/meldingstekst eller avsender|42501/i);
  });

  it('eier med tenant-GUC kan DELETE mechanic_skills (removeMechanicSkill)', async () => {
    await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      await tx.execute(sql`
        insert into skills (tenant_id, key, name)
        values (${tenantA}::uuid, 'mc-del', 'Slett-meg')
      `);
      await tx.execute(sql`
        insert into mechanic_skills (tenant_id, mechanic_id, skill_key, level)
        values (${tenantA}::uuid, ${mechanicId}::uuid, 'mc-del', 3)
      `);
    });
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        delete from mechanic_skills
         where tenant_id = ${tenantA}::uuid
           and mechanic_id = ${mechanicId}::uuid
           and skill_key = 'mc-del'
        returning skill_key
      `);
    });
    expect(res.rows).toHaveLength(1);
    expect((res.rows[0] as { skill_key: string }).skill_key).toBe('mc-del');
  });

  it('uten tenant-GUC avvises mechanic_skills DELETE', async () => {
    await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      await tx.execute(sql`
        insert into skills (tenant_id, key, name)
        values (${tenantA}::uuid, 'mc-del-guc', 'Slett uten GUC')
      `);
      await tx.execute(sql`
        insert into mechanic_skills (tenant_id, mechanic_id, skill_key, level)
        values (${tenantA}::uuid, ${mechanicId}::uuid, 'mc-del-guc', 3)
      `);
    });
    const res = await somEier(async (tx) =>
      tx.execute(sql`
        delete from mechanic_skills
         where skill_key = 'mc-del-guc'
        returning skill_key
      `),
    );
    expect(res.rows).toHaveLength(0);
  });

  it('tom tenant-GUC avviser mechanic_skills DELETE', async () => {
    await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      await tx.execute(sql`
        insert into skills (tenant_id, key, name)
        values (${tenantA}::uuid, 'mc-del-tom', 'Slett tom GUC')
      `);
      await tx.execute(sql`
        insert into mechanic_skills (tenant_id, mechanic_id, skill_key, level)
        values (${tenantA}::uuid, ${mechanicId}::uuid, 'mc-del-tom', 3)
      `);
    });
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', '', true)`);
      return tx.execute(sql`
        delete from mechanic_skills
         where skill_key = 'mc-del-tom'
        returning skill_key
      `);
    });
    expect(res.rows).toHaveLength(0);
  });

  it('tenant-GUC kan ikke slette den andre tenantens mechanic_skills', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantB}, true)`);
      return tx.execute(sql`
        delete from mechanic_skills
         where tenant_id = ${tenantA}::uuid
        returning skill_key
      `);
    });
    expect(res.rows).toHaveLength(0);
  });

  it('platform_admin alene (uten tenant-guc) gir ikke DELETE på mechanic_skills', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
      return tx.execute(sql`
        delete from mechanic_skills
         where tenant_id = ${tenantA}::uuid
        returning skill_key
      `);
    });
    expect(res.rows).toHaveLength(0);
  });

  it('uten tenant-GUC avvises customers UPDATE (empty GUC denied)', async () => {
    const opprettet = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into customers (tenant_id, name)
        values (${tenantA}::uuid, 'Upd uten')
        returning id
      `);
    });
    const id = (opprettet.rows[0] as { id: string }).id;
    const res = await somEier(async (tx) =>
      tx.execute(sql`
        update customers
           set name = 'X'
         where id = ${id}::uuid
        returning id
      `),
    );
    expect(res.rows).toHaveLength(0);
  });
});
