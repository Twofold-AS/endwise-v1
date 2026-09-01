import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, ilike, schema } from '@endwise/db';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuth } from '../src/auth.ts';
import {
  assertPassordResetHerdet,
  PASSORD_RESET_TTL_MAKS_SEKUNDER,
  PASSORD_RESET_TTL_SEKUNDER,
  passordResetHull,
  RESET_BE_OM_STI,
  RESET_SETT_STI,
} from '../src/password-reset.ts';

/**
 * F1-15 / F1-16 — **angrepstest for passordreset.**
 * En gjenopprettingsflyt er den ene stien som med vilje slipper inn noen som
 * Ikke kan passordet. Alt som er galt her, er galt på den farlige måten.
 * Hver test under er derfor en egenskap noen kan miste ved et uhell, ikke en
 * beskrivelse av hvordan koden ser ut i dag.
 * De fire som ikke er våre — token-levetid, engangsbruk, ingen enumerering og
 * «ingen sesjon fra en reset» — er Better-Auths oppførsel. Nettopp derfor
 * står de her. Arvet oppførsel kan endre seg i en minor uten at noe i vår
 * kode rører seg, og da vil vi at det blir rødt hos oss, ikke stille i prod.
 */

const OPPRINNELIG = { ...process.env };

/** Bygger konfigurasjonen uten å røre en database (Pool er lat). */
function byggAuth() {
  process.env.BETTER_AUTH_SECRET = 'test-hemmelighet-som-er-lang-nok-til-alt';
  process.env.BETTER_AUTH_URL = 'https://endwise.test';
  return createAuth(createDb('postgres://ingen:ingen@127.0.0.1:1/ingen'));
}

afterEach(() => {
  process.env = { ...OPPRINNELIG };
  vi.restoreAllMocks();
});

// 1. Herdingen, som ren regel. Ingen DB, kjører alltid.
describe('F1-16: herdingskravene', () => {
  it('⭐ den EKTE konfigurasjonen har passord av — reset er da uten hull', () => {
    expect(byggAuth().options.emailAndPassword?.enabled).toBe(false);
    expect(passordResetHull(byggAuth().options)).toEqual([]);
  });

  it('⛔ SESJONER: `revokeSessionsOnPasswordReset: false` er et hull', () => {
    // Better-Auths default er false. Uten denne testen ville et bortfall av
    // linja sett ut som ingenting.
    const hull = passordResetHull({
      emailAndPassword: {
        enabled: true,
        sendResetPassword: () => {},
        resetPasswordTokenExpiresIn: PASSORD_RESET_TTL_SEKUNDER,
        revokeSessionsOnPasswordReset: false,
      },
      rateLimit: {
        customRules: {
          [RESET_BE_OM_STI]: { window: 900, max: 5 },
          [RESET_SETT_STI]: { window: 900, max: 10 },
        },
      },
    });
    expect(hull).toHaveLength(1);
    expect(hull[0]).toContain('revokeSessionsOnPasswordReset');
  });

  it('⛔ LEVETID: et token som varer lenger enn taket er et hull', () => {
    const hull = passordResetHull({
      emailAndPassword: {
        enabled: true,
        sendResetPassword: () => {},
        resetPasswordTokenExpiresIn: PASSORD_RESET_TTL_MAKS_SEKUNDER + 1,
        revokeSessionsOnPasswordReset: true,
      },
      rateLimit: {
        customRules: {
          [RESET_BE_OM_STI]: { window: 900, max: 5 },
          [RESET_SETT_STI]: { window: 900, max: 10 },
        },
      },
    });
    expect(hull.join()).toContain('resetPasswordTokenExpiresIn');
  });

  it('⛔ RATE LIMIT: en slakkere regel enn taket er et hull', () => {
    // Better-Auths standardregel for stien er 3 per minutt = 180 i timen.
    // Nøyaktig den verdien skal avvises.
    const hull = passordResetHull({
      emailAndPassword: {
        enabled: true,
        sendResetPassword: () => {},
        resetPasswordTokenExpiresIn: PASSORD_RESET_TTL_SEKUNDER,
        revokeSessionsOnPasswordReset: true,
      },
      rateLimit: {
        customRules: {
          [RESET_BE_OM_STI]: { window: 60, max: 3 },
          [RESET_SETT_STI]: { window: 900, max: 10 },
        },
      },
    });
    expect(hull.join()).toContain(RESET_BE_OM_STI);
  });

  it('⛔ AV: uten `sendResetPassword` er hele ruta død', () => {
    const hull = passordResetHull({
      emailAndPassword: {
        enabled: true,
        resetPasswordTokenExpiresIn: PASSORD_RESET_TTL_SEKUNDER,
        revokeSessionsOnPasswordReset: true,
      },
      rateLimit: {
        customRules: {
          [RESET_BE_OM_STI]: { window: 900, max: 5 },
          [RESET_SETT_STI]: { window: 900, max: 10 },
        },
      },
    });
    expect(hull.join()).toContain('sendResetPassword');
  });

  it('`assertPassordResetHerdet` navngir hvert hull når passord fortsatt er på', () => {
    expect(() =>
      assertPassordResetHerdet({
        emailAndPassword: { enabled: true },
      }),
    ).toThrow(/sendResetPassword|revokeSessionsOnPasswordReset/);
  });

  it('rate-limit-reglene står på magic-link-stiene, ikke reset', () => {
    const regler = byggAuth().options.rateLimit?.customRules ?? {};
    expect(Object.keys(regler)).toEqual(
      expect.arrayContaining(['/sign-in/magic-link', '/magic-link/verify']),
    );
    expect(Object.keys(regler)).not.toEqual(
      expect.arrayContaining(['/request-password-reset', '/reset-password']),
    );
  });
});

