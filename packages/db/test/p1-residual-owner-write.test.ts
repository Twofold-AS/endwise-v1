import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database } from '../src/client.ts';

/**
 * Prod APP_DATABASE_URL = rolle `endwise` under FORCE RLS.
 * Residual etter 0042/0043: dealer_profiles, widget_keys, Quick,
 * billing, shop, stream, flags, mechanics UPDATE, tenant_modules INSERT.
 * Docker-eieren er superuser — samme stand-in som p0-dealer-owner-write.
 */

const OWNER_URL = process.env.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

const STANDIN = 'endwise_p1_residual_write_probe';

const TABELLER = [
  'tenants',
  'dealer_profiles',
  'integration_config',
  'widget_keys',
  'mechanics',
  'billing_customers',
  'tenant_modules',
  'sync_conflicts',
  'stream_events',
  'parts',
  'shop_orders',
  'shop_order_lines',
  'feature_flag_overrides',
] as const;

describeDb('SET ROLE endwise — residual owner INSERT/UPDATE under FORCE RLS', () => {
  let owner: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  let eierRolle = 'endwise';
  let originalEier = 'endwise';
  let mechanicId = '';
  let partId = '';

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    const eierRad = await owner.execute(sql`
      select pg_get_userbyid(c.relowner) as eier, r.rolsuper
        from pg_class c
        join pg_roles r on r.oid = c.relowner
       where c.oid = 'public.dealer_profiles'::regclass
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
        (${tenantA}::uuid, 'P1 probe A', ${`p1-a-${tenantA.slice(0, 8)}`}, 'live'),
        (${tenantB}::uuid, 'P1 probe B', ${`p1-b-${tenantB.slice(0, 8)}`}, 'live')
    `);

    const mech = await owner.execute(sql`
      insert into mechanics (tenant_id, name, capacity)
      values (${tenantA}::uuid, 'P1 mekaniker', 1)
      returning id
    `);
    mechanicId = (mech.rows[0] as { id: string }).id;

    const del = await owner.execute(sql`
      insert into parts (tenant_id, sku, name)
      values (${tenantA}::uuid, 'P1-DEL', 'P1 del')
      returning id
    `);
    partId = (del.rows[0] as { id: string }).id;
  });

  afterAll(async () => {
    await owner.execute(
      sql`delete from shop_order_lines where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from shop_orders where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from feature_flag_overrides where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from stream_events where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from sync_conflicts where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from widget_keys where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from integration_config where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from billing_customers where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from dealer_profiles where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from tenant_modules where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from parts where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
    );
    await owner.execute(
      sql`delete from mechanics where tenant_id in (${tenantA}::uuid, ${tenantB}::uuid)`,
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

  it('eier med tenant-GUC kan INSERT…RETURNING dealer_profiles', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into dealer_profiles (tenant_id, city)
        values (${tenantA}::uuid, 'Oslo')
        returning city
      `);
    });
    expect((res.rows[0] as { city: string }).city).toBe('Oslo');
  });

  it('eier med tenant-GUC kan UPDATE dealer_profiles', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        update dealer_profiles
           set city = 'Bergen'
         where tenant_id = ${tenantA}::uuid
        returning city
      `);
    });
    expect((res.rows[0] as { city: string }).city).toBe('Bergen');
  });

  it('eier med tenant-GUC kan INSERT…RETURNING integration_config', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into integration_config (tenant_id, provider, last_sync_status)
        values (${tenantA}::uuid, 'quick', 'ok')
        returning provider, last_sync_status
      `);
    });
    expect((res.rows[0] as { provider: string }).provider).toBe('quick');
  });

  it('eier med tenant-GUC kan INSERT…RETURNING widget_keys', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into widget_keys (tenant_id, publishable_key, label)
        values (${tenantA}::uuid, ${`pk_live_p1_${tenantA.slice(0, 8)}`}, 'Test')
        returning label
      `);
    });
    expect((res.rows[0] as { label: string }).label).toBe('Test');
  });

  it('eier med tenant-GUC kan UPDATE mechanics.capacity', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        update mechanics
           set capacity = 4
         where id = ${mechanicId}::uuid
        returning capacity
      `);
    });
    expect((res.rows[0] as { capacity: number }).capacity).toBe(4);
  });

  it('eier med tenant-GUC kan INSERT…RETURNING billing_customers', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into billing_customers (tenant_id, plan_key, status)
        values (${tenantA}::uuid, 'start', 'active')
        returning plan_key
      `);
    });
    expect((res.rows[0] as { plan_key: string }).plan_key).toBe('start');
  });

  it('eier med tenant-GUC kan INSERT tenant_modules uten platform_admin', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into tenant_modules (tenant_id, module_key, enabled, source)
        values (${tenantA}::uuid, 'widget', true, 'included')
        returning module_key
      `);
    });
    expect((res.rows[0] as { module_key: string }).module_key).toBe('widget');
  });

  it('eier med tenant-GUC kan INSERT…RETURNING sync_conflicts + stream_events', async () => {
    const konflikt = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into sync_conflicts (
          tenant_id, provider, entity, entity_id, field, our_value, their_value
        )
        values (
          ${tenantA}::uuid, 'quick', 'customer', ${tenantA}::uuid, 'phone', '1', '2'
        )
        returning field
      `);
    });
    expect((konflikt.rows[0] as { field: string }).field).toBe('phone');

    const ev = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into stream_events (tenant_id, type, payload)
        values (${tenantA}::uuid, 'tenant.modules.changed', '{}'::jsonb)
        returning type
      `);
    });
    expect((ev.rows[0] as { type: string }).type).toBe('tenant.modules.changed');
  });

  it('eier med tenant-GUC kan INSERT shop_orders + shop_order_lines', async () => {
    const ordre = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into shop_orders (tenant_id, total_minor, currency)
        values (${tenantA}::uuid, 10000, 'nok')
        returning id
      `);
    });
    const orderId = (ordre.rows[0] as { id: string }).id;
    const linje = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into shop_order_lines (
          tenant_id, order_id, part_id, sku, name, quantity, unit_price_minor
        )
        values (
          ${tenantA}::uuid, ${orderId}::uuid, ${partId}::uuid,
          'P1-DEL', 'P1 del', 1, 10000
        )
        returning quantity
      `);
    });
    expect((linje.rows[0] as { quantity: number }).quantity).toBe(1);
  });

  it('eier med tenant-GUC kan INSERT feature_flag_overrides', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
      return tx.execute(sql`
        insert into feature_flag_overrides (flag_key, tenant_id, enabled)
        values ('ai-support', ${tenantA}::uuid, true)
        returning enabled
      `);
    });
    expect((res.rows[0] as { enabled: boolean }).enabled).toBe(true);
  });

  it('uten tenant-GUC avvises dealer_profiles INSERT', async () => {
    await expect(
      somEier(async (tx) =>
        tx.execute(sql`
          insert into dealer_profiles (tenant_id, city)
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
          insert into widget_keys (tenant_id, publishable_key)
          values (${tenantA}::uuid, 'pk_live_tom')
        `);
      }),
    ).rejects.toThrow(/row-level security|42501|violates/i);
  });

  it('tenant-GUC kan ikke skrive den andre tenanten', async () => {
    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
        return tx.execute(sql`
          insert into billing_customers (tenant_id, status)
          values (${tenantB}::uuid, 'active')
        `);
      }),
    ).rejects.toThrow(/row-level security|42501|violates/i);
  });

  it('platform_admin alene (uten tenant-guc) gir ikke INSERT', async () => {
    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
        return tx.execute(sql`
          insert into tenant_modules (tenant_id, module_key)
          values (${tenantA}::uuid, 'shop')
        `);
      }),
    ).rejects.toThrow(/row-level security|42501|violates/i);
  });

  it('eier-UPDATE kan ikke flytte dealer_profiles.tenant_id', async () => {
    await expect(
      somEier(async (tx) => {
        await tx.execute(sql`select set_config('app.tenant_id', ${tenantA}, true)`);
        return tx.execute(sql`
          update dealer_profiles
             set tenant_id = ${tenantB}::uuid
           where tenant_id = ${tenantA}::uuid
        `);
      }),
    ).rejects.toThrow(/ikke endre tenant_id eller created_at|42501/i);
  });

  it('uten tenant-GUC avvises mechanics UPDATE (0 rader)', async () => {
    const res = await somEier(async (tx) =>
      tx.execute(sql`
        update mechanics
           set capacity = 9
         where id = ${mechanicId}::uuid
        returning id
      `),
    );
    expect(res.rows).toHaveLength(0);
  });
});
