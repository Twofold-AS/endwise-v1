import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * F2-05 / F5-04 — TJENESTEKATALOGEN: hvem får endre prisen kunden betaler?
 *
 * Skrevet fordi katalogflaten ble bygget 20.08.2026 og gjorde fire prosedyrer
 * som ALDRI hadde hatt et kallsted til noe folk faktisk trykker på. Så lenge de
 * lå ubrukt, var det uten praktisk konsekvens at de sto på
 * `protectedProcedure`. I det de fikk en flate, betydde det at enhver ansatt
 * med en sesjon kunne endre prislista.
 *
 * ⚠️ Vi kaller `appRouter` direkte med en håndlaget context, ikke over HTTP —
 * samme grunn som i `module-gate.test.ts`: en angriper går heller ikke gjennom
 * UI-et, og UI-gating er kosmetikk.
 *
 * ⛔ Merk hva testen IKKE beviser: at knappen er skjult for staff. Det er
 * uinteressant. Den beviser at ruta sier nei.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('F2-05 — tjenestekatalogen: rollegate og synlighet', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();

  const ctx = (tenantId: string, role: 'dealer_admin' | 'dealer_staff') => ({
    db: app,
    events: { publish: async () => {} } as never,
    tenantId,
    userId: `bruker-${role}-${tenantId.slice(0, 8)}`,
    role,
  });

  const leder = () => appRouter.createCaller(ctx(tenantA, 'dealer_admin') as never);
  const ansatt = () => appRouter.createCaller(ctx(tenantA, 'dealer_staff') as never);
  const naboLeder = () => appRouter.createCaller(ctx(tenantB, 'dealer_admin') as never);

  /** Settes av den første testen som oppretter noe. */
  let tjenesteId = '';

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'Verksted A (test)', slug: `ta-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'Verksted B (test)', slug: `tb-${tenantB.slice(0, 8)}` },
    ]);
  });

  afterAll(async () => {
    for (const t of [tenantA, tenantB]) {
      await owner.delete(schema.serviceVersions).where(eq(schema.serviceVersions.tenantId, t));
      await owner.delete(schema.services).where(eq(schema.services.tenantId, t));
    }
    await owner.delete(schema.tenants).where(sql`id in (${tenantA}, ${tenantB})`);
  });

  /* ══ ANGREP: dealer_staff skal ikke kunne røre prislista ═══════════════ */

  it('ANGREP: dealer_staff kan ikke opprette en tjeneste', async () => {
    await expect(
      ansatt().services.create({
        name: 'Gratis service',
        vehicleType: 'mc',
        durationMinutes: 60,
        priceMinor: 0,
        skills: [],
      }),
    ).rejects.toThrow(/dealer_staff|FORBIDDEN/i);
  });

  it('leder KAN opprette — og får versjon 1', async () => {
    const res = await leder().services.create({
      name: 'EU-kontroll MC (test)',
      vehicleType: 'mc',
      durationMinutes: 60,
      priceMinor: 145_000,
      skills: [],
    });
    tjenesteId = res.service.id;
    expect(res.version?.version).toBe(1);
    expect(res.version?.priceMinor).toBe(145_000);
  });

  it('ANGREP: dealer_staff kan ikke lage en ny versjon (= endre prisen)', async () => {
    await expect(
      ansatt().services.update({
        serviceId: tjenesteId,
        durationMinutes: 60,
        priceMinor: 1,
        skills: [],
      }),
    ).rejects.toThrow(/dealer_staff|FORBIDDEN/i);
  });

  it('ANGREP: dealer_staff kan ikke deaktivere en tjeneste', async () => {
    await expect(ansatt().services.deactivate({ serviceId: tjenesteId })).rejects.toThrow(
      /dealer_staff|FORBIDDEN/i,
    );
  });

  it('ANGREP: dealer_staff kan ikke slå en tjeneste på igjen', async () => {
    await expect(ansatt().services.reactivate({ serviceId: tjenesteId })).rejects.toThrow(
      /dealer_staff|FORBIDDEN/i,
    );
  });

  /* ══ LESING er åpen — staff må kunne svare kunden i telefonen ══════════ */

  it('dealer_staff KAN lese katalogen', async () => {
    const liste = await ansatt().services.list();
    expect(liste.some((t) => t.id === tjenesteId)).toBe(true);
  });

  it('dealer_staff kan lese versjonshistorikken', async () => {
    const v = await ansatt().services.versions({ serviceId: tjenesteId });
    expect(v.length).toBeGreaterThanOrEqual(1);
  });

  /* ══ VERSJONERING: den gamle raden overlever ═══════════════════════════ */

  it('ny versjon lukker den forrige i stedet for å overskrive den', async () => {
    await leder().services.update({
      serviceId: tjenesteId,
      durationMinutes: 90,
      priceMinor: 165_000,
      skills: [],
    });

    const v = await leder().services.versions({ serviceId: tjenesteId });
    const v1 = v.find((x) => x.version === 1);
    const v2 = v.find((x) => x.version === 2);

    // ⛔ Kjernen i F2-04: fjorårets pris står fortsatt der, uendret.
    expect(v1?.priceMinor).toBe(145_000);
    expect(v1?.validTo).not.toBeNull();
    expect(v2?.priceMinor).toBe(165_000);
    expect(v2?.validTo).toBeNull();
  });

  /* ══ SYNLIGHET: deaktivert forsvinner fra booking, ikke fra katalogen ══ */

  it('deaktivert tjeneste faller ut av standardlista', async () => {
    await leder().services.deactivate({ serviceId: tjenesteId });
    const standard = await leder().services.list();
    expect(standard.some((t) => t.id === tjenesteId)).toBe(false);
  });

  it('… men er synlig når katalogflaten ber om den — ellers er den uopprettelig', async () => {
    const medInaktive = await leder().services.list({ inkluderInaktive: true });
    const rad = medInaktive.find((t) => t.id === tjenesteId);
    expect(rad?.active).toBe(false);
    // Versjonen følger med, så «slå på igjen» ikke mister pris og varighet.
    expect(rad?.version).toBe(2);
  });

  it('reactivate bringer den tilbake med samme versjon', async () => {
    await leder().services.reactivate({ serviceId: tjenesteId });
    const liste = await leder().services.list();
    const rad = liste.find((t) => t.id === tjenesteId);
    expect(rad?.active).toBe(true);
    expect(rad?.version).toBe(2);
  });

  /* ══ TENANT-GRENSEN ════════════════════════════════════════════════════ */

  it('ANGREP: nabo-forhandleren ser ikke tjenesten', async () => {
    const liste = await naboLeder().services.list({ inkluderInaktive: true });
    expect(liste.some((t) => t.id === tjenesteId)).toBe(false);
  });

  it('ANGREP: nabo-forhandleren får ingen versjoner på vår serviceId', async () => {
    const v = await naboLeder().services.versions({ serviceId: tjenesteId });
    expect(v).toEqual([]);
  });
});
