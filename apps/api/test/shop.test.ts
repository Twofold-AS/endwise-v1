import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, type Database, eq, schema, sql } from '@endwise/db';
import { addonKatalog, kjopbareTillegg } from '@endwise/modules';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { tilgjengeligFra } from '../src/lib/shop.ts';
import { appRouter } from '../src/trpc/router.ts';

const her = dirname(fileURLToPath(import.meta.url));

vi.mock('../src/lib/stripe.ts', () => {
  let stripeSessionNr = 0;
  return {
    stripeConfigured: () => true,
    getStripe: () => ({
      checkout: {
        sessions: {
          create: vi.fn(async () => {
            const id = `cs_test_shop_${++stripeSessionNr}`;
            return { id, url: `https://checkout.stripe.com/c/pay/${id}` };
          }),
        },
      },
    }),
  };
});

async function forventer(
  kall: Promise<unknown>,
  code: 'FORBIDDEN' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'BAD_REQUEST' | 'PRECONDITION_FAILED',
) {
  await expect(kall).rejects.toMatchObject({ code });
}

const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL ?? OWNER_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

describe('F10-03 — shop er ikke til salgs', () => {
  it('mangler i addonKatalog og kjopbareTillegg', () => {
    expect(addonKatalog().some((k) => k.key === 'shop')).toBe(false);
    expect(kjopbareTillegg().some((t) => t.key === 'shop')).toBe(false);
  });

  it('tilgjengelig er aldri negativ', () => {
    expect(tilgjengeligFra(8, 2)).toBe(6);
    expect(tilgjengeligFra(2, 5)).toBe(0);
    expect(tilgjengeligFra(0, 0)).toBe(0);
  });

  it('gaten er shopProcedure (flagg), ikke moduleProcedure(shop)', () => {
    const utenKommentar = (rel: string) =>
      readFileSync(resolve(her, rel), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '');
    const init = utenKommentar('../src/trpc/init.ts');
    const router = utenKommentar('../src/trpc/routers/shop.ts');
    expect(init).toMatch(/export const shopProcedure/);
    expect(init).toMatch(/resolveShopFlag/);
    expect(init).not.toMatch(/moduleProcedure\('shop'\)/);
    expect(router).toMatch(/shopProcedure/);
    expect(router).not.toMatch(/moduleProcedure\('shop'\)/);
    expect(router).toMatch(/bookingWidget: shopProcedure/);
    expect(router).not.toMatch(/moduleProcedure\('widget'\)/);
    expect(router).not.toMatch(/quick\.(push|write)/);
  });
});

