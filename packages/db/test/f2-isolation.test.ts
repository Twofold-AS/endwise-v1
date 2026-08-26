import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database, withTenant } from '../src/client.ts';
import { schema } from '../src/index.ts';

/**
 * F1-08 utvidet til F2-tabellene.
 * Hver ny tabell med `tenant_id` skal ha RLS. Denne suiten er kontrollen på at
 * ingen slipper unna: legger noen til en tabell uten `tenantPolicy`, feiler den.
 * Angrepene kjøres som `endwise_app` — for tabelleieren er RLS usynlig.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('F2-tabeller: cross-tenant-isolasjon', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const customerB = randomUUID();
  const vehicleB = randomUUID();

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'A', slug: `a-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'B', slug: `b-${tenantB.slice(0, 8)}` },
    ]);
    await owner
      .insert(schema.customers)
      .values({ id: customerB, tenantId: tenantB, name: 'Kunde hos B' });
    await owner
      .insert(schema.vehicles)
      .values({ id: vehicleB, tenantId: tenantB, type: 'mc', regNumber: 'XX12345' });
  });

  afterAll(async () => {
    await owner.delete(schema.vehicles).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.customers).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.tenants).where(sql`id in (${tenantA}, ${tenantB})`);
  });

  it('ANGREP: A ser ikke B sine kunder', async () => {
    const rows = await withTenant(app, tenantA, (tx) => tx.select().from(schema.customers));
    expect(rows).toHaveLength(0);
  });

  it('ANGREP: A ser ikke B sine kjøretøy — heller ikke med kjent regnr', async () => {
    const rows = await withTenant(app, tenantA, (tx) =>
      tx.select().from(schema.vehicles).where(sql`reg_number = 'XX12345'`),
    );
    expect(rows).toHaveLength(0);
  });

  it('ANGREP: A kan ikke knytte et kjøretøy til B sin kunde', async () => {
    const updated = await withTenant(app, tenantA, (tx) =>
      tx.execute(sql`update vehicles set customer_id = ${customerB} where id = ${vehicleB}`),
    );
    expect(updated.rowCount).toBe(0);
  });

  it('ANGREP: A kan ikke opprette en tjeneste i B', async () => {
    await expect(
      withTenant(app, tenantA, (tx) =>
        tx
          .insert(schema.services)
          .values({ tenantId: tenantB, name: 'Stjålet tjeneste', vehicleType: 'mc' }),
      ),
    ).rejects.toThrow();
  });

  it('A ser sine egne kunder når de finnes', async () => {
    const created = await withTenant(app, tenantA, (tx) =>
      tx.insert(schema.customers).values({ tenantId: tenantA, name: 'Kunde hos A' }).returning(),
    );
    expect(created).toHaveLength(1);

    const rows = await withTenant(app, tenantA, (tx) => tx.select().from(schema.customers));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Kunde hos A');
  });
});
