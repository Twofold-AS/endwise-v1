import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * F1-07 / F5-26 — PLATTFORM-CENSUS for Endwise-admin.
 *
 * Live tellinger (tenants, brukere, medlemskap) og read-only entitlements
 * (`tenant_modules`). Sperren er `endwiseAdminProcedure`, ikke at knappen
 * ligger under /endwise. En `dealer_admin` skal få FORBIDDEN — også på lesing.
 *
 * Skrivesti for entitlements er `tenants.setModules` (endwise_admin) og
 * Stripe-webhooken (F5-32). dealer_admin får FORBIDDEN.
 */
async function forventer(
  kall: Promise<unknown>,
  code: 'FORBIDDEN' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'BAD_REQUEST',
) {
  await expect(kall).rejects.toMatchObject({ code });
}

const fakeCtx = (role: 'endwise_admin' | 'dealer_admin' | 'dealer_staff') =>
  ({
    db: {} as never,
    events: { publish: async () => {} } as never,
    tenantId: '00000000-0000-0000-0000-000000000001',
    userId: `cen-fake-${role}`,
    role,
  }) as never;

/** Rollen sjekkes FØR spørringen — disse trenger ikke Postgres. */
describe('F1-07 — census rolle-sperre', () => {
  it('⛔ ANGREP: dealer_admin kan ikke census', async () => {
    await forventer(appRouter.createCaller(fakeCtx('dealer_admin')).tenants.census(), 'FORBIDDEN');
  });

  it('⛔ ANGREP: dealer_staff kan ikke census', async () => {
    await forventer(appRouter.createCaller(fakeCtx('dealer_staff')).tenants.census(), 'FORBIDDEN');
  });

  it('⛔ ANGREP: dealer_admin kan ikke listModules', async () => {
    await forventer(
      appRouter.createCaller(fakeCtx('dealer_admin')).tenants.listModules(),
      'FORBIDDEN',
    );
  });

  it('⛔ ANGREP: dealer_staff kan ikke listModules', async () => {
    await forventer(
      appRouter.createCaller(fakeCtx('dealer_staff')).tenants.listModules(),
      'FORBIDDEN',
    );
  });

  it('setModules finnes, men dealer_admin får FORBIDDEN', async () => {
    const tenants = appRouter.createCaller(fakeCtx('endwise_admin')).tenants;
    expect(typeof tenants.setModules).toBe('function');
    await forventer(
      appRouter.createCaller(fakeCtx('dealer_admin')).tenants.setModules({
        tenantId: '00000000-0000-0000-0000-000000000001',
        modules: ['quick'],
      }),
      'FORBIDDEN',
    );
  });
});

