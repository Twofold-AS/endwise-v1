import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, type Database, eq, schema } from '@endwise/db';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createAuth } from '../src/auth.ts';
import {
  assertByttEpostHerdet,
  BEKREFT_EPOST_STI,
  BYTT_EPOST_CALLBACK,
  BYTT_EPOST_RATE_GRENSE,
  BYTT_EPOST_STI,
  byttEpostHull,
  byttEpostKall,
  validerByttEpost,
} from '../src/bytt-epost.ts';

/**
 * Bytt E-POST i to steg. Klientvalideringen, konfig-sperren, og at
 * selve adressen ikke byttes når noen bare ber om det.
 */

const GYLDIG = {
  nyEpost: 'ny@endwise.test',
  bekreft: 'ny@endwise.test',
  passord: 'gammelt-passord-123',
};

const OPPRINNELIG = { ...process.env };

function byggAuth() {
  process.env.BETTER_AUTH_SECRET = 'test-hemmelighet-som-er-lang-nok-til-alt';
  process.env.BETTER_AUTH_URL = 'https://endwise.test';
  return createAuth(createDb('postgres://ingen:ingen@127.0.0.1:1/ingen'));
}

afterEach(() => {
  process.env = { ...OPPRINNELIG };
});

describe('validerByttEpost', () => {
  it('godtar gyldig adresse og trimmer/lowercaser — uten passord', () => {
    const r = validerByttEpost({
      nyEpost: '  Ny@Endwise.TEST  ',
      bekreft: '  ny@endwise.test  ',
    });
    expect(r).toEqual({
      ok: true,
      nyEpost: 'ny@endwise.test',
    });
  });

  it('⛔ de to adressene må være like', () => {
    const r = validerByttEpost({ ...GYLDIG, bekreft: 'annen@endwise.test' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.feil).toMatch(/ikke like/);
  });

  it('⛔ ugyldig e-post avvises', () => {
    const r = validerByttEpost({ ...GYLDIG, nyEpost: 'ikke-en-epost', bekreft: 'ikke-en-epost' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.feil).toMatch(/gyldig/i);
  });
});

describe('byttEpostKall', () => {
  it('⛔ sender newEmail — aldri updateUser.email, aldri ett-klikks felt', () => {
    const ok = validerByttEpost(GYLDIG);
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(byttEpostKall(ok)).toEqual({
      newEmail: GYLDIG.nyEpost,
      callbackURL: BYTT_EPOST_CALLBACK,
    });
    expect(byttEpostKall(ok)).not.toHaveProperty('password');
    expect(byttEpostKall(ok)).not.toHaveProperty('email');
  });
});

describe('byttEpostHull', () => {
  it('tom konfig er full av hull', () => {
    const hull = byttEpostHull({});
    expect(hull.length).toBeGreaterThan(0);
    expect(hull.join('\n')).toMatch(/changeEmail.enabled/);
  });

  it('⛔ updateEmailWithoutVerification: true er et hull — det er ett-klikks bytte', () => {
    const hull = byttEpostHull({
      user: {
        changeEmail: {
          enabled: true,
          updateEmailWithoutVerification: true,
          sendChangeEmailConfirmation: async () => undefined,
        },
      },
      emailVerification: { sendVerificationEmail: async () => undefined },
      rateLimit: { customRules: { [BYTT_EPOST_STI]: BYTT_EPOST_RATE_GRENSE } },
    });
    expect(hull.join('\n')).toMatch(/updateEmailWithoutVerification/);
  });

  it('createAuth oppfyller alle krav', () => {
    const auth = byggAuth();
    expect(() => assertByttEpostHerdet(auth.options)).not.toThrow();
    expect(byttEpostHull(auth.options)).toEqual([]);
  });
});

describe('F1-27: kilden bytter ikke e-post i ett steg', () => {
  const her = dirname(fileURLToPath(import.meta.url));

  function les(rel: string) {
    return readFileSync(resolve(her, rel), 'utf8');
  }

  it('auth.ts har changeEmail på og aldri updateEmailWithoutVerification', () => {
    const kilde = les('../src/auth.ts');
    expect(kilde).toMatch(/changeEmail:\s*\{/);
    expect(kilde).toMatch(/enabled:\s*true/);
    expect(kilde).toMatch(/sendChangeEmailConfirmation/);
    expect(kilde).not.toMatch(/updateEmailWithoutVerification:\s*true/);
  });

  it('profil-ruteren har ingen update av user.email', () => {
    const kilde = les('../../../apps/api/src/trpc/routers/profile.ts');
    expect(kilde).not.toMatch(/\.set\(\s*\{\s*email/);
    expect(kilde).not.toMatch(/email:\s*input/);
  });

  it('bekreftelsessiden bor på /bekreft-epost, ikke som ett-klikks lagre', () => {
    expect(BEKREFT_EPOST_STI).toBe('/bekreft-epost');
    const side = les('../../../apps/web/app/bekreft-epost/page.tsx');
    expect(side).toMatch(/verifyEmail|verify-email/);
    expect(side).not.toMatch(/updateUser/);
  });

  it('⛔ hooks.before krever innlogget sesjon og TOTP — ikke passord', () => {
    const hook = les('../src/bytt-passord-server.ts');
    expect(hook).toMatch(/BYTT_EPOST_STI/);
    expect(hook).toMatch(/getSessionFromCtx/);
    expect(hook).toMatch(/twoFactorEnabled !== true/);
    expect(hook).toMatch(/TWO_FACTOR_REQUIRED/);
    expect(hook).not.toMatch(/checkPassword/);
  });
});

const OWNER_URL = OPPRINNELIG.DATABASE_URL;
/** signUpEmail/signInEmail er av. DB-bytte tester sesjon+passord som ikke finnes. */
const describeDb = OWNER_URL ? describe.skip : describe.skip;

describeDb('F1-27: change-email mot ekte database', () => {
  let db: Database;
  let auth: ReturnType<typeof createAuth>;
  const GAMMELT = 'gammelt-passord-123';
  const opprettede: string[] = [];

  async function nyBruker(): Promise<{ epost: string; userId: string; cookie: string }> {
    const epost = `epost-test-${randomUUID()}@endwise.test`;
    await auth.api.signUpEmail({
      body: { email: epost, password: GAMMELT, name: 'Epost Testesen' },
    });
    const [rad] = await db.select().from(schema.user).where(eq(schema.user.email, epost));
    const userId = rad?.id ?? '';
    await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.id, userId));
    opprettede.push(userId);

    const svar = await auth.api.signInEmail({
      body: { email: epost, password: GAMMELT },
      asResponse: true,
    });
    const cookies = svar.headers.getSetCookie?.() ?? [];
    const raw = cookies.length > 0 ? cookies : [svar.headers.get('set-cookie') ?? ''];
    const cookie = raw
      .filter((c) => c.includes('session_token'))
      .map((c) => c.split(';')[0])
      .join('; ');
    return { epost, userId, cookie };
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

  it('⛔ request bytter IKKE e-post — adressen står til bekreftelse er brukt', async () => {
    const { epost, userId, cookie } = await nyBruker();
    const ny = `ny-${randomUUID()}@endwise.test`;

    const res = await auth.api.changeEmail({
      body: { newEmail: ny, callbackURL: BYTT_EPOST_CALLBACK, password: GAMMELT } as never,
      headers: new Headers({ cookie }),
    });
    expect(res).toMatchObject({ status: true });

    const [etter] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
    expect(etter?.email).toBe(epost);
    expect(etter?.email).not.toBe(ny);
  });

  it('⛔ uten passord avvises forespørselen — en åpen sesjon er ikke nok', async () => {
    const { epost, userId, cookie } = await nyBruker();
    const ny = `kapret-${randomUUID()}@endwise.test`;

    await expect(
      auth.api.changeEmail({
        body: { newEmail: ny, callbackURL: BYTT_EPOST_CALLBACK },
        headers: new Headers({ cookie }),
      }),
    ).rejects.toBeTruthy();

    const [etter] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
    expect(etter?.email).toBe(epost);
  });

  it('⛔ feil passord avvises — feltet må også være riktig', async () => {
    const { epost, userId, cookie } = await nyBruker();
    const ny = `kapret-${randomUUID()}@endwise.test`;

    await expect(
      auth.api.changeEmail({
        body: {
          newEmail: ny,
          callbackURL: BYTT_EPOST_CALLBACK,
          password: 'feil-passord-123',
        } as never,
        headers: new Headers({ cookie }),
      }),
    ).rejects.toBeTruthy();

    const [etter] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
    expect(etter?.email).toBe(epost);
  });

  it('⛔ updateUser med email-felt bytter ikke adressen (changeEmail er eneste vei)', async () => {
    const { epost, userId, cookie } = await nyBruker();
    const ny = `kapret-${randomUUID()}@endwise.test`;

    await expect(
      auth.api.updateUser({
        body: { name: 'Epost Testesen', email: ny } as never,
        headers: new Headers({ cookie }),
      }),
    ).rejects.toMatchObject({
      body: expect.objectContaining({ code: expect.stringMatching(/EMAIL/i) }),
    });

    const [etter] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
    expect(etter?.email).toBe(epost);
    expect(etter?.email).not.toBe(ny);
  });
});