describeDb('F10-03 — intern testbutikk', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  let delA = '';
  let lokA = '';

  const ctx = (role: 'endwise_admin' | 'dealer_admin' | 'dealer_staff', tenantId: string) => ({
    db: app,
    events: { publish: async () => {} } as never,
    tenantId,
    userId: `shop-${role}-${tenantId.slice(0, 8)}`,
    role,
  });

  const somForhandlerI = (tenantId: string) =>
    appRouter.createCaller(ctx('dealer_admin', tenantId) as never);

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'Butikk-A', slug: `sha-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'Butikk-B', slug: `shb-${tenantB.slice(0, 8)}` },
    ]);
    await owner
      .insert(schema.featureFlags)
      .values({
        key: 'shop',
        description: 'Intern testbutikk',
        enabled: false,
      })
      .onConflictDoUpdate({
        target: schema.featureFlags.key,
        set: { enabled: false, description: 'Intern testbutikk' },
      });

    const [lok] = await owner
      .insert(schema.stockLocations)
      .values({ tenantId: tenantA, code: 'S-01', name: 'Hylle S' })
      .returning();
    lokA = lok.id;
    const [del] = await owner
      .insert(schema.parts)
      .values({
        tenantId: tenantA,
        sku: 'SHP-1001',
        name: 'Testfilter',
        category: 'Filter',
        costMinor: 10000,
        sellPriceMinor: 19900,
        active: true,
        source: 'endwise',
      })
      .returning();
    delA = del.id;
    await owner.insert(schema.stockLevels).values({
      tenantId: tenantA,
      partId: delA,
      locationId: lokA,
      onHand: 8,
      reserved: 2,
    });
  });

  afterAll(async () => {
    await owner.delete(schema.shopOrderLines).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.shopOrders).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.stockMovements).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.stockLevels).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.parts).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.stockLocations).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.widgetKeys).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner
      .delete(schema.featureFlagOverrides)
      .where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.tenants).where(sql`id in (${tenantA}, ${tenantB})`);
  });

  it('flagg av: dealer_admin får FORBIDDEN på katalog', async () => {
    await forventer(somForhandlerI(tenantA).shop.catalog(), 'FORBIDDEN');
  });

  it('flagg av: dealer_admin får FORBIDDEN på checkout', async () => {
    await forventer(
      somForhandlerI(tenantA).shop.createCheckout({
        linjer: [{ partId: delA, quantity: 1 }],
        returnUrl: 'https://endwise.test/butikk',
      }),
      'FORBIDDEN',
    );
  });

  it('flagg av: dealer_admin får FORBIDDEN på bookingWidget', async () => {
    await forventer(
      somForhandlerI(tenantA).shop.bookingWidget({ origin: 'https://endwise.test' }),
      'FORBIDDEN',
    );
  });

  it('Stripe-abonnement nekter fortsatt shop som tillegg', async () => {
    await forventer(
      somForhandlerI(tenantA).billing.checkout({
        planKey: 'start',
        tillegg: ['shop'],
        returnUrl: 'https://endwise.test/abonnement',
      }),
      'BAD_REQUEST',
    );
  });

  it('flagg på: katalog leser lager med tilgjengelig = onHand − reserved', async () => {
    await owner.insert(schema.featureFlagOverrides).values({
      flagKey: 'shop',
      tenantId: tenantA,
      enabled: true,
    });

    const katalog = await somForhandlerI(tenantA).shop.catalog();
    expect(katalog).toHaveLength(1);
    expect(katalog[0]?.sku).toBe('SHP-1001');
    expect(katalog[0]?.sellPriceMinor).toBe(19900);
    expect(katalog[0]?.onHand).toBe(8);
    expect(katalog[0]?.reserved).toBe(2);
    expect(katalog[0]?.tilgjengelig).toBe(6);
    expect(katalog[0]).not.toHaveProperty('costMinor');
  });

  it('flagg på for A gir ikke katalog hos B', async () => {
    await forventer(somForhandlerI(tenantB).shop.catalog(), 'FORBIDDEN');
  });

  it('flagg av: bookingWidget er FORBIDDEN', async () => {
    await forventer(
      somForhandlerI(tenantB).shop.bookingWidget({ origin: 'https://endwise.test' }),
      'FORBIDDEN',
    );
  });

  it('flagg på: bookingWidget utsteder testnøkkel uten widget-modul', async () => {
    const ut = await somForhandlerI(tenantA).shop.bookingWidget({
      origin: 'https://endwise.test',
    });
    expect(ut.publishableKey).toMatch(/^pk_live_/);
    expect(ut.apiBase).toBe('');

    const igjen = await somForhandlerI(tenantA).shop.bookingWidget({
      origin: 'https://preview.endwise.test',
    });
    expect(igjen.publishableKey).toBe(ut.publishableKey);

    const [rad] = await owner
      .select()
      .from(schema.widgetKeys)
      .where(eq(schema.widgetKeys.tenantId, tenantA));
    expect(rad?.label).toBe('Butikk-testplassering');
    expect(rad?.allowedOrigins).toEqual(['https://endwise.test', 'https://preview.endwise.test']);
  });

  it('bookingWidget rører ikke Framer-nøkkel med annen etikett', async () => {
    await owner.insert(schema.widgetKeys).values({
      tenantId: tenantA,
      publishableKey: `pk_live_framer_${tenantA.replace(/-/g, '').slice(0, 20)}`,
      allowedOrigins: ['https://verksted.no'],
      label: 'Hovednettside',
    });
    const ut = await somForhandlerI(tenantA).shop.bookingWidget({
      origin: 'https://endwise.test',
    });
    expect(ut.publishableKey).not.toMatch(/^pk_live_framer_/);

    const [framer] = await owner
      .select()
      .from(schema.widgetKeys)
      .where(eq(schema.widgetKeys.label, 'Hovednettside'));
    expect(framer?.allowedOrigins).toEqual(['https://verksted.no']);
  });

  it('flagg på for A gir ikke bookingWidget hos B', async () => {
    await forventer(
      somForhandlerI(tenantB).shop.bookingWidget({ origin: 'https://endwise.test' }),
      'FORBIDDEN',
    );
  });

  it('flagg på: checkout oppretter Stripe-session (mock) og pending ordre', async () => {
    const ut = await somForhandlerI(tenantA).shop.createCheckout({
      linjer: [{ partId: delA, quantity: 2 }],
      returnUrl: 'https://endwise.test/butikk',
    });
    expect(ut.url).toMatch(/^https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_shop_/);
    expect(ut.orderId).toMatch(/^[0-9a-f-]{36}$/);

    const [ordre] = await owner
      .select()
      .from(schema.shopOrders)
      .where(eq(schema.shopOrders.id, ut.orderId));
    expect(ordre?.status).toBe('pending');
    expect(ordre?.totalMinor).toBe(39800);
    expect(ordre?.stripeCheckoutSessionId).toMatch(/^cs_test_shop_/);
    expect(ordre?.tenantId).toBe(tenantA);
  });
});
