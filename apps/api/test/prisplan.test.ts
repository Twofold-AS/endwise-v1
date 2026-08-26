import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema, sql } from '@endwise/db';
import {
  ADDON_MODULES,
  BASIS_MODULES,
  erUtenforNade,
  kjopbareTillegg,
  modulesForSubscription,
  PAST_DUE_NADE_DAGER,
  subscriptionFromPriceIds,
  TIERS,
  TILLEGG,
} from '@endwise/modules';
import { createBillingService } from '@endwise/modules/billing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * Priskatalogen og provisjoneringen.
 * To slags tester her, og skillet er med vilje:
 * 1. **Rene** tester av katalogen — nivå/tillegg → modulnøkler. Krever ingen DB.
 * Det er her en feil ville vært dyrest: selger vi pro og gir pro-moduler, men
 * nøkkelen heter noe annet enn den gaten sjekker, har vi tatt betalt for en
 * låst dør.
 * 2. **Integrasjons**tester mot ekte DB: at `applySubscription` skriver riktig,
 * at nedgradering deaktiverer i stedet for å slette, og at modul-gaten fra
 * F0-16 respekterer resultatet. Katalogen og gaten må være enige.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;

describe('F5-32 — priskatalogen (ren)', () => {
  it('tre nivåer med stigende pris', () => {
    expect(TIERS.map((t) => t.key)).toEqual(['start', 'pro', 'enterprise']);
    const priser = TIERS.map((t) => t.priceMonthlyMinor);
    expect(priser).toEqual([449_000, 849_000, 1_249_000]);
    expect(priser[0]).toBeLessThan(priser[1]);
    expect(priser[1]).toBeLessThan(priser[2]);
  });

  it('nivåene er kumulative — PRO inneholder START, ENTERPRISE inneholder PRO', () => {
    const [start, pro, ent] = TIERS;
    for (const m of start.modules) expect(pro.modules).toContain(m);
    for (const m of pro.modules) expect(ent.modules).toContain(m);
    expect(pro.modules).not.toContain('twilio');
    expect(ent.modules).not.toContain('twilio');
  });

  it('⛔ HVER modulnøkkel i katalogen er en KJENT tilleggsnøkkel', () => {
    // Dette er testen som fanger skrivefeil. En nøkkel som ikke finnes i
    // ADDON_MODULES har ingen gate — vi ville solgt en dør som ikke er låst.
    const alle = [...TIERS.flatMap((t) => t.modules), ...TILLEGG.map((t) => t.module)];
    const ukjente = alle.filter((m) => !(ADDON_MODULES as readonly string[]).includes(m));
    expect(ukjente).toEqual([]);
  });

  it('⛔ ingen nivå eller tillegg selger en BASIS-funksjon', () => {
    const alle = [...TIERS.flatMap((t) => t.modules), ...TILLEGG.map((t) => t.module)];
    const basisSolgt = alle.filter((m) => (BASIS_MODULES as readonly string[]).includes(m));
    expect(basisSolgt).toEqual([]);
  });

  it('hvert tillegg har sin EGEN modulnøkkel (én pris = én modul)', () => {
    const nokler = TILLEGG.map((t) => t.module);
    expect(new Set(nokler).size).toBe(nokler.length);
  });

  it('🕓 og ⛔ kan ikke kjøpes', () => {
    const kjopbare = kjopbareTillegg().map((t) => t.key);
    expect(kjopbare).not.toContain('shop'); // blocked — Medusa ikke besluttet
    expect(kjopbare).not.toContain('rapporter'); // coming
    expect(kjopbare).not.toContain('samarbeid'); // coming
    expect(kjopbare).toContain('white-label');
    expect(kjopbare).toContain('nyhetsbrev');
    expect(kjopbare).toContain('twilio');
    expect(TILLEGG.find((t) => t.key === 'twilio')?.priceMonthlyMinor).toBe(0);
  });

  it('modulesForSubscription slår sammen nivå + tillegg uten duplikater', () => {
    const m = modulesForSubscription('pro', ['white-label', 'nyhetsbrev']);
    expect(m).toContain('ai-support'); // fra pro
    expect(m).toContain('widget'); // arvet fra start
    expect(m).toContain('white-label'); // fra tillegg
    expect(m).toContain('nyhetsbrev');
    expect(new Set(m).size).toBe(m.length);
  });

  it('ukjent nivå gir ingen moduler (fail-safe)', () => {
    expect(modulesForSubscription('gratis-alt', [])).toEqual([]);
  });

  it('webhooken finner nivå + tillegg fra FLERE price-IDer', () => {
    const env = {
      STRIPE_PRICE_PRO: 'price_pro',
      STRIPE_PRICE_ADDON_WHITE_LABEL: 'price_wl',
      STRIPE_PRICE_ADDON_SSO: 'price_sso',
    };
    const r = subscriptionFromPriceIds(['price_pro', 'price_wl'], env);
    expect(r.tier?.key).toBe('pro');
    expect(r.tillegg.map((t) => t.key)).toEqual(['white-label']);
  });

  it('14 dagers nåde er parameteren, og grensen regnes riktig', () => {
    expect(PAST_DUE_NADE_DAGER).toBe(14);
    const start = new Date('2026-08-01T00:00:00Z');
    expect(erUtenforNade(start, new Date('2026-08-10T00:00:00Z'))).toBe(false);
    expect(erUtenforNade(start, new Date('2026-08-16T00:00:00Z'))).toBe(true);
    expect(erUtenforNade(null, new Date())).toBe(false);
  });
});

