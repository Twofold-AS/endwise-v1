import { randomUUID } from 'node:crypto';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * F1-14 — JOBBFUNKSJON: hvem får lov til å endre den?
 *
 * **Dette er testen for CWE-862 / OWASP A01 på funksjonsaksen.** Hvert kall er
 * et forsøk på å sette en funksjon uten å være leder, eller på en person som
 * ikke hører til forhandleren.
 *
 * ⚠️ Vi kaller `appRouter` direkte med en håndlaget context, ikke over HTTP —
 * samme grunn som i `module-gate.test.ts`: en angriper går heller ikke gjennom
 * UI-et. At knappen er skjult beviser ingenting.
 *
 * ⚠️ **Landingsregelen testes rent** i `packages/modules/test/profil.test.ts`.
 * Her tester vi at REGELEN NÅS — altså at `session.me` returnerer den funksjonen
 * og landingen personen faktisk skal ha, med ekte rader i basen.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('F1-14 — jobbfunksjon', () => {
  let owner: Database;
  let app: Database;
  const tenant = randomUUID();
  const annenTenant = randomUUID();

  const LEDER = `leder-${tenant.slice(0, 8)}`;
  const SELGER = `selger-${tenant.slice(0, 8)}`;
  const SUPPORT = `support-${tenant.slice(0, 8)}`;
  const MEKANIKER = `mek-${tenant.slice(0, 8)}`;
  /** Medlem av en ANNEN forhandler. Skal ikke kunne røres herfra. */
  const FREMMED = `fremmed-${annenTenant.slice(0, 8)}`;

  const ctx = (userId: string, role: string) =>
    ({
      db: app,
      events: { publish: async () => {} } as never,
      tenantId: tenant,
      userId,
      role,
    }) as never;

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner.insert(schema.tenants).values([
      { id: tenant, name: 'Funksjonstest', slug: `ft-${tenant.slice(0, 8)}` },
      { id: annenTenant, name: 'Naboen', slug: `nb-${annenTenant.slice(0, 8)}` },
    ]);

    /**
     * ⚠️ BÅDE `organization` OG `tenants`. ADR-002: organization.id ER
     * tenant_id, men det er to fysiske tabeller — `member.organization_id`
     * peker på Better-Auths, og domenetabellene på vår. Uten begge feiler
     * innsettingen på fremmednøkkelen, som den skal.
     */
    await owner.insert(schema.organization).values([
      {
        id: tenant,
        name: 'Funksjonstest',
        slug: `ft-org-${tenant.slice(0, 8)}`,
        createdAt: new Date(),
      },
      {
        id: annenTenant,
        name: 'Naboen',
        slug: `nb-org-${annenTenant.slice(0, 8)}`,
        createdAt: new Date(),
      },
    ]);

    // Better-Auth-brukere (globale, uten RLS).
    await owner.insert(schema.user).values(
      [LEDER, SELGER, SUPPORT, MEKANIKER, FREMMED].map((id) => ({
        id,
        name: `Navn ${id}`,
        email: `${id}@test.invalid`,
        emailVerified: true,
      })),
    );

    await owner.insert(schema.member).values([
      {
        id: randomUUID(),
        organizationId: tenant,
        userId: LEDER,
        role: 'dealer_admin',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        organizationId: tenant,
        userId: SELGER,
        role: 'dealer_staff',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        organizationId: tenant,
        userId: SUPPORT,
        role: 'dealer_staff',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        organizationId: tenant,
        userId: MEKANIKER,
        role: 'dealer_staff',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        organizationId: annenTenant,
        userId: FREMMED,
        role: 'dealer_staff',
        createdAt: new Date(),
      },
    ]);

    // Mekanikeren har en profil → funksjonen skal UTLEDES uten lagret verdi.
    await owner
      .insert(schema.mechanics)
      .values({ tenantId: tenant, userId: MEKANIKER, name: 'Mekanikeren', capacity: 1 });
  });

  afterAll(async () => {
    await owner.delete(schema.memberProfiles).where(sql`tenant_id in (${tenant}, ${annenTenant})`);
    await owner.delete(schema.mechanics).where(sql`tenant_id = ${tenant}`);
    await owner.delete(schema.member).where(sql`organization_id in (${tenant}, ${annenTenant})`);
    await owner
      .delete(schema.user)
      .where(sql`id in (${LEDER}, ${SELGER}, ${SUPPORT}, ${MEKANIKER}, ${FREMMED})`);
    await owner.delete(schema.tenants).where(sql`id in (${tenant}, ${annenTenant})`);
    await owner.delete(schema.organization).where(sql`id in (${tenant}, ${annenTenant})`);
  });

  /* ══ ANGREP ═══════════════════════════════════════════════════════════ */

  it('⛔ ANGREP: dealer_staff kan ikke endre funksjon på en kollega', async () => {
    const api = appRouter.createCaller(ctx(SELGER, 'dealer_staff'));
    await expect(api.team.setFunction({ userId: SUPPORT, funksjon: 'selger' })).rejects.toThrow();
  });

  it('⛔ ANGREP: dealer_staff kan ikke gi SEG SELV en annen funksjon', async () => {
    const api = appRouter.createCaller(ctx(SELGER, 'dealer_staff'));
    await expect(api.team.setFunction({ userId: SELGER, funksjon: 'support' })).rejects.toThrow();
  });

  it('⛔ ANGREP: dealer_staff kan ikke lese teamlista', async () => {
    // Lista er et personregister over verkstedet — den hører til lederen.
    const api = appRouter.createCaller(ctx(SELGER, 'dealer_staff'));
    await expect(api.team.list()).rejects.toThrow();
  });

  it('⛔ ANGREP: lederen kan ikke sette funksjon på en ANNEN forhandlers ansatt', async () => {
    // RLS ville stoppet lesingen, men innskrivingen ville hatt VÅR tenant-id og
    // altså vært lovlig. Derfor må medlemskapet sjekkes eksplisitt i ruta.
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    await expect(api.team.setFunction({ userId: FREMMED, funksjon: 'support' })).rejects.toThrow(
      /ikke medlem/i,
    );
  });

  it('⛔ «leder» kan ikke tildeles — den følger av tilgangsnivået', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    await expect(
      // @ts-expect-error — verdien er utenfor input-skjemaet med vilje.
      api.team.setFunction({ userId: SELGER, funksjon: 'leder' }),
    ).rejects.toThrow();
  });

  it('⛔ en leder kan ikke få tildelt funksjon i det hele tatt', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    await expect(api.team.setFunction({ userId: LEDER, funksjon: 'support' })).rejects.toThrow(
      /leder/i,
    );
  });

  /* ══ NORMALFLYT ═══════════════════════════════════════════════════════ */

  it('lederen kan sette funksjon, og den slår ut i landingen', async () => {
    const leder = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    await leder.team.setFunction({ userId: SUPPORT, funksjon: 'support' });

    const meg = appRouter.createCaller(ctx(SUPPORT, 'dealer_staff'));
    const me = await meg.session.me();
    expect(me.jobbfunksjon).toBe('support');
    expect(me.landing).toBe('/innboks');
  });

  it('uten lagret funksjon utledes den — mekanikerprofil → /min-dag', async () => {
    const api = appRouter.createCaller(ctx(MEKANIKER, 'dealer_staff'));
    const me = await api.session.me();
    expect(me.jobbfunksjon).toBe('mekaniker');
    expect(me.landing).toBe('/min-dag');
  });

  it('uten lagret funksjon og uten mekanikerprofil → selger → /dashboard', async () => {
    const api = appRouter.createCaller(ctx(SELGER, 'dealer_staff'));
    const me = await api.session.me();
    expect(me.jobbfunksjon).toBe('selger');
    expect(me.landing).toBe('/dashboard');
  });

  it('lederen er leder uansett hva som står i basen', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    const me = await api.session.me();
    expect(me.jobbfunksjon).toBe('leder');
    expect(me.landing).toBe('/dashboard');
  });

  it('teamlista viser alle med utledet funksjon, og hvem som kan endres', async () => {
    const api = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    const liste = await api.team.list();
    const per = new Map(liste.map((r) => [r.userId, r]));

    expect(per.get(LEDER)?.funksjon).toBe('leder');
    expect(per.get(LEDER)?.kanEndres).toBe(false); // ⛔ ledere står fast
    expect(per.get(SUPPORT)?.funksjon).toBe('support');
    expect(per.get(SUPPORT)?.kanEndres).toBe(true);
    expect(per.get(MEKANIKER)?.harMekanikerprofil).toBe(true);
    // Naboen skal ALDRI dukke opp i vår liste.
    expect(per.has(FREMMED)).toBe(false);
  });

  it('⚠️ funksjonsendring rører ALDRI tilgangsnivået', async () => {
    const leder = appRouter.createCaller(ctx(LEDER, 'dealer_admin'));
    await leder.team.setFunction({ userId: SELGER, funksjon: 'support' });

    const [rad] = await owner
      .select({ role: schema.member.role })
      .from(schema.member)
      .where(sql`organization_id = ${tenant} and user_id = ${SELGER}`);
    expect(rad?.role).toBe('dealer_staff');
  });
});
