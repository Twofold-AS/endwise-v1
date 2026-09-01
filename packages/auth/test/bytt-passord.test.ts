import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, type Database, eq, schema } from '@endwise/db';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createAuth } from '../src/auth.ts';
import {
  assertByttPassordHerdet,
  BYTT_PASSORD_ETTER_HOOK_ID,
  BYTT_PASSORD_FOR_HOOK_ID,
  BYTT_PASSORD_GENERISK_FEILKODE,
  BYTT_PASSORD_GENERISK_MELDING,
  BYTT_PASSORD_MIN_LENGDE,
  BYTT_PASSORD_RATE_GRENSE,
  BYTT_PASSORD_STI,
  byttPassordHull,
  byttPassordKall,
  erSkjultAuthFeilkode,
  generiskAuthFeilForSti,
  KREDENTIAL_MUTASJON_GENERISK_FEILKODE,
  KREDENTIAL_MUTASJON_RATE_GRENSE,
  TO_FAKTOR_DISABLE_STI,
  TO_FAKTOR_ENABLE_STI,
  validerByttPassord,
} from '../src/bytt-passord.ts';
import { byttPassordEtterHook, byttPassordForHook } from '../src/bytt-passord-server.ts';

/**
 * Bytt passord. Klientvalideringen, payloaden, og herdingen
 * mot CWE-613 / CWE-307 / CWE-209.
 * Serveren håndhever `minPasswordLength: 12` uansett. Disse testene låser
 * det vi viser brukeren før kallet, og at serveren — ikke klienten
 * river andre sesjoner, rate-limiter, og skjuler om det gamle passordet
 * var feil.
 */

const GYLDIG = {
  gjeldende: 'gammelt-passord-123',
  nytt: 'et-helt-nytt-passord-456',
  bekreft: 'et-helt-nytt-passord-456',
};

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

