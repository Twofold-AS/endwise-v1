import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database, withTenant } from '../src/client.ts';
import { schema } from '../src/index.ts';

/**
 * Tenant-isolasjon på lager. Hver test her er et angrep.
 * Samme oppsett som `tenant-isolation.test.ts`: to forbindelser, og det er
 * hele poenget. `owner` seeder på tvers; **alle angrep kjøres fra `app`**
 * (`endwise_app`), rollen applikasjonen faktisk bruker. Kjørte vi angrepene
 * som eier, ville alt «bestått» fordi RLS var usynlig.
 * Lager er kjerne — alle forhandlere har det. Det gjør isolasjonen viktigere,
 * ikke mindre viktig: her ligger delenumre, beholdning og innkjøpspriser for
 * hvert eneste verksted i systemet.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('lager-isolasjon (RLS)', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  let delA = '';
  let delB = '';
  let lokA = '';

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'Lager A', slug: `la-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'Lager B', slug: `lb-${tenantB.slice(0, 8)}` },
    ]);

    const [la] = await owner
      .insert(schema.stockLocations)
      .values({ tenantId: tenantA, code: 'A-01', name: 'Hylle A' })
      .returning();
    lokA = la.id;
    const [lb] = await owner
      .insert(schema.stockLocations)
      .values({ tenantId: tenantB, code: 'B-01', name: 'Hylle B' })
      .returning();

    // Samme sku i begge tenants — det er selve idor-scenarioet (CWE-639).
    // Delenummer er gjettbart med vilje; unik-indeksen er (tenant_id, sku).
    const [pa] = await owner
      .insert(schema.parts)
      .values({ tenantId: tenantA, sku: 'BRK-1042', name: 'Bremseklosser A', costMinor: 48000 })
      .returning();
    delA = pa.id;
    const [pb] = await owner
      .insert(schema.parts)
      .values({ tenantId: tenantB, sku: 'BRK-1042', name: 'Bremseklosser B', costMinor: 99900 })
      .returning();
    delB = pb.id;

    await owner.insert(schema.stockLevels).values([
      { tenantId: tenantA, partId: delA, locationId: lokA, onHand: 10, reserved: 2 },
      { tenantId: tenantB, partId: delB, locationId: lb.id, onHand: 99, reserved: 0 },
    ]);
    await owner.insert(schema.stockMovements).values([
      { tenantId: tenantA, partId: delA, locationId: lokA, kind: 'in', quantity: 10 },
      { tenantId: tenantB, partId: delB, locationId: lb.id, kind: 'in', quantity: 99 },
    ]);
  });

  afterAll(async () => {
    for (const t of [tenantA, tenantB]) {
      await owner.delete(schema.stockMovements).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.stockLevels).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.parts).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.stockLocations).where(sql`tenant_id = ${t}`);
    }
    await owner.delete(schema.tenants).where(sql`id in (${tenantA}, ${tenantB})`);
  });

  it('ser kun egne deler i egen tenant-kontekst', async () => {
    const rader = await withTenant(app, tenantA, (tx) => tx.select().from(schema.parts));
    expect(rader.length).toBe(1);
    expect(rader[0]?.name).toBe('Bremseklosser A');
  });

  it('ANGREP: samme SKU i to tenants lekker ikke (CWE-639/IDOR)', async () => {
    const rader = await withTenant(app, tenantA, (tx) =>
      tx.select().from(schema.parts).where(sql`sku = 'BRK-1042'`),
    );
    expect(rader.length).toBe(1);
    expect(rader[0]?.id).toBe(delA);
    // Innkjøpsprisen til B er en forretningshemmelighet og skal ikke være synlig.
    expect(rader.some((r) => r.costMinor === 99900)).toBe(false);
  });

  it('ANGREP: kan ikke lese en annen tenants del med eksplisitt id', async () => {
    const rader = await withTenant(app, tenantA, (tx) =>
      tx.select().from(schema.parts).where(sql`id = ${delB}`),
    );
    expect(rader).toEqual([]);
  });

  it('ANGREP: kan ikke lese en annen tenants beholdning', async () => {
    const rader = await withTenant(app, tenantA, (tx) => tx.select().from(schema.stockLevels));
    expect(rader.length).toBe(1);
    expect(rader.some((r) => r.onHand === 99)).toBe(false);
  });

  it('ANGREP: kan ikke lese en annen tenants bevegelser', async () => {
    const rader = await withTenant(app, tenantA, (tx) => tx.select().from(schema.stockMovements));
    expect(rader.length).toBe(1);
    expect(rader[0]?.quantity).toBe(10);
  });

  it('ANGREP: kan ikke SKRIVE en del inn i en annen tenant', async () => {
    await expect(
      withTenant(app, tenantA, (tx) =>
        tx
          .insert(schema.parts)
          .values({ tenantId: tenantB, sku: `X-${randomUUID().slice(0, 6)}`, name: 'Smuglet' }),
      ),
    ).rejects.toThrow();
  });

  it('ANGREP: kan ikke oppdatere en annen tenants beholdning', async () => {
    const res = await withTenant(app, tenantA, (tx) =>
      tx.update(schema.stockLevels).set({ onHand: 0 }).where(sql`tenant_id = ${tenantB}`),
    );
    expect(res.rowCount).toBe(0);

    // Og B står urørt.
    const [b] = await withTenant(app, tenantB, (tx) => tx.select().from(schema.stockLevels));
    expect(b?.onHand).toBe(99);
  });

  it('uten tenant-kontekst er lageret usynlig', async () => {
    const rader = await app.select().from(schema.parts);
    expect(rader).toEqual([]);
  });
});
