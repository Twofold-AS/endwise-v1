import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * ⚠️ Vi sjekker feil-KODEN, ikke meldingsteksten. Meldingene er norske og skal
 * kunne skrives om uten at en sikkerhetstest brekker.
 */
async function forventer(
  kall: Promise<unknown>,
  code: 'FORBIDDEN' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'BAD_REQUEST',
) {
  await expect(kall).rejects.toMatchObject({ code });
}

/**
 * F0-04 — FEATURE-FLAGS: hvem får skru, og treffer skrivingen RIKTIG tenant?
 *
 * Backend fantes. Denne testen dekker den nye Endwise-admin-flaten:
 * `listPlatform` / `setTenantOverride` / `clearTenantOverride`. Sperren er
 * ruta, ikke at knappen ligger under /endwise.
 *
 * To tenants. `endwise_admin` sitter i tenant A og skriver override på B.
 * Hvis override-raden lander på A, eller B blir usynlig for resolve i B, er
 * gaten ødelagt.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('F0-04 — feature-flags-admin', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const flagg = `canary-${tenantA.slice(0, 8)}`;

  const ctx = (
    role: 'endwise_admin' | 'dealer_admin' | 'dealer_staff',
    tenantId: string,
    userId = `ff-${role}-${tenantId.slice(0, 8)}`,
  ) => ({
    db: app,
    events: { publish: async () => {} } as never,
    tenantId,
    userId,
    role,
  });

  const somEndwiseI = (tenantId: string) =>
    appRouter.createCaller(ctx('endwise_admin', tenantId) as never);
  const somForhandlerI = (tenantId: string) =>
    appRouter.createCaller(ctx('dealer_admin', tenantId) as never);
  const somAnsattI = (tenantId: string) =>
    appRouter.createCaller(ctx('dealer_staff', tenantId) as never);

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'Flagg-A', slug: `ffa-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'Flagg-B', slug: `ffb-${tenantB.slice(0, 8)}` },
    ]);
    await owner.insert(schema.featureFlags).values({
      key: flagg,
      description: 'Test-flagg for F0-04 admin-flate',
      enabled: false,
    });
  });

  afterAll(async () => {
    await owner.delete(schema.auditLog).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner
      .delete(schema.featureFlagOverrides)
      .where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.featureFlags).where(eq(schema.featureFlags.key, flagg));
    await owner.delete(schema.tenants).where(sql`id in (${tenantA}, ${tenantB})`);
  });

  /* ══ ANGREP: feil rolle ════════════════════════════════════════════════ */

  it('⛔ ANGREP: dealer_admin kan ikke listPlatform', async () => {
    await forventer(somForhandlerI(tenantA).flags.listPlatform(), 'FORBIDDEN');
  });

  it('⛔ ANGREP: dealer_staff kan ikke listPlatform', async () => {
    await forventer(somAnsattI(tenantA).flags.listPlatform(), 'FORBIDDEN');
  });

  it('⛔ ANGREP: dealer_admin kan ikke setGlobal', async () => {
    await forventer(
      somForhandlerI(tenantA).flags.setGlobal({ key: flagg, enabled: true }),
      'FORBIDDEN',
    );
  });

  it('⛔ ANGREP: dealer_admin kan ikke setTenantOverride på en annen tenant', async () => {
    await forventer(
      somForhandlerI(tenantA).flags.setTenantOverride({
        tenantId: tenantB,
        key: flagg,
        enabled: true,
      }),
      'FORBIDDEN',
    );
  });

  it('⛔ ANGREP: dealer_admin kan ikke clearTenantOverride', async () => {
    await forventer(
      somForhandlerI(tenantA).flags.clearTenantOverride({ tenantId: tenantB, key: flagg }),
      'FORBIDDEN',
    );
  });

  it('⛔ ANGREP: plattformnøkler kan ikke overstyres per tenant — heller ikke av endwise_admin', async () => {
    await forventer(
      somEndwiseI(tenantA).flags.setTenantOverride({
        tenantId: tenantB,
        key: 'dev-mode',
        enabled: true,
      }),
      'FORBIDDEN',
    );
    await forventer(
      somEndwiseI(tenantA).flags.setTenantOverride({
        tenantId: tenantB,
        key: 'kill-switch',
        enabled: true,
      }),
      'FORBIDDEN',
    );
  });

  /* ══ Fail-closed ═══════════════════════════════════════════════════════ */

  it('⛔ ANGREP: ugyldig nøkkel avvises på serveren (CWE-20), ikke bare i UI', async () => {
    const ugyldige = ['Bad Key', 'HAS_UNDER', 'ÆØÅ', '-leading', 'trailing-', 'a/b', '../x'];
    for (const key of ugyldige) {
      await forventer(somEndwiseI(tenantA).flags.setGlobal({ key, enabled: true }), 'BAD_REQUEST');
      await forventer(somEndwiseI(tenantA).flags.upsert({ key }), 'BAD_REQUEST');
      await forventer(
        somEndwiseI(tenantA).flags.setTenantOverride({
          tenantId: tenantB,
          key,
          enabled: true,
        }),
        'BAD_REQUEST',
      );
    }
    const etter = await owner
      .select({ key: schema.featureFlags.key })
      .from(schema.featureFlags)
      .where(sql`key in ('Bad Key', 'HAS_UNDER', 'ÆØÅ', '-leading', 'trailing-', 'a/b', '../x')`);
    expect(etter).toEqual([]);
  });

  it('ukjent tenant og ukjent flagg avvises — ingen rad opprettes i blinde', async () => {
    await forventer(
      somEndwiseI(tenantA).flags.setTenantOverride({
        tenantId: randomUUID(),
        key: flagg,
        enabled: true,
      }),
      'NOT_FOUND',
    );
    await forventer(
      somEndwiseI(tenantA).flags.setTenantOverride({
        tenantId: tenantB,
        key: 'finnes-ikke',
        enabled: true,
      }),
      'NOT_FOUND',
    );
  });

  /* ══ Lovlig sti: global + per-tenant, isolert ══════════════════════════ */

  it('endwise_admin kan skru globalt, og resolve i begge tenants følger', async () => {
    await somEndwiseI(tenantA).flags.setGlobal({ key: flagg, enabled: true });
    const a = await somEndwiseI(tenantA).flags.resolve();
    const b = await somForhandlerI(tenantB).flags.resolve();
    expect(a[flagg]).toBe(true);
    expect(b[flagg]).toBe(true);
  });

  it('endwise_admin i A kan overstyre B uten å røre A', async () => {
    await somEndwiseI(tenantA).flags.setTenantOverride({
      tenantId: tenantB,
      key: flagg,
      enabled: false,
    });

    const a = await somEndwiseI(tenantA).flags.resolve();
    const b = await somForhandlerI(tenantB).flags.resolve();
    expect(a[flagg]).toBe(true);
    expect(b[flagg]).toBe(false);

    const plattform = await somEndwiseI(tenantA).flags.listPlatform();
    const radB = plattform.tenants.find((t) => t.id === tenantB);
    const radA = plattform.tenants.find((t) => t.id === tenantA);
    expect(radB?.overrides.some((o) => o.flagKey === flagg && o.enabled === false)).toBe(true);
    expect(radA?.overrides.some((o) => o.flagKey === flagg)).toBe(false);
    expect(plattform.globals.some((g) => g.key === flagg && g.overridable)).toBe(true);
  });

  it('clearTenantOverride på B gir arvet global, A urørt', async () => {
    await somEndwiseI(tenantA).flags.clearTenantOverride({ tenantId: tenantB, key: flagg });
    const a = await somEndwiseI(tenantA).flags.resolve();
    const b = await somForhandlerI(tenantB).flags.resolve();
    expect(a[flagg]).toBe(true);
    expect(b[flagg]).toBe(true);
  });

  it('dealer_admin kan fortsatt overstyre EGEN tenant på et overstyrbart flagg', async () => {
    await somForhandlerI(tenantA).flags.setOverride({ key: flagg, enabled: false });
    const a = await somForhandlerI(tenantA).flags.resolve();
    const b = await somForhandlerI(tenantB).flags.resolve();
    expect(a[flagg]).toBe(false);
    expect(b[flagg]).toBe(true);
  });

  it('list (egen tenant) viser ikke den andre tenantens overstyring', async () => {
    const listeB = await somForhandlerI(tenantB).flags.list();
    expect(listeB.overrides.some((o) => o.flagKey === flagg)).toBe(false);
  });

  /* ══ CWE-778: ingen stille privilegieendring ═══════════════════════════ */

  it('setGlobal skriver audit med actor, nøkkel, gammel og ny verdi', async () => {
    await owner.delete(schema.auditLog).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await somEndwiseI(tenantA).flags.setGlobal({ key: flagg, enabled: false });
    const rader = await owner
      .select()
      .from(schema.auditLog)
      .where(
        sql`tenant_id = ${tenantA} and action = 'feature_flag.set_global' and subject_id = ${flagg}`,
      );
    expect(rader).toHaveLength(1);
    expect(rader[0]?.actor).toBe(`ff-endwise_admin-${tenantA.slice(0, 8)}`);
    expect(rader[0]?.metadata).toMatchObject({
      key: flagg,
      old: true,
      new: false,
      scope: 'global',
    });
    expect(rader[0]?.occurredAt).toBeInstanceOf(Date);
  });

  it('setTenantOverride logger i MÅL-tenanten, ikke actor-tenanten', async () => {
    await owner.delete(schema.auditLog).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await somEndwiseI(tenantA).flags.setTenantOverride({
      tenantId: tenantB,
      key: flagg,
      enabled: true,
    });
    const iB = await owner
      .select()
      .from(schema.auditLog)
      .where(sql`tenant_id = ${tenantB} and action = 'feature_flag.set_override'`);
    const iA = await owner
      .select()
      .from(schema.auditLog)
      .where(sql`tenant_id = ${tenantA} and action = 'feature_flag.set_override'`);
    expect(iB).toHaveLength(1);
    expect(iA).toHaveLength(0);
    expect(iB[0]?.actor).toBe(`ff-endwise_admin-${tenantA.slice(0, 8)}`);
    expect(iB[0]?.metadata).toMatchObject({
      key: flagg,
      new: true,
      targetTenantId: tenantB,
      actorTenantId: tenantA,
    });
  });

  it('clearTenantOverride logger gammel override og new=null', async () => {
    await owner.delete(schema.auditLog).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await somEndwiseI(tenantA).flags.clearTenantOverride({ tenantId: tenantB, key: flagg });
    const rader = await owner
      .select()
      .from(schema.auditLog)
      .where(sql`tenant_id = ${tenantB} and action = 'feature_flag.clear_override'`);
    expect(rader).toHaveLength(1);
    expect(rader[0]?.metadata).toMatchObject({ key: flagg, old: true, new: null });
  });

  it('avvist kall skriver ingen audit-rad', async () => {
    await owner.delete(schema.auditLog).where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    await forventer(
      somForhandlerI(tenantA).flags.setGlobal({ key: flagg, enabled: true }),
      'FORBIDDEN',
    );
    const rader = await owner
      .select()
      .from(schema.auditLog)
      .where(sql`tenant_id in (${tenantA}, ${tenantB})`);
    expect(rader).toEqual([]);
  });
});