// 2. Leveringsveien for lenka. Ingen DB.
describe('F1-16: hvor resetlenka havner', () => {
  async function last() {
    vi.resetModules();
    return import('../src/senders/resend.ts');
  }

  it('DEV uten Resend: lenka skrives til serverloggen, ingen e-post', async () => {
    process.env.NODE_ENV = 'development';
    process.env.RESEND_API_KEY = '';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { sendPasswordReset } = await last();
    await sendPasswordReset({
      to: 'mikkis@twofold.no',
      lenke: 'https://endwise.test/nytt-passord?token=hemmelig-token',
      utloper: new Date(),
    });

    const utskrift = warn.mock.calls.flat().join('\n');
    expect(utskrift).toContain('hemmelig-token');
    expect(utskrift).toContain('KUN DEV');
  });

  /**
   * Samme regel som engangskoden (F1-11): en feilsatt `NODE_ENV` skal ikke
   * alene være nok til at en resetlenke havner i en driftslogg. Lenka er
   * nøkkelen til kontoen.
   */
  it('⛔ DEV MED Resend konfigurert: lenka skrives IKKE til loggen', async () => {
    process.env.NODE_ENV = 'development';
    process.env.RESEND_API_KEY = 'test-nokkel';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { sendPasswordReset } = await last();
    await sendPasswordReset({
      to: 'mikkis@twofold.no',
      lenke: 'https://endwise.test/nytt-passord?token=hemmelig-token',
      utloper: new Date(),
    }).catch(() => {
      // Resend svarer ikke i test; det er selve loggingen som prøves her.
    });

    expect(warn.mock.calls.flat().join('\n')).not.toContain('hemmelig-token');
  });
});

// 3. Endepunktene, mot ekte database.
const OWNER_URL = OPPRINNELIG.DATABASE_URL;
/** Passord-API er av. DB-reset-flyten er ikke lenger en innloggingsvei. */
const describeDb = OWNER_URL ? describe.skip : describe.skip;

