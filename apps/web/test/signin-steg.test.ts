import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  SIGNIN_STI,
  SIGNIN_TOTP_STI,
  SIGNIN_VALG_BYTT_KONTO,
  SIGNIN_VALG_MAGICLINK,
  SIGNIN_VALG_SKRIV_KODE,
  SIGNIN_VALG_STI,
  signInFlateFraQuery,
  totpFeltAktivt,
  trengerEnrollForklaring,
} from '../app/signin/signin-steg.ts';

const her = dirname(fileURLToPath(import.meta.url));

describe('signin-steg: uenrollert får aldri kode-vegg', () => {
  it('tom query og ukjent steg er e-postflaten', () => {
    expect(signInFlateFraQuery(null)).toBe('epost');
    expect(signInFlateFraQuery(undefined)).toBe('epost');
    expect(signInFlateFraQuery('foo')).toBe('epost');
  });

  it('valg / sendt / totp viser valgflaten med alle tre valg', () => {
    expect(signInFlateFraQuery('valg')).toBe('valg');
    expect(signInFlateFraQuery('sendt')).toBe('valg');
    expect(signInFlateFraQuery('totp')).toBe('valg');
  });

  it('TOTP-feltet er aktivt bare ved steg=totp (twoFactorEnabled etter magic link)', () => {
    expect(totpFeltAktivt('totp')).toBe(true);
    expect(totpFeltAktivt('valg')).toBe(false);
    expect(totpFeltAktivt(null)).toBe(false);
    expect(trengerEnrollForklaring('valg')).toBe(true);
    expect(trengerEnrollForklaring('totp')).toBe(false);
  });

  it('kanoniske stier', () => {
    expect(SIGNIN_STI).toBe('/signin');
    expect(SIGNIN_VALG_STI).toBe('/signin?steg=valg');
    expect(SIGNIN_TOTP_STI).toBe('/signin?steg=totp');
  });
});

describe('signin-skjema: tre synlige valg, ingen passord, ingen e-post-OTP', () => {
  const kilde = readFileSync(resolve(her, '../app/signin/signin-skjema.tsx'), 'utf8');

  it('har de tre valgene synlige i kilden', () => {
    expect(SIGNIN_VALG_SKRIV_KODE).toBe('Skriv inn kode');
    expect(SIGNIN_VALG_MAGICLINK).toBe('Logg inn med magiclink');
    expect(SIGNIN_VALG_BYTT_KONTO).toBe('Bytt konto');
    expect(kilde).toContain(SIGNIN_VALG_SKRIV_KODE);
    expect(kilde).toContain(SIGNIN_VALG_MAGICLINK);
    expect(kilde).toContain(SIGNIN_VALG_BYTT_KONTO);
  });

  it('uenrollert kode-valg peker på /2fa-oppsett og forklarer bind', () => {
    expect(kilde).toMatch(/TO_FAKTOR_OPPSETT_STI|2fa-oppsett/);
    expect(kilde).toMatch(/ikke bundet en autentikator-app/);
    expect(kilde).toMatch(/trengerEnrollForklaring/);
    expect(kilde).not.toMatch(/setFlate\('totp'\)|setStep\('totp'\)/);
  });

  it('magic link er primær, callback tvinges til /signin', () => {
    expect(kilde).toMatch(/signIn\.magicLink/);
    expect(kilde).toMatch(/callbackURL:\s*['"]\/signin['"]/);
    expect(kilde).not.toMatch(/searchParams\.get\(['"]next['"]\)/);
    expect(kilde).not.toMatch(/type=["']password["']/);
    expect(kilde).not.toMatch(/verifyOtp|sendOtp/);
  });

  it('TOTP-verify krever enrollert steg — ikke TWO_FACTOR_REQUIRED-vegg', () => {
    expect(kilde).toMatch(/if\s*\(!enrollert\)\s*return/);
    expect(kilde).toMatch(/verifyTotp/);
    expect(kilde).toMatch(/destinasjonNarSesjonFeiler/);
  });
});