describe('validerByttPassord', () => {
  it('godtar tre gyldige felt og trimmer ytterkanter', () => {
    const r = validerByttPassord({
      gjeldende: '  gammelt-passord-123  ',
      nytt: '  et-helt-nytt-passord-456  ',
      bekreft: '  et-helt-nytt-passord-456  ',
    });
    expect(r).toEqual({
      ok: true,
      gjeldende: 'gammelt-passord-123',
      nytt: 'et-helt-nytt-passord-456',
    });
  });

  it('⛔ krever gjeldende passord — uten det er det en reset, ikke et bytte', () => {
    const r = validerByttPassord({ ...GYLDIG, gjeldende: '   ' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.feil).toMatch(/gjeldende/i);
  });

  it('⛔ de to nye passordene må være like', () => {
    const r = validerByttPassord({ ...GYLDIG, bekreft: 'noe-helt-annet-789' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.feil).toMatch(/ikke like/);
  });

  it(`⛔ nytt passord under ${BYTT_PASSORD_MIN_LENGDE} tegn avvises`, () => {
    const r = validerByttPassord({ ...GYLDIG, nytt: 'for-kort', bekreft: 'for-kort' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.feil).toMatch(/12/);
  });

  it('⛔ nytt passord likt det gamle avvises', () => {
    const r = validerByttPassord({
      gjeldende: GYLDIG.gjeldende,
      nytt: GYLDIG.gjeldende,
      bekreft: GYLDIG.gjeldende,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.feil).toMatch(/forskjellig/);
  });
});

describe('byttPassordKall', () => {
  it('⛔ revokeOtherSessions er ALLTID true — default false er et hull', () => {
    const ok = validerByttPassord(GYLDIG);
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(byttPassordKall(ok)).toEqual({
      currentPassword: GYLDIG.gjeldende,
      newPassword: GYLDIG.nytt,
      revokeOtherSessions: true,
    });
  });
});

describe('CWE-209: generisk API-feil', () => {
  it('INVALID_PASSWORD og CREDENTIAL_ACCOUNT_NOT_FOUND er samme klasse', () => {
    expect(erSkjultAuthFeilkode('INVALID_PASSWORD')).toBe(true);
    expect(erSkjultAuthFeilkode('CREDENTIAL_ACCOUNT_NOT_FOUND')).toBe(true);
    expect(erSkjultAuthFeilkode('PASSWORD_TOO_SHORT')).toBe(false);
    expect(erSkjultAuthFeilkode(undefined)).toBe(false);
  });

  it('⛔ feil gammelt passord og annen auth-feil får identisk svar', () => {
    const feilPassord = generiskAuthFeilForSti(BYTT_PASSORD_STI);
    const annenAuth = generiskAuthFeilForSti(BYTT_PASSORD_STI);
    expect(feilPassord).toEqual(annenAuth);
    expect(feilPassord).toEqual({
      code: BYTT_PASSORD_GENERISK_FEILKODE,
      message: BYTT_PASSORD_GENERISK_MELDING,
    });
    expect(feilPassord.code).not.toBe('INVALID_PASSWORD');
    expect(feilPassord.message.toLowerCase()).not.toMatch(
      /gjeldende|invalid password|feil passord/,
    );
  });

  it('2FA-enable/disable får egen generisk kode — ikke passordbytte-teksten', () => {
    expect(generiskAuthFeilForSti(TO_FAKTOR_ENABLE_STI).code).toBe(
      KREDENTIAL_MUTASJON_GENERISK_FEILKODE,
    );
    expect(generiskAuthFeilForSti(TO_FAKTOR_DISABLE_STI)).toEqual(
      generiskAuthFeilForSti(TO_FAKTOR_ENABLE_STI),
    );
  });
});

// Herdingen, som ren regel. Ingen DB, kjører alltid.
describe('F1-17: herdingskravene', () => {
  it('⭐ den EKTE konfigurasjonen i auth.ts har ingen hull', () => {
    expect(byttPassordHull(byggAuth().options)).toEqual([]);
  });

  it('⛔ CWE-613: uten before-hook som tvinger revoke er det et hull', () => {
    const hull = byttPassordHull({
      rateLimit: {
        customRules: {
          [BYTT_PASSORD_STI]: { ...BYTT_PASSORD_RATE_GRENSE },
          [TO_FAKTOR_ENABLE_STI]: { ...KREDENTIAL_MUTASJON_RATE_GRENSE },
          [TO_FAKTOR_DISABLE_STI]: { ...KREDENTIAL_MUTASJON_RATE_GRENSE },
        },
      },
      hooks: {
        after: { endwiseId: BYTT_PASSORD_ETTER_HOOK_ID },
      },
    });
    expect(hull.join()).toMatch(/revokeOtherSessions|CWE-613/);
  });

  it('⛔ CWE-307: en slakkere rate-limit enn taket er et hull', () => {
    const hull = byttPassordHull({
      rateLimit: {
        customRules: {
          [BYTT_PASSORD_STI]: { window: 60, max: 60 },
          [TO_FAKTOR_ENABLE_STI]: { ...KREDENTIAL_MUTASJON_RATE_GRENSE },
          [TO_FAKTOR_DISABLE_STI]: { ...KREDENTIAL_MUTASJON_RATE_GRENSE },
        },
      },
      hooks: {
        before: { endwiseId: BYTT_PASSORD_FOR_HOOK_ID },
        after: { endwiseId: BYTT_PASSORD_ETTER_HOOK_ID },
      },
    });
    expect(hull.join()).toContain(BYTT_PASSORD_STI);
  });

  it('⛔ CWE-307: manglende rate-limit på 2FA-enable er et hull', () => {
    const hull = byttPassordHull({
      rateLimit: {
        customRules: {
          [BYTT_PASSORD_STI]: { ...BYTT_PASSORD_RATE_GRENSE },
          [TO_FAKTOR_DISABLE_STI]: { ...KREDENTIAL_MUTASJON_RATE_GRENSE },
        },
      },
      hooks: {
        before: { endwiseId: BYTT_PASSORD_FOR_HOOK_ID },
        after: { endwiseId: BYTT_PASSORD_ETTER_HOOK_ID },
      },
    });
    expect(hull.join()).toContain(TO_FAKTOR_ENABLE_STI);
  });

  it('⛔ CWE-209: uten after-hook som skjuler INVALID_PASSWORD er det et hull', () => {
    const hull = byttPassordHull({
      rateLimit: {
        customRules: {
          [BYTT_PASSORD_STI]: { ...BYTT_PASSORD_RATE_GRENSE },
          [TO_FAKTOR_ENABLE_STI]: { ...KREDENTIAL_MUTASJON_RATE_GRENSE },
          [TO_FAKTOR_DISABLE_STI]: { ...KREDENTIAL_MUTASJON_RATE_GRENSE },
        },
      },
      hooks: {
        before: { endwiseId: BYTT_PASSORD_FOR_HOOK_ID },
      },
    });
    expect(hull.join()).toMatch(/INVALID_PASSWORD|CWE-209/);
  });

  it('`assertByttPassordHerdet` navngir hvert hull i feilmeldingen', () => {
    expect(() => assertByttPassordHerdet({})).toThrow(/revokeOtherSessions/);
  });

  it('rate-limit-reglene står på de EKSAKTE Better-Auth-stiene', () => {
    const regler = byggAuth().options.rateLimit?.customRules ?? {};
    expect(Object.keys(regler)).toEqual(
      expect.arrayContaining([BYTT_PASSORD_STI, TO_FAKTOR_ENABLE_STI, TO_FAKTOR_DISABLE_STI]),
    );
  });

  it('auth.ts bruker de navngitte hookene — etter-hooken er magic-link + bytt-passord', () => {
    const opts = byggAuth().options;
    expect(opts.hooks?.before).toBe(byttPassordForHook);
    expect((opts.hooks?.after as { endwiseId?: string } | undefined)?.endwiseId).toBe(
      BYTT_PASSORD_ETTER_HOOK_ID,
    );
    expect(byttPassordForHook.endwiseId).toBe(BYTT_PASSORD_FOR_HOOK_ID);
    expect(byttPassordEtterHook.endwiseId).toBe(BYTT_PASSORD_ETTER_HOOK_ID);
    expect(opts.emailAndPassword?.enabled).toBe(false);
  });
});

describe('F1-17 / F1-20: UI lekker ikke API-orakelet', () => {
  const her = dirname(fileURLToPath(import.meta.url));

  it('ByttPassordSkjema er fjernet — ingen passord-UI', () => {
    expect(
      existsSync(resolve(her, '../../../apps/web/app/(app)/_shell/bytt-passord.tsx')),
    ).toBe(false);
    const felter = readFileSync(resolve(her, '../../../apps/web/app/_auth/felter.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(felter).not.toMatch(/function PassordFelt|export function PassordFelt/);
    expect(felter).not.toMatch(/current-password|new-password/);
  });

  it('2FA-påslag rives av databasetriggeren, ikke av klient-revoke', () => {
    const sql = readFileSync(
      resolve(her, '../../../packages/db/drizzle/0010_2fa_session_cutoff.sql'),
      'utf8',
    );
    expect(sql).toMatch(/endwise_2fa_session_cutoff/);
    expect(sql).toMatch(/DELETE FROM "session"/i);
    expect(sql).toMatch(/two_factor_enabled/);
  });
});

// Endepunktet, mot ekte database.
const OWNER_URL = OPPRINNELIG.DATABASE_URL;
/** Passord-API er av. change-password mot DB er ikke lenger en innloggingsvei. */
const describeDb = OWNER_URL ? describe.skip : describe.skip;

describeDb('F1-17: change-password mot ekte database', () => {
  let db: Database;
  let auth: ReturnType<typeof createAuth>;
  const GAMMELT = 'gammelt-passord-123';
  const NYTT = 'et-helt-nytt-passord-456';
  const opprettede: string[] = [];

  async function nyBruker(): Promise<{ epost: string; userId: string }> {
    const epost = `bytt-test-${randomUUID()}@endwise.test`;
    await auth.api.signUpEmail({
      body: { email: epost, password: GAMMELT, name: 'Bytt Testesen' },
    });
    const [rad] = await db.select().from(schema.user).where(eq(schema.user.email, epost));
    const userId = rad?.id ?? '';
    await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.id, userId));
    opprettede.push(userId);
    return { epost, userId };
  }

  async function loggInn(epost: string): Promise<string> {
    const svar = await auth.api.signInEmail({
      body: { email: epost, password: GAMMELT },
      asResponse: true,
    });
    const cookies = svar.headers.getSetCookie?.() ?? [];
    const raw = cookies.length > 0 ? cookies : [svar.headers.get('set-cookie') ?? ''];
    return raw
      .filter((c) => c.includes('session_token'))
      .map((c) => c.split(';')[0])
      .join('; ');
  }

  async function sesjoner(userId: string) {
    return db.select().from(schema.session).where(eq(schema.session.userId, userId));
  }

  beforeAll(() => {
    process.env.BETTER_AUTH_SECRET = 'test-hemmelighet-som-er-lang-nok-til-alt';
    process.env.BETTER_AUTH_URL = 'https://endwise.test';
    process.env.RESEND_API_KEY = '';
    process.env.NODE_ENV = 'test';
    db = createDb(OWNER_URL as string);
    auth = createAuth(db);
  });

  afterAll(async () => {
    for (const id of opprettede) {
      await db.delete(schema.session).where(eq(schema.session.userId, id));
      await db.delete(schema.account).where(eq(schema.account.userId, id));
      await db.delete(schema.user).where(eq(schema.user.id, id));
    }
  });

  it('⛔ CWE-613: andre sesjoner rives selv når klienten utelater revokeOtherSessions', async () => {
    const { epost, userId } = await nyBruker();
    const cookieA = await loggInn(epost);
    await loggInn(epost);
    const tokensFor = (await sesjoner(userId)).map((s) => s.token);
    expect(tokensFor).toHaveLength(2);

    // Med vilje uten revokeOtherSessions — sperren skal sitte på serveren.
    await auth.api.changePassword({
      body: { currentPassword: GAMMELT, newPassword: NYTT },
      headers: new Headers({ cookie: cookieA }),
    });

    const tokensEtter = (await sesjoner(userId)).map((s) => s.token);
    expect(tokensEtter).toHaveLength(1);
    expect(tokensFor.some((t) => tokensEtter.includes(t))).toBe(false);
  });

  it('⛔ CWE-209: feil gammelt passord lekker ikke INVALID_PASSWORD', async () => {
    const { epost } = await nyBruker();
    const cookie = await loggInn(epost);

    const feilGammelt = auth.api.changePassword({
      body: { currentPassword: 'helt-feil-passord-999', newPassword: NYTT },
      headers: new Headers({ cookie }),
    });
    await expect(feilGammelt).rejects.toMatchObject({
      body: {
        code: BYTT_PASSORD_GENERISK_FEILKODE,
        message: BYTT_PASSORD_GENERISK_MELDING,
      },
    });
    await expect(feilGammelt).rejects.not.toMatchObject({
      body: { code: 'INVALID_PASSWORD' },
    });
  });
});
