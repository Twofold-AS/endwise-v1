import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '@endwise/db';
import { afterEach, describe, expect, it } from 'vitest';
import { createAuth } from '../src/auth.ts';
import {
  MAGIC_LINK_APP_LANDING,
  MAGIC_LINK_BE_OM_STI,
  MAGIC_LINK_CALLBACK,
  MAGIC_LINK_ENROLL_STI,
  MAGIC_LINK_ENROLL_UTEN_SESJON,
  MAGIC_LINK_TOTP_QUERY,
  MAGIC_LINK_TTL_SEKUNDER,
  MAGIC_LINK_VERIFY_STI,
} from '../src/magic-link.ts';
import {
  erTotpFaktiskBundet,
  etterMagicLinkVerify,
  MAGIC_LINK_2FA_HOOK_ID,
} from '../src/magic-link-2fa.ts';

const her = dirname(fileURLToPath(import.meta.url));
const OPPRINNELIG = { ...process.env };

function byggAuth() {
  process.env.BETTER_AUTH_SECRET = 'test-hemmelighet-som-er-lang-nok-til-alt';
  process.env.BETTER_AUTH_URL = 'https://endwise.test';
  return createAuth(createDb('postgres://ingen:ingen@127.0.0.1:1/ingen'));
}

afterEach(() => {
  process.env = { ...OPPRINNELIG };
});

