import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database, withTenant } from '../src/client.ts';
import { schema } from '../src/index.ts';

/**
 * Angrepstest for den offentlige widget-flaten (DB-laget).
 * Widget-nøkkelen scoper til ÉN tenant. Beviser at RLS holder: forhandler A ser
 * eller endrer aldri B sine widget-nøkler, og en kunde bundet til A kan aldri nå
 * B sine kunder/tjenester/bookinger. Angrep kjøres som `endwise_app`.
 * Krever Docker-Postgres + `pnpm db:setup`. Skippes uten begge env-URL-ene.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('widget: cross-tenant-isolasjon', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'A', slug: `a-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'B', slug: `b-${tenantB.slice(0, 8)}` },
    ]);
    await owner.insert(schema.widgetKeys).values({
      tenantId: tenantB,
      publishableKey: `pk_live_${tenantB.replace(/-/g, '')}`,
      allowedOrigins: ['https://b-verksted.no'],
    });
    await owner.insert(schema.customers).values({ tenantId: tenantB, name: 'Kunde hos B' });
  });

  afterAll(async () => {
    await owner.delete(schema.widgetKeys).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.customers).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.tenants).where(sql`id in (${tenantA}, ${tenantB})`);
  });

  it('ANGREP: A ser ikke B sine widget-nøkler', async () => {
    const rows = await withTenant(app, tenantA, (tx) => tx.select().from(schema.widgetKeys));
    expect(rows).toHaveLength(0);
  });

  it('ANGREP: A kan ikke plante en nøkkel i B (WITH CHECK)', async () => {
    await expect(
      withTenant(app, tenantA, (tx) =>
        tx
          .insert(schema.widgetKeys)
          .values({ tenantId: tenantB, publishableKey: 'pk_live_ondsinnet' }),
      ),
    ).rejects.toThrow();
  });

  it('ANGREP: en kunde bundet til A ser ikke B sine kunder', async () => {
    // Widget-tokenet setter tenant = A; RLS filtrerer alt til A.
    const rows = await withTenant(app, tenantA, (tx) => tx.select().from(schema.customers));
    expect(rows).toHaveLength(0);
  });

  it('A kan lese/skrive SIN EGEN widget-nøkkel', async () => {
    await withTenant(app, tenantA, (tx) =>
      tx.insert(schema.widgetKeys).values({
        tenantId: tenantA,
        publishableKey: `pk_live_${tenantA.replace(/-/g, '')}`,
        allowedOrigins: ['https://a-verksted.no'],
      }),
    );
    const rows = await withTenant(app, tenantA, (tx) => tx.select().from(schema.widgetKeys));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.allowedOrigins).toEqual(['https://a-verksted.no']);
  });
});