/* Integrasjon mot ekte DB */

const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('F5-32 — provisjonering + gaten er enige', () => {
  let owner: Database;
  let app: Database;
  const tenantId = randomUUID();

  const ctx = () => ({
    db: app,
    events: { publish: async () => {} } as never,
    tenantId,
    userId: 'abo-bruker',
    role: 'dealer_admin' as const,
  });

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner
      .insert(schema.tenants)
      .values({ id: tenantId, name: 'Abo', slug: `abo-${tenantId.slice(0, 8)}` });
  });

  afterAll(async () => {
    await owner
      .delete(schema.billingCustomers)
      .where(eq(schema.billingCustomers.tenantId, tenantId));
    await owner.delete(schema.tenantModules).where(eq(schema.tenantModules.tenantId, tenantId));
    await owner.delete(schema.tenants).where(sql`id = ${tenantId}`);
  });

  it('START gir IKKE ai-support — gaten avviser AI-flaten', async () => {
    await createBillingService(app).applySubscription(tenantId, 'start', [], { status: 'active' });
    const caller = appRouter.createCaller(ctx() as never);
    await expect(caller.agent.list()).rejects.toThrow(/ai-support.*ikke aktiv|FORBIDDEN/i);
  });

  it('PRO gir ai-support og quick — gaten slipper gjennom', async () => {
    await createBillingService(app).applySubscription(tenantId, 'pro', [], { status: 'active' });
    const caller = appRouter.createCaller(ctx() as never);
    await expect(caller.agent.list()).resolves.toBeDefined();
    await expect(caller.quick.config()).resolves.not.toThrow();
  });

  it('NEDGRADERING pro → start deaktiverer, men SLETTER IKKE raden', async () => {
    await createBillingService(app).applySubscription(tenantId, 'start', [], { status: 'active' });

    const rader = await owner
      .select()
      .from(schema.tenantModules)
      .where(eq(schema.tenantModules.tenantId, tenantId));

    const ai = rader.find((r) => r.moduleKey === 'ai-support');
    expect(ai, 'raden skal fortsatt finnes — historikken er verdt å beholde').toBeDefined();
    expect(ai?.enabled).toBe(false);

    // Og gaten oppfører seg som om den aldri var kjøpt.
    const caller = appRouter.createCaller(ctx() as never);
    await expect(caller.agent.list()).rejects.toThrow(/ai-support.*ikke aktiv|FORBIDDEN/i);
  });

  it('OPPGRADERING igjen skrur den PÅ — ikke bare oppretter en ny rad', async () => {
    await createBillingService(app).applySubscription(tenantId, 'pro', [], { status: 'active' });
    const [ai] = await owner
      .select()
      .from(schema.tenantModules)
      .where(eq(schema.tenantModules.moduleKey, 'ai-support'));
    expect(ai?.enabled).toBe(true);
  });

  it('TILLEGG flipper sin egen modul, og bare den', async () => {
    await createBillingService(app).applySubscription(tenantId, 'start', ['white-label'], {
      status: 'active',
    });
    const rader = await owner
      .select()
      .from(schema.tenantModules)
      .where(eq(schema.tenantModules.tenantId, tenantId));
    const aktive = rader.filter((r) => r.enabled).map((r) => r.moduleKey);
    expect(aktive).toContain('white-label');
    expect(aktive).toContain('widget'); // fra start
    expect(aktive).not.toContain('sso'); // ikke kjøpt
    expect(aktive).not.toContain('ai-support'); // ikke i start
  });

  it('BASIS berøres aldri — Lager svarer uansett nivå', async () => {
    await createBillingService(app).applySubscription(tenantId, 'start', [], { status: 'active' });
    const caller = appRouter.createCaller(ctx() as never);
    await expect(caller.inventory.summary()).resolves.toBeDefined();
  });
});
