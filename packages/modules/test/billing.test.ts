import { randomUUID } from 'node:crypto';
import { createDb, type Database, schema, sql, withTenant } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createBillingService, NotEntitledError } from '../src/billing/index.ts';

/**
 * F5-09 — Abonnement/entitlements: cross-tenant-angrep + entitlement-gate.
 *
 * Kjøres som `endwise_app` (APP_DATABASE_URL) der RLS gjelder. Skippes uten DB
 * (samme mønster som de andre isolasjonstestene) — kjør mot Docker lokalt.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('F5-09: abonnement — isolasjon + entitlement-gate', () => {
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
    // B har et abonnement + en modul.
    await owner
      .insert(schema.billingCustomers)
      .values({ tenantId: tenantB, planKey: 'proff', status: 'active' });
    await owner
      .insert(schema.tenantModules)
      .values({ tenantId: tenantB, moduleKey: 'ai-providers', enabled: true, plan: 'proff' });
  });

  afterAll(async () => {
    await owner.delete(schema.tenantModules).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.billingCustomers).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.tenants).where(sql`id in (${tenantA}, ${tenantB})`);
  });

  it('ANGREP: A ser ikke B sitt abonnement', async () => {
    const state = await createBillingService(app).getState(tenantA);
    expect(state.planKey).toBeNull();
    expect(state.modules).toHaveLength(0);
  });

  it('ANGREP: A kan ikke skru på B sin modul (ikke entitled hos A)', async () => {
    await expect(
      createBillingService(app).setModuleEnabled(tenantA, 'ai-providers', true),
    ).rejects.toBeInstanceOf(NotEntitledError);
    // B er uendret.
    const rows = await withTenant(app, tenantB, (tx) =>
      tx.select().from(schema.tenantModules).where(sql`module_key = 'ai-providers'`),
    );
    expect(rows[0]?.enabled).toBe(true);
  });

  it('ANGREP: A kan ikke skrive en billing-rad for B (RLS WITH CHECK)', async () => {
    await expect(
      withTenant(app, tenantA, (tx) =>
        tx.insert(schema.billingCustomers).values({ tenantId: tenantB, planKey: 'proff' }),
      ),
    ).rejects.toThrow();
  });

  it('applyPlan(A) gir A sine moduler uten å røre B', async () => {
    await createBillingService(app).applyPlan(tenantA, 'basis', { status: 'active' });
    const aState = await createBillingService(app).getState(tenantA);
    expect(aState.planKey).toBe('basis');
    expect(aState.modules.map((m) => m.key).sort()).toEqual(['booking', 'messages', 'vegvesen']);
    // B har fortsatt proff + ai-providers.
    const bState = await createBillingService(app).getState(tenantB);
    expect(bState.planKey).toBe('proff');
    expect(bState.modules.some((m) => m.key === 'ai-providers')).toBe(true);
  });

  it('entitled modul kan skrus av/på av forhandleren selv', async () => {
    await createBillingService(app).setModuleEnabled(tenantA, 'vegvesen', false);
    const state = await createBillingService(app).getState(tenantA);
    expect(state.modules.find((m) => m.key === 'vegvesen')?.enabled).toBe(false);
  });
});
