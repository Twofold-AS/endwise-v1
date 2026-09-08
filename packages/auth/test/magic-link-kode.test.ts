import { describe, expect, it } from 'vitest';
import {
  erMagicLinkForEpost,
  erMagicLinkVerificationRad,
  genererMagicLinkKode,
  MAGIC_LINK_ENROLL_UTEN_SESJON,
  MAGIC_LINK_ERSTATTET_MELDING,
  MAGIC_LINK_KODE_LENGDE,
  magicLinkVerifySti,
  meldingForMagicLinkFeil,
  normaliserMagicLinkKode,
  visMagicLinkKode,
} from '../src/magic-link.ts';

describe('magic-link-kode', () => {
  it('genererer 5-sifret PIN', () => {
    const kode = genererMagicLinkKode();
    expect(kode).toHaveLength(MAGIC_LINK_KODE_LENGDE);
    expect(MAGIC_LINK_KODE_LENGDE).toBe(5);
    expect(kode).toMatch(/^\d{5}$/);
  });

  it('normaliserer til siffer og viser uten gruppering', () => {
    expect(normaliserMagicLinkKode('48-29 1')).toBe('48291');
    expect(visMagicLinkKode('48291')).toBe('48291');
    expect(visMagicLinkKode('48 291')).toBe('48291');
  });

  it('verify-sti er samme endepunkt som e-postlenka, uten klient-next', () => {
    const sti = magicLinkVerifySti('48-291');
    expect(sti).toMatch(/^\/api\/auth\/magic-link\/verify\?/);
    expect(sti).toMatch(/token=48291/);
    expect(sti).toMatch(/callbackURL=%2Fsignin/);
    expect(sti).not.toMatch(/next=/);
  });

  it('stale/ugyldig token får erstattet-melding', () => {
    expect(meldingForMagicLinkFeil('INVALID_TOKEN')).toBe(MAGIC_LINK_ERSTATTET_MELDING);
    expect(meldingForMagicLinkFeil(null)).toBeNull();
    expect(MAGIC_LINK_ERSTATTET_MELDING).toMatch(/nyeste e-posten/);
    expect(MAGIC_LINK_ERSTATTET_MELDING).not.toMatch(/trykk på linken først/i);
    expect(MAGIC_LINK_ENROLL_UTEN_SESJON).toMatch(/Logg inn først/);
    expect(MAGIC_LINK_ENROLL_UTEN_SESJON).not.toMatch(/Fortsett|forrige er brukt/);
    expect(MAGIC_LINK_ENROLL_UTEN_SESJON).not.toMatch(/trykk på linken først/i);
    expect(MAGIC_LINK_ENROLL_UTEN_SESJON).not.toMatch(/nyeste innloggingslenken/);
  });

  it('kjenner igjen magic-link-rader og ikke reset/2fa', () => {
    const verdi = JSON.stringify({ email: 'mikkis@twofold.no' });
    expect(erMagicLinkVerificationRad('abcHash', verdi)).toBe(true);
    expect(erMagicLinkForEpost(verdi, 'MIKKIS@twofold.no')).toBe(true);
    expect(erMagicLinkForEpost(verdi, 'annen@twofold.no')).toBe(false);
    expect(erMagicLinkVerificationRad('reset-password:x', verdi)).toBe(false);
    expect(erMagicLinkVerificationRad('2fa-abc', verdi)).toBe(false);
    expect(erMagicLinkVerificationRad('abcHash', 'ikke-json')).toBe(false);
  });
});