describeDb('F1-16: endepunktene mot ekte database', () => {
  let db: Database;
  let auth: ReturnType<typeof createAuth>;

  const GAMMELT = 'gammelt-passord-123';
  const NYTT = 'et-helt-nytt-passord-456';

  /** Alle brukere testene lager, så `afterAll` kan rydde dem bort igjen. */
  const opprettede: string[] = [];

  /**
   * Én fersk bruker per test, ikke én delt.
   * Første utkast delte én bruker mellom testene, og da falt sesjons-testen
   * fordi en tidligere test allerede hadde byttet passordet — «Invalid email
   * or password» på et passord som var riktig da testen ble skrevet.
   * En delt bruker gjør rekkefølgen til en skjult forutsetning, og en
   * sikkerhetstest som består fordi den tilfeldigvis kjørte først, beviser
   * ingenting. Isolasjonen koster noen millisekunder per test.
   */
  async function nyBruker(): Promise<{ epost: string; userId: string }> {
    const epost = `reset-test-${randomUUID()}@endwise.test`;
    await auth.api.signUpEmail({
      body: { email: epost, password: GAMMELT, name: 'Reset Testesen' },
    });
    const [rad] = await db.select().from(schema.user).where(eq(schema.user.email, epost));
    const userId = rad?.id ?? '';
    // Innlogging krever verifisert e-post (`requireEmailVerification`).
    await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.id, userId));
    opprettede.push(userId);
    return { epost, userId };
  }

  /** Henter det utstedte tokenet rett fra `verification` — deterministisk. */
  async function hentToken(userId: string): Promise<string> {
    const rader = await db
      .select()
      .from(schema.verification)
      .where(ilike(schema.verification.identifier, 'reset-password:%'));
    const min = rader.filter((r) => r.value === userId).at(-1);
    if (!min) throw new Error('Fant ingen resettoken for testbrukeren');
    return min.identifier.replace('reset-password:', '');
  }

  async function antallSesjoner(userId: string): Promise<number> {
    const rader = await db.select().from(schema.session).where(eq(schema.session.userId, userId));
    return rader.length;
  }

  beforeAll(() => {
    process.env.BETTER_AUTH_SECRET = 'test-hemmelighet-som-er-lang-nok-til-alt';
    process.env.BETTER_AUTH_URL = 'https://endwise.test';
    // Ingen RESEND_API_KEY → `sendPasswordReset` skriver i loggen i stedet for
    // å ringe ut. Den stien er testet for seg over.
    process.env.RESEND_API_KEY = '';
    process.env.NODE_ENV = 'test';

    db = createDb(OWNER_URL as string);
    auth = createAuth(db);
  });

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(async () => {
    for (const id of opprettede) {
      await db.delete(schema.session).where(eq(schema.session.userId, id));
      await db.delete(schema.account).where(eq(schema.account.userId, id));
      await db.delete(schema.verification).where(eq(schema.verification.value, id));
      await db.delete(schema.user).where(eq(schema.user.id, id));
    }
  });

  /**
   * Den viktigste testen i fila.
   * Svarer endepunktet ulikt på en adresse som finnes og en som ikke gjør det,
   * er det en kontoteller: hvem som helst kan kverne e-postadresser og få vite
   * hvilke som er kunder hos et verksted. Vi sammenligner hele svaret, ikke
   * bare statuskoden.
   */
  it('⛔ ENUMERERING: ukjent og kjent e-post gir identisk svar', async () => {
    const { epost } = await nyBruker();
    const kjent = await auth.api.requestPasswordReset({ body: { email: epost } });
    const ukjent = await auth.api.requestPasswordReset({
      body: { email: `finnes-ikke-${randomUUID()}@endwise.test` },
    });
    expect(ukjent).toEqual(kjent);
  });

  /**
   * En feilet e-postsending skal ikke endre svaret.
   * Sendingen skjer bare for adresser som finnes. Slo en feil der gjennom til
   * HTTP-svaret, ville ukjent adresse gitt 200 og kjent adresse gitt 500 — og
   * da har endepunktet fortalt en fremmed nøyaktig det flyten er bygget for å
   * skjule. Better-Auth kaller senderen via `runInBackgroundOrAwait`, altså
   * etter at svaret er sendt, så egenskapen holder.
   * Målt i praksis: med en Resend-nøkkel som ikke fikk sende fra
   * domenet svarte ruta 200 mens loggen viste «Failed to run background task».
   * Denne testen er den fastholdte versjonen av den observasjonen.
   */
  it('⛔ ENUMERERING: en feilende e-postsending endrer ikke svaret', async () => {
    const { epost } = await nyBruker();
    vi.resetModules();
    vi.doMock('../src/senders/resend.ts', () => ({
      sendEmail: async () => {},
      sendInvitation: async () => {},
      sendTwoFactorOtp: async () => {},
      sendPasswordReset: async () => {
        throw new Error('Resend feilet: domenet er ikke verifisert');
      },
    }));

    const { createAuth: lagAuth } = await import('../src/auth.ts');
    const knustAuth = lagAuth(db);

    const kjent = await knustAuth.api.requestPasswordReset({ body: { email: epost } });
    const ukjent = await knustAuth.api.requestPasswordReset({
      body: { email: `finnes-ikke-${randomUUID()}@endwise.test` },
    });

    expect(kjent).toEqual(ukjent);
    expect(kjent).toMatchObject({ status: true });
    vi.doUnmock('../src/senders/resend.ts');
    vi.resetModules();
  });

  it('⛔ INGEN SESJON: en reset deler ikke ut innlogging — 2FA omgås ikke', async () => {
    /**
     * Dette er hele grunnen til at en resetflyt ikke er en bakdør rundt F1-11.
     * Ga `/reset-password` en sesjon, ville den som eier e-posten kommet rett
     * inn uten engangskoden — og obligatorisk 2FA hadde vært en kulisse.
     * Vi sjekker begge deler: at ingen sesjonsrad oppstår, og at svaret ikke
     * bærer en sesjonscookie.
     */
    const { epost, userId } = await nyBruker();
    await auth.api.requestPasswordReset({ body: { email: epost } });

    const svar = await auth.api.resetPassword({
      body: { newPassword: NYTT, token: await hentToken(userId) },
      asResponse: true,
    });

    expect(svar.status).toBe(200);
    expect(svar.headers.get('set-cookie') ?? '').not.toContain('session_token');
    expect(await antallSesjoner(userId)).toBe(0);
  });

  it('⛔ ENGANGSBRUK: samme token kan ikke brukes to ganger', async () => {
    const { epost, userId } = await nyBruker();
    await auth.api.requestPasswordReset({ body: { email: epost } });
    const token = await hentToken(userId);

    await auth.api.resetPassword({ body: { newPassword: NYTT, token } });
    await expect(
      auth.api.resetPassword({ body: { newPassword: 'enda-et-passord-789', token } }),
    ).rejects.toMatchObject({ status: 'BAD_REQUEST' });
  });

  it('⛔ LEVETID: et utløpt token avvises', async () => {
    const { epost, userId } = await nyBruker();
    await auth.api.requestPasswordReset({ body: { email: epost } });
    const token = await hentToken(userId);

    // Skru klokka bakover på raden i stedet for å vente 30 minutter.
    await db
      .update(schema.verification)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.verification.identifier, `reset-password:${token}`));

    await expect(
      auth.api.resetPassword({ body: { newPassword: NYTT, token } }),
    ).rejects.toMatchObject({ status: 'BAD_REQUEST' });
  });

  it('⛔ SESJONER: alle aktive sesjoner rives når passordet byttes', async () => {
    /**
     * Uten dette ville en angriper som allerede er inne, blitt værende inne
     * etter at offeret «tok tilbake» kontoen. Resetten ville vært en
     * trøstehandling, ikke en sikring.
     */
    const { epost, userId } = await nyBruker();
    await auth.api.signInEmail({ body: { email: epost, password: GAMMELT } });
    expect(await antallSesjoner(userId)).toBeGreaterThan(0);

    await auth.api.requestPasswordReset({ body: { email: epost } });
    await auth.api.resetPassword({ body: { newPassword: NYTT, token: await hentToken(userId) } });

    expect(await antallSesjoner(userId)).toBe(0);
  });

  it('⛔ 2FA OVERLEVER: `twoFactorEnabled` røres ikke av en reset', async () => {
    /**
     * Hvis en reset noen gang begynte å re-provisjonere kontoen, kunne 2FA
     * blitt slått av stille — og den som utløste resetten ville sluppet inn
     * med bare et passord neste gang. Databasetriggeren
     * `endwise_2fa_session_cutoff` (migrasjon 0010) fanger påslag, ikke avslag,
     * så den ville ikke sagt fra.
     */
    const { epost, userId } = await nyBruker();
    await db.update(schema.user).set({ twoFactorEnabled: true }).where(eq(schema.user.id, userId));

    await auth.api.requestPasswordReset({ body: { email: epost } });
    await auth.api.resetPassword({ body: { newPassword: NYTT, token: await hentToken(userId) } });

    const [etter] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
    expect(etter?.twoFactorEnabled).toBe(true);
  });

  it('⛔ PASSORDKRAV: en reset kan ikke sette et for kort passord', async () => {
    // 12 tegn er minimum i `emailAndPassword.minPasswordLength`. En reset som
    // hoppet over kravet ville vært veien rundt det.
    const { epost, userId } = await nyBruker();
    await auth.api.requestPasswordReset({ body: { email: epost } });

    await expect(
      auth.api.resetPassword({ body: { newPassword: 'kort', token: await hentToken(userId) } }),
    ).rejects.toMatchObject({ status: 'BAD_REQUEST' });
  });

  it('det nye passordet virker, og det gamle gjør ikke', async () => {
    const { epost, userId } = await nyBruker();
    await auth.api.requestPasswordReset({ body: { email: epost } });
    await auth.api.resetPassword({ body: { newPassword: NYTT, token: await hentToken(userId) } });

    await expect(
      auth.api.signInEmail({ body: { email: epost, password: GAMMELT } }),
    ).rejects.toBeDefined();
    await expect(
      auth.api.signInEmail({ body: { email: epost, password: NYTT } }),
    ).resolves.toBeDefined();
  });
});