describe('magic link + TOTP (Mons-lås)', () => {
  it('passord er av, magic-link er på, twoFactor har ikke e-post-OTP', () => {
    const opts = byggAuth().options;
    expect(opts.emailAndPassword?.enabled).toBe(false);
    const authKilde = readFileSync(resolve(her, '../src/auth.ts'), 'utf8');
    expect(authKilde).toMatch(/emailAndPassword:\s*\{[\s\S]*enabled:\s*false/);
    expect(authKilde).toMatch(/allowPasswordless:\s*true/);
    expect(authKilde).toMatch(/magicLink\(/);
    expect(authKilde).toMatch(/generateToken:\s*async\s*\(\)\s*=>\s*genererMagicLinkKode/);
    expect(authKilde).not.toMatch(/otpOptions|sendOTP:\s*sendTwoFactorOtp/);
    expect(authKilde).toMatch(/erAuthDestinasjon/);
  });

  it('callback tvinges til /signin — ingen klient-next', () => {
    expect(MAGIC_LINK_CALLBACK).toBe('/signin');
    expect(MAGIC_LINK_TTL_SEKUNDER).toBe(600);
    const hook = readFileSync(resolve(her, '../src/bytt-passord-server.ts'), 'utf8');
    expect(hook).toMatch(/MAGIC_LINK_BE_OM_STI/);
    expect(hook).toMatch(/callbackURL:\s*MAGIC_LINK_CALLBACK/);
    expect(hook).toMatch(/errorCallbackURL:\s*MAGIC_LINK_CALLBACK/);
    expect(hook).toMatch(/slettEldreMagicLinkTokens/);
    const signin = readFileSync(
      resolve(her, '../../../apps/web/app/signin/signin-skjema.tsx'),
      'utf8',
    );
    const invite = readFileSync(
      resolve(her, '../../../apps/web/app/invitasjon/[token]/page.tsx'),
      'utf8',
    );
    expect(signin).toMatch(/callbackURL:\s*['"]\/signin['"]/);
    expect(invite).toMatch(/callbackURL:\s*['"]\/signin['"]/);
    expect(signin).not.toMatch(/searchParams\.get\(['"]next['"]\)/);
    expect(invite).not.toMatch(/searchParams\.get\(['"]next['"]\)/);
  });

  it('uenrollert verify beholder sesjon og lander i appen — ikke /2fa-oppsett', () => {
    expect(etterMagicLinkVerify(false)).toEqual({
      handling: 'behold-sesjon',
      dest: MAGIC_LINK_APP_LANDING,
    });
    expect(MAGIC_LINK_APP_LANDING).toBe('/');
    expect(MAGIC_LINK_APP_LANDING).not.toBe(MAGIC_LINK_ENROLL_STI);
    expect(MAGIC_LINK_ENROLL_STI).toBe('/2fa-oppsett');
    const hook = readFileSync(resolve(her, '../src/magic-link-2fa.ts'), 'utf8');
    const utenKommentar = hook.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(utenKommentar).toMatch(/etterMagicLinkVerify/);
    expect(utenKommentar).toMatch(/erTotpFaktiskBundet/);
    expect(utenKommentar).toMatch(/MAGIC_LINK_APP_LANDING/);
    expect(utenKommentar).not.toMatch(/startEnroll/);
    expect(utenKommentar).not.toMatch(/MAGIC_LINK_ENROLL_STI/);
    expect(utenKommentar).not.toMatch(/ENROLL_COOKIE_NAME/);
  });

  it('enrollert verify river sesjon og setter TOTP-mur', () => {
    expect(etterMagicLinkVerify(true)).toEqual({
      handling: 'totp-mur',
      dest: `${MAGIC_LINK_CALLBACK}?${MAGIC_LINK_TOTP_QUERY}`,
    });
    expect(MAGIC_LINK_2FA_HOOK_ID).toBe('magic-link-krever-totp');
    expect(MAGIC_LINK_VERIFY_STI).toBe('/magic-link/verify');
    expect(MAGIC_LINK_BE_OM_STI).toBe('/sign-in/magic-link');
    expect(MAGIC_LINK_TOTP_QUERY).toBe('steg=totp');
    const hook = readFileSync(resolve(her, '../src/magic-link-2fa.ts'), 'utf8');
    expect(hook).toMatch(/deleteSessionCookie/);
    expect(hook).toMatch(/setNewSession\(null\)/);
    expect(hook).toMatch(/MAGIC_LINK_TOTP_QUERY/);
    expect(hook).not.toMatch(/setSessionCookie/);
  });

  it('leftover unverified enable() er ubundet — sesjon inn, ikke TOTP-mur', async () => {
    const leftover = await erTotpFaktiskBundet(
      async () => ({ secret: 'skjult', verified: false }),
      { id: 'u1', twoFactorEnabled: true },
    );
    expect(leftover).toBe(false);
    expect(etterMagicLinkVerify(leftover).handling).toBe('behold-sesjon');
    expect(etterMagicLinkVerify(leftover).dest).not.toBe(MAGIC_LINK_ENROLL_STI);
    expect(etterMagicLinkVerify(leftover).dest).not.toContain(MAGIC_LINK_TOTP_QUERY);
  });

  it('e-postbytte krever TOTP på, ikke passord', () => {
    const hook = readFileSync(resolve(her, '../src/bytt-passord-server.ts'), 'utf8');
    expect(hook).toMatch(/BYTT_EPOST_STI/);
    expect(hook).toMatch(/twoFactorEnabled !== true/);
    expect(hook).toMatch(/TWO_FACTOR_REQUIRED/);
    expect(hook).toMatch(/verifiserFerskTotpMotHemmelighet/);
  });

  it('flag uten two_factor-rad er ikke enrollert TOTP', async () => {
    await expect(
      erTotpFaktiskBundet(async () => null, { id: 'u1', twoFactorEnabled: true }),
    ).resolves.toBe(false);
    await expect(
      erTotpFaktiskBundet(async () => ({ secret: '' }), { id: 'u1', twoFactorEnabled: true }),
    ).resolves.toBe(false);
    await expect(
      erTotpFaktiskBundet(async () => ({ secret: 'skjult' }), {
        id: 'u1',
        twoFactorEnabled: false,
      }),
    ).resolves.toBe(false);
    await expect(
      erTotpFaktiskBundet(async () => ({ secret: 'skjult' }), {
        id: 'u1',
        twoFactorEnabled: true,
      }),
    ).resolves.toBe(true);
    await expect(
      erTotpFaktiskBundet(async () => ({ secret: 'skjult', verified: false }), {
        id: 'u1',
        twoFactorEnabled: true,
      }),
    ).resolves.toBe(false);
    await expect(
      erTotpFaktiskBundet(async () => ({ secret: 'skjult', verified: true }), {
        id: 'u1',
        twoFactorEnabled: true,
      }),
    ).resolves.toBe(true);
  });

  it('send-hook utløper leftover two_factor og enroll_2fa (signOut er ikke nok)', () => {
    const forHook = readFileSync(resolve(her, '../src/bytt-passord-server.ts'), 'utf8');
    const kake = readFileSync(resolve(her, '../src/magic-link-2fa.ts'), 'utf8');
    expect(forHook).toMatch(/MAGIC_LINK_BE_OM_STI/);
    expect(`${forHook}\n${kake}`).toMatch(/utlopFaktorKaker|maxAge:\s*0/);
    expect(kake).toMatch(/TWO_FACTOR_COOKIE_NAME|two_factor/);
    expect(forHook).toMatch(/utlopFaktorKaker/);
    expect(forHook).toMatch(/ENROLL_COOKIE_NAME|enroll_2fa|utlopFaktorKaker/);
  });

  it('0036 tømmer bare foreldreløse two_factor_enabled, ikke TOTP-hemmelighet', () => {
    const sql = readFileSync(
      resolve(her, '../../../packages/db/drizzle/0036_orphan_two_factor_flag.sql'),
      'utf8',
    );
    const utenKommentar = sql.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(utenKommentar).toMatch(/UPDATE "user" SET two_factor_enabled = false/i);
    expect(utenKommentar).toMatch(/NOT IN \(SELECT user_id FROM two_factor\)/i);
    expect(utenKommentar).not.toMatch(/DELETE FROM "two_factor"/i);
    expect(utenKommentar).not.toMatch(/SET "secret"/i);
    expect(utenKommentar).not.toMatch(/password/i);
  });

  it('0035 tømmer passord-hash, ikke TOTP', () => {
    const sql = readFileSync(
      resolve(her, '../../../packages/db/drizzle/0035_drop_password_hashes.sql'),
      'utf8',
    );
    const utenKommentar = sql.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(utenKommentar).toMatch(/UPDATE "account" SET "password" = NULL/);
    expect(utenKommentar).not.toMatch(/two_factor/);
    expect(utenKommentar).not.toMatch(/DELETE FROM/);
  });

  it('signin og 2fa-oppsett har ingen passordfelt og ingen e-post-OTP', () => {
    const signin = readFileSync(
      resolve(her, '../../../apps/web/app/signin/signin-skjema.tsx'),
      'utf8',
    );
    const oppsett = readFileSync(
      resolve(her, '../../../apps/web/app/2fa-oppsett/page.tsx'),
      'utf8',
    );
    expect(signin).toMatch(/signIn\.magicLink/);
    expect(signin).toMatch(/verifyTotp/);
    expect(signin).toMatch(/SIGNIN_VALG_SKRIV_KODE|Skriv kode manuelt/);
    expect(signin).toMatch(/SIGNIN_VALG_BYTT_KONTO|Bytt konto/);
    expect(signin).toMatch(/Trykk på lenken i e-posten|SIGNIN_VENT_TITTEL/);
    expect(signin).not.toMatch(/Logg inn med magiclink/);
    expect(signin).toMatch(/magicLinkVerifySti/);
    expect(signin).not.toMatch(/type=["']password["']/);
    expect(signin).not.toMatch(/verifyOtp|sendOtp/);
    expect(oppsett).toMatch(/twoFactor\.enable/);
    expect(oppsett).toMatch(/verifyTotp/);
    expect(oppsett).not.toMatch(/type=["']password["']/);
    expect(oppsett).not.toMatch(/sendOtp/);
    expect(oppsett).toMatch(/MAGIC_LINK_ENROLL_UTEN_SESJON/);
    expect(oppsett).toMatch(/samme\s+innboks/);
    expect(oppsett).not.toMatch(/Innloggingslenken må åpnes først/);
    expect(oppsett).not.toMatch(/Rollen din krever/);
    expect(oppsett).toMatch(/useSession/);
    expect(MAGIC_LINK_ENROLL_UTEN_SESJON).toMatch(/Logg inn først/);
    expect(MAGIC_LINK_ENROLL_UTEN_SESJON).not.toMatch(/Fortsett|forrige er brukt/);
  });
});
