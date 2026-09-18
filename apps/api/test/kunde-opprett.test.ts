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
    await owner.delete(schema.vehicles).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
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

  it('leder kan oppdatere telefon og få endringsnotat', async () => {
    const kunde = await leder().customers.create({ name: 'Endre Meg', phone: '+4790000010' });
    const oppdatert = await leder().customers.update({
      id: kunde.id,
      phone: '+4790000011',
    });
    expect(oppdatert.phone).toBe('+4790000011');
    const kort = await leder().customers.byId({ id: kunde.id });
    expect(
      kort?.notater.some((n) => n.body.includes('[ENDRING]') && n.body.includes('Telefon')),
    ).toBe(true);
  });

  it('⛔ naboen ser ikke kunden', async () => {
    const liste = await nabo().customers.list({ kilde: 'alle' });
    expect(liste.some((k) => k.name === 'Kari Nordmann')).toBe(false);
  });

  it('søk treffer reg.nr, pager teller, slett+angre', async () => {
    const kunde = await leder().customers.create({
      name: 'Regnr Eier',
      phone: '+4790000099',
    });
    await leder().vehicles.create({
      type: 'mc',
      regNumber: 'EL42424',
      customerId: kunde.id,
    });
    const viaReg = await leder().customers.list({ sok: 'EL42424', sorter: 'navn' });
    expect(viaReg.some((k) => k.id === kunde.id)).toBe(true);
    const antall = await leder().customers.antall({ sok: 'Regnr Eier' });
    expect(antall).toBeGreaterThanOrEqual(1);
    const side = await leder().customers.list({
      sok: 'Regnr Eier',
      sorter: 'navn',
      limit: 1,
      offset: 0,
    });
    expect(side.length).toBe(1);
    const slettet = await leder().customers.remove({ id: kunde.id });
    expect(slettet.id).toBe(kunde.id);
    expect(await leder().customers.byId({ id: kunde.id })).toBeNull();
    const tilbake = await leder().customers.restore({
      id: kunde.id,
      name: 'Regnr Eier',
      phone: '+4790000099',
    });
    expect(tilbake.id).toBe(kunde.id);
    expect((await leder().customers.byId({ id: kunde.id }))?.name).toBe('Regnr Eier');
  });
});