const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('F1-07 — Endwise-admin census (Postgres)', () => {
  let owner: Database;
  let app: Database;
  const tenantLive = randomUUID();
  const tenantDemo = randomUUID();
  const brukerA = `cen-a-${tenantLive.slice(0, 8)}`;
  const brukerB = `cen-b-${tenantDemo.slice(0, 8)}`;
  const medlemA = randomUUID();
  const medlemB = randomUUID();

  const ctx = (
    role: 'endwise_admin' | 'dealer_admin' | 'dealer_staff',
    tenantId: string,
    userId = `cen-${role}-${tenantId.slice(0, 8)}`,
  ) => ({
    db: app,
    events: { publish: async () => {} } as never,
    tenantId,
    userId,
    role,
  });

  const somEndwise = () => appRouter.createCaller(ctx('endwise_admin', tenantLive) as never);

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner.insert(schema.tenants).values([
      {
        id: tenantLive,
        name: 'Census-Live',
        slug: `cen-l-${tenantLive.slice(0, 8)}`,
        kind: 'live',
      },
      {
        id: tenantDemo,
        name: 'Census-Demo',
        slug: `cen-d-${tenantDemo.slice(0, 8)}`,
        kind: 'demo',
      },
    ]);
    await owner.insert(schema.organization).values([
      {
        id: tenantLive,
        name: 'Census-Live',
        slug: `cen-org-l-${tenantLive.slice(0, 8)}`,
        createdAt: new Date(),
      },
      {
        id: tenantDemo,
        name: 'Census-Demo',
        slug: `cen-org-d-${tenantDemo.slice(0, 8)}`,
        createdAt: new Date(),
      },
    ]);
    await owner.insert(schema.user).values([
      { id: brukerA, name: 'Census A', email: `${brukerA}@test.invalid`, emailVerified: true },
      { id: brukerB, name: 'Census B', email: `${brukerB}@test.invalid`, emailVerified: true },
    ]);
    await owner.insert(schema.member).values([
      {
        id: medlemA,
        organizationId: tenantLive,
        userId: brukerA,
        role: 'dealer_admin',
        createdAt: new Date(),
      },
      {
        id: medlemB,
        organizationId: tenantDemo,
        userId: brukerB,
        role: 'dealer_staff',
        createdAt: new Date(),
      },
    ]);
    await owner.insert(schema.tenantModules).values([
      { tenantId: tenantLive, moduleKey: 'ai-support', enabled: true, plan: 'pro' },
      { tenantId: tenantLive, moduleKey: 'vegvesen', enabled: false, plan: 'pro' },
    ]);
  });

  afterAll(async () => {
    await owner.delete(schema.auditLog).where(sql`tenant_id in (${tenantLive}, ${tenantDemo})`);
    await owner
      .delete(schema.featureFlags)
      .where(eq(schema.featureFlags.key, `census-${tenantLive.slice(0, 8)}`));
    await owner
      .delete(schema.tenantModules)
      .where(sql`tenant_id in (${tenantLive}, ${tenantDemo})`);
    await owner.delete(schema.member).where(sql`id in (${medlemA}, ${medlemB})`);
    await owner.delete(schema.user).where(sql`id in (${brukerA}, ${brukerB})`);
    await owner.delete(schema.organization).where(sql`id in (${tenantLive}, ${tenantDemo})`);
    await owner.delete(schema.tenants).where(sql`id in (${tenantLive}, ${tenantDemo})`);
  });

  /* ══ Live tellinger ════════════════════════════════════════════════════ */

  it('endwise_admin får live tellinger som matcher Postgres', async () => {
    const census = await somEndwise().tenants.census();

    const [tenants] = await owner
      .select({
        totalt: sql<number>`count(*)::int`,
        live: sql<number>`count(*) filter (where ${schema.tenants.kind} = 'live')::int`,
        demo: sql<number>`count(*) filter (where ${schema.tenants.kind} = 'demo')::int`,
      })
      .from(schema.tenants);
    const [brukere] = await owner.select({ n: sql<number>`count(*)::int` }).from(schema.user);
    const [medlemskap] = await owner.select({ n: sql<number>`count(*)::int` }).from(schema.member);

    expect(census.forhandlere).toBe(tenants?.totalt ?? 0);
    expect(census.forhandlereLive).toBe(tenants?.live ?? 0);
    expect(census.forhandlereDemo).toBe(tenants?.demo ?? 0);
    expect(census.brukere).toBe(brukere?.n ?? 0);
    expect(census.medlemskap).toBe(medlemskap?.n ?? 0);
    expect(census.forhandlere).toBeGreaterThanOrEqual(2);
    expect(census.brukere).toBeGreaterThanOrEqual(2);
    expect(census.medlemskap).toBeGreaterThanOrEqual(2);
    expect(census).not.toHaveProperty('mrr');
    expect(census).not.toHaveProperty('stripe');
  });

  it('endwise_admin kan lese tenant → enabled modules (read-only)', async () => {
    const rader = await somEndwise().tenants.listModules();
    const live = rader.find((r) => r.id === tenantLive);
    const demo = rader.find((r) => r.id === tenantDemo);

    expect(live?.name).toBe('Census-Live');
    expect(live?.modules).toEqual(
      expect.arrayContaining([{ moduleKey: 'ai-support', enabled: true, plan: 'pro' }]),
    );
    expect(live?.modules.some((m) => m.moduleKey === 'vegvesen' && m.enabled === false)).toBe(true);
    expect(demo?.modules).toEqual([]);
  });

  it('flags.setGlobal endrer ikke tenant_modules', async () => {
    const [forste] = await owner
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.tenantModules)
      .where(eq(schema.tenantModules.tenantId, tenantLive));

    const flagg = `census-${tenantLive.slice(0, 8)}`;
    await somEndwise().flags.setGlobal({ key: flagg, enabled: true });

    const [etter] = await owner
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.tenantModules)
      .where(eq(schema.tenantModules.tenantId, tenantLive));
    const rader = await owner
      .select()
      .from(schema.tenantModules)
      .where(eq(schema.tenantModules.tenantId, tenantLive));

    expect(etter?.n).toBe(forste?.n);
    expect(rader.some((r) => r.moduleKey === flagg)).toBe(false);
    await owner.delete(schema.featureFlags).where(eq(schema.featureFlags.key, flagg));
  });
});
