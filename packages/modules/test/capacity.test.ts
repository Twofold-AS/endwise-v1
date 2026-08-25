import { randomUUID } from 'node:crypto';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { updateMechanicCapacity } from '../src/profil/capacity.ts';

/**
 * Timeplan — skriving av `mechanics.capacity`. Samme felt matching og
 * widget leser. Ingen ny tabell.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('mekaniker-kapasitet (Timeplan)', () => {
  let owner: Database;
  let app: Database;

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const mekanikerA = randomUUID();
  const mekanikerB = randomUUID();

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'Kap A', slug: `capa-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'Kap B', slug: `capb-${tenantB.slice(0, 8)}` },
    ]);
    await owner.insert(schema.mechanics).values([
      { id: mekanikerA, tenantId: tenantA, name: 'Kari', capacity: 1 },
      { id: mekanikerB, tenantId: tenantB, name: 'Bob', capacity: 1 },
    ]);
  });

  afterAll(async () => {
    for (const t of [tenantA, tenantB]) {
      await owner.delete(schema.mechanics).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.tenants).where(sql`id = ${t}`);
    }
  });

  it('leder kan sette kapasitet i egen tenant', async () => {
    const row = await updateMechanicCapacity(app, tenantA, {
      mechanicId: mekanikerA,
      capacity: 3,
    });
    expect(row.capacity).toBe(3);
  });

  it('avviser kapasitet utenfor 1–10', async () => {
    await expect(
      updateMechanicCapacity(app, tenantA, { mechanicId: mekanikerA, capacity: 0 }),
    ).rejects.toThrow(/mellom 1 og 10/);
    await expect(
      updateMechanicCapacity(app, tenantA, { mechanicId: mekanikerA, capacity: 11 }),
    ).rejects.toThrow(/mellom 1 og 10/);
  });

  it('ANGREP: A kan ikke skrive kapasitet på B sin mekaniker', async () => {
    await expect(
      updateMechanicCapacity(app, tenantA, { mechanicId: mekanikerB, capacity: 5 }),
    ).rejects.toThrow(/finnes ikke i denne tenanten/);
  });
});
