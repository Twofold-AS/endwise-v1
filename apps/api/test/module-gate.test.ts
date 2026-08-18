import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema, sql } from '@endwise/db';
import { ADDON_MODULES, BASIS_MODULES, isAddon } from '@endwise/modules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * F0-16 — MODUL-GATEN. **Dette er testen for CWE-862 (Missing Authorization).**
 *
 * Hvert kall her er et forsøk på å nå en betalt modul uten å ha kjøpt den.
 * Består testene, betyr det at GATEN stoppet forsøket — ikke at UI-et lot være
 * å vise knappen.
 *
 * ⚠️ Vi kaller `appRouter` direkte med en håndlaget context, ikke over HTTP.
 * Det er med vilje: en angriper går heller ikke gjennom UI-et. Ruta må stå
 * imot et rått kall.
 *
 * To tenants:
 *   - `medModul`  har `quick` og `ai-support` i `tenant_modules`
 *   - `utenModul` har ingen tillegg i det hele tatt
 *
 * Begge er `dealer_admin` — rollen er altså IKKE forskjellen. Det eneste som
 * skiller dem er om de har betalt.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('F0-16 — modul-gaten', () => {
  let owner: Database;
  let app: Database;
  const medModul = randomUUID();
  const utenModul = randomUUID();

  /** Minimal context. `tenantId`/`role` kommer normalt fra `assertMember`. */
  const ctx = (tenantId: string) => ({
    db: app,
    events: { publish: async () => {} } as never,
    tenantId,
    userId: `bruker-${tenantId.slice(0, 8)}`,
    role: 'dealer_admin' as const,
  });

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner.insert(schema.tenants).values([
      { id: medModul, name: 'Har betalt', slug: `mm-${medModul.slice(0, 8)}` },
      { id: utenModul, name: 'Har ikke betalt', slug: `um-${utenModul.slice(0, 8)}` },
    ]);
    await owner.insert(schema.tenantModules).values([
      { tenantId: medModul, moduleKey: 'quick', enabled: true },
      { tenantId: medModul, moduleKey: 'ai-support', enabled: true },
      // ⚠️ Deaktivert, ikke fraværende — nedgradering setter `enabled = false`
      // og skal virke akkurat som om raden ikke fantes.
      { tenantId: medModul, moduleKey: 'vegvesen', enabled: false },
    ]);
  });

  afterAll(async () => {
    for (const t of [medModul, utenModul]) {
      await owner.delete(schema.tenantModules).where(eq(schema.tenantModules.tenantId, t));
    }
    await owner.delete(schema.tenants).where(sql`id in (${medModul}, ${utenModul})`);
  });

  /* ══ Katalogen henger sammen ═══════════════════════════════════════════ */

  it('basis og tillegg overlapper ikke', () => {
    const overlapp = BASIS_MODULES.filter((b) => (ADDON_MODULES as readonly string[]).includes(b));
    expect(overlapp).toEqual([]);
  });

  it('ukjente nøkler behandles som tillegg (fail-safe)', () => {
    expect(isAddon('noe-vi-aldri-har-hørt-om')).toBe(true);
    expect(isAddon('inventory')).toBe(false);
    expect(isAddon('shop')).toBe(true);
  });

  /* ══ ANGREP: uten modulen ══════════════════════════════════════════════ */

  it('ANGREP: quick.config uten modulen → FORBIDDEN', async () => {
    const caller = appRouter.createCaller(ctx(utenModul) as never);
    await expect(caller.quick.config()).rejects.toThrow(/quick.*ikke aktiv|FORBIDDEN/i);
  });

  it('ANGREP: agent.list uten modulen → FORBIDDEN', async () => {
    const caller = appRouter.createCaller(ctx(utenModul) as never);
    await expect(caller.agent.list()).rejects.toThrow(/ai-support.*ikke aktiv|FORBIDDEN/i);
  });

  it('ANGREP: conflicts.count uten modulen → FORBIDDEN', async () => {
    const caller = appRouter.createCaller(ctx(utenModul) as never);
    await expect(caller.conflicts.count()).rejects.toThrow(/quick.*ikke aktiv|FORBIDDEN/i);
  });

  it('ANGREP: widget.keys.list uten modulen → FORBIDDEN', async () => {
    const caller = appRouter.createCaller(ctx(utenModul) as never);
    await expect(caller.widget.keys.list()).rejects.toThrow(/widget.*ikke aktiv|FORBIDDEN/i);
  });

  it('ANGREP: en DEAKTIVERT modul teller som ikke kjøpt', async () => {
    // `medModul` HAR en vegvesen-rad, men med `enabled = false`.
    const caller = appRouter.createCaller(ctx(medModul) as never);
    await expect(caller.lookup.vehicleByRegNumber({ regNumber: 'AB12345' })).rejects.toThrow(
      /vegvesen.*ikke aktiv|FORBIDDEN/i,
    );
  });

  /* ══ MED modulen slipper gjennom ═══════════════════════════════════════ */

  it('quick.config MED modulen slipper gjennom gaten', async () => {
    const caller = appRouter.createCaller(ctx(medModul) as never);
    // Kan svare hva som helst (typisk `null` uten konfig) — poenget er at den
    // IKKE kaster FORBIDDEN. En feil lenger inne er et annet problem.
    await expect(caller.quick.config()).resolves.not.toThrow();
  });

  it('agent.list MED modulen slipper gjennom gaten', async () => {
    const caller = appRouter.createCaller(ctx(medModul) as never);
    const agenter = await caller.agent.list();
    expect(Array.isArray(agenter)).toBe(true);
  });

  /* ══ BASIS er IKKE gated ═══════════════════════════════════════════════ */

  it('BASIS: lager svarer uten noen modul i det hele tatt', async () => {
    const caller = appRouter.createCaller(ctx(utenModul) as never);
    const s = await caller.inventory.summary();
    expect(s.antallDeler).toBe(0); // tom, men ikke avvist
  });

  it('BASIS: deleliste svarer uten moduler', async () => {
    const caller = appRouter.createCaller(ctx(utenModul) as never);
    await expect(caller.inventory.listParts()).resolves.toEqual([]);
  });

  it('BASIS: bookinger svarer uten moduler', async () => {
    const caller = appRouter.createCaller(ctx(utenModul) as never);
    await expect(caller.bookings.list({ limit: 5 })).resolves.toBeDefined();
  });

  it('BASIS: abonnementsflaten er ALDRI gated — ellers kan man ikke kjøpe seg ut', async () => {
    const caller = appRouter.createCaller(ctx(utenModul) as never);
    const planer = await caller.billing.plans();
    expect(planer.length).toBeGreaterThan(0);
  });
});
