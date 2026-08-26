import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * F2-06 / F5-55 — opprett kunde i Endwise uten Quick.
 * Hypotesen var at create var gated på Quick-config. Den er det ikke: ruta
 * har eksistert, men uten test og med tomtilstand som pekte på booking/Quick.
 * Denne fila låser at en forhandler uten Quick-rad kan opprette en lokal
 * kunde (`source = endwise`, ingen `quickGuid`, ingen push).
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('F5-55 — opprett kunde uten Quick', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();

  const ctx = (
    tenantId: string,
    role: 'dealer_admin' | 'dealer_staff',
    userId = `bruker-${role}-${tenantId.slice(0, 8)}`,
  ) => ({
    db: app,
    events: { publish: async () => {} } as never,
    tenantId,
    userId,
    role,
  });

  const leder = () => appRouter.createCaller(ctx(tenantA, 'dealer_admin') as never);
  const ansatt = () => appRouter.createCaller(ctx(tenantA, 'dealer_staff') as never);
  const nabo = () => appRouter.createCaller(ctx(tenantB, 'dealer_admin') as never);

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'Uten Quick', slug: `uq-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'Naboen', slug: `nb-${tenantB.slice(0, 8)}` },
    ]);
  });

  afterAll(async () => {
    await owner.delete(schema.customers).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.tenants).where(sql`id in (${tenantA}, ${tenantB})`);
  });

  it('leder kan opprette lokal kunde uten Quick-config', async () => {
    const kunde = await leder().customers.create({
      name: 'Kari Nordmann',
      phone: '+4790000001',
      email: 'kari@kunde.test',
    });
    expect(kunde.name).toBe('Kari Nordmann');
    expect(kunde.source).toBe('endwise');
    expect(kunde.quickGuid).toBeNull();
    expect(kunde.tenantId).toBe(tenantA);
  });

  it('ansatt kan også opprette — kunderegisteret er kjerne, ikke Quick-tillegg', async () => {
    const kunde = await ansatt().customers.create({ name: 'Ola Hansen' });
    expect(kunde.source).toBe('endwise');
    expect(kunde.email).toBeNull();
  });

  it('lista med kilde=endwise finner den lokale kunden', async () => {
    const liste = await leder().customers.list({ kilde: 'endwise', sorter: 'navn' });
    expect(liste.some((k) => k.name === 'Kari Nordmann' && k.source === 'endwise')).toBe(true);
  });

  it('ingen Quick-config-rad finnes for tenanten — create krevde den ikke', async () => {
    const [cfg] = await owner
      .select({ provider: schema.integrationConfig.provider })
      .from(schema.integrationConfig)
      .where(eq(schema.integrationConfig.tenantId, tenantA));
    expect(cfg).toBeUndefined();
  });

  it('⛔ naboen ser ikke kunden', async () => {
    const liste = await nabo().customers.list({ kilde: 'alle' });
    expect(liste.some((k) => k.name === 'Kari Nordmann')).toBe(false);
  });
});
