import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  SIGNIN_STI,
  SIGNIN_TOTP_STI,
  SIGNIN_VALG_BYTT_KONTO,
  SIGNIN_VALG_SKRIV_KODE,
  SIGNIN_VALG_STI,
  signInFlateFraQuery,
} from '../app/signin/signin-steg.ts';

const her = dirname(fileURLToPath(import.meta.url));

describe('signin-steg: to knapper etter e-post', () => {
  it('tom query er e-postflaten, valg og totp er egne flater', () => {
    expect(signInFlateFraQuery(null)).toBe('epost');
    expect(signInFlateFraQuery('valg')).toBe('valg');
    expect(signInFlateFraQuery('sendt')).toBe('valg');
    expect(signInFlateFraQuery('totp')).toBe('totp');
  });

  it('kanoniske stier', () => {
    expect(SIGNIN_STI).toBe('/signin');
    expect(SIGNIN_VALG_STI).toBe('/signin?steg=valg');
    expect(SIGNIN_TOTP_STI).toBe('/signin?steg=totp');
    expect(SIGNIN_VALG_SKRIV_KODE).toBe('Skriv kode manuelt');
    expect(SIGNIN_VALG_BYTT_KONTO).toBe('Bytt konto');
  });
});

describe('signin-skjema: to knapper, ingen magiclink-knapp', () => {
  const kilde = readFileSync(resolve(her, '../app/signin/signin-skjema.tsx'), 'utf8');

  it('har nøyaktig de to knappetekstene', () => {
    expect(kilde).toContain('Skriv kode manuelt');
    expect(kilde).toContain('Bytt konto');
    expect(kilde).not.toMatch(/Logg inn med magiclink/);
  });

  it('manuell kode treffer samme verify-sti som e-postlenka', () => {
    expect(kilde).toMatch(/magicLinkVerifySti/);
    expect(kilde).toMatch(/normaliserMagicLinkKode/);
    expect(kilde).toMatch(/callbackURL:\s*['"]\/signin['"]/);
    expect(kilde).not.toMatch(/searchParams\.get\(['"]next['"]\)/);
    expect(kilde).not.toMatch(/type=["']password["']/);
    expect(kilde).not.toMatch(/verifyOtp|sendOtp/);
  });

  it('stale-lenke viser erstattet-melding, ikke trykk på linken først', () => {
    expect(kilde).toMatch(/meldingForMagicLinkFeil/);
    expect(kilde).not.toMatch(/trykk på linken først/i);
    expect(kilde).not.toMatch(/Innloggingslenken må åpnes først/);
  });
});
