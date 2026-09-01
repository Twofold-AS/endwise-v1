import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb } from '@endwise/db';
import { afterEach, describe, expect, it } from 'vitest';
import { createAuth } from '../src/auth.ts';
import {
  MAGIC_LINK_BE_OM_STI,
  MAGIC_LINK_CALLBACK,
  MAGIC_LINK_ENROLL_STI,
  MAGIC_LINK_TOTP_QUERY,
  MAGIC_LINK_TTL_SEKUNDER,
  MAGIC_LINK_VERIFY_STI,
} from '../src/magic-link.ts';
import { MAGIC_LINK_2FA_HOOK_ID } from '../src/magic-link-2fa.ts';

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
    expect(authKilde).not.toMatch(/otpOptions|sendOTP:\s*sendTwoFactorOtp/);
  });

  it('callback tvinges til /signin — ingen klient-next', () => {
    expect(MAGIC_LINK_CALLBACK).toBe('/signin');
    expect(MAGIC_LINK_TTL_SEKUNDER).toBe(600);
    const hook = readFileSync(resolve(her, '../src/bytt-passord-server.ts'), 'utf8');
    expect(hook).toMatch(/MAGIC_LINK_BE_OM_STI/);
    expect(hook).toMatch(/callbackURL:\s*MAGIC_LINK_CALLBACK/);
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

  it('etter-hook river sesjon ved TOTP og sender uenrollert til /2fa-oppsett', () => {
    expect(MAGIC_LINK_2FA_HOOK_ID).toBe('magic-link-krever-totp');
    expect(MAGIC_LINK_VERIFY_STI).toBe('/magic-link/verify');
    expect(MAGIC_LINK_BE_OM_STI).toBe('/sign-in/magic-link');
    expect(MAGIC_LINK_TOTP_QUERY).toBe('steg=totp');
    expect(MAGIC_LINK_ENROLL_STI).toBe('/2fa-oppsett');
    const hook = readFileSync(resolve(her, '../src/magic-link-2fa.ts'), 'utf8');
    expect(hook).toMatch(/deleteSessionCookie/);
    expect(hook).toMatch(/twoFactorEnabled !== true/);
    expect(hook).toMatch(/MAGIC_LINK_ENROLL_STI/);
    expect(hook).toMatch(/MAGIC_LINK_TOTP_QUERY/);
  });

  it('e-postbytte krever TOTP på, ikke passord', () => {
    const hook = readFileSync(resolve(her, '../src/bytt-passord-server.ts'), 'utf8');
    expect(hook).toMatch(/BYTT_EPOST_STI/);
    expect(hook).toMatch(/twoFactorEnabled !== true/);
    expect(hook).toMatch(/TWO_FACTOR_REQUIRED/);
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
    expect(signin).not.toMatch(/type=["']password["']/);
    expect(signin).not.toMatch(/verifyOtp|sendOtp/);
    expect(oppsett).toMatch(/twoFactor\.enable/);
    expect(oppsett).toMatch(/verifyTotp/);
    expect(oppsett).not.toMatch(/type=["']password["']/);
    expect(oppsett).not.toMatch(/sendOtp/);
  });
});
