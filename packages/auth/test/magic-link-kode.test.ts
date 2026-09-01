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
  it('genererer typebar kode uten 0/O/1/I', () => {
    const kode = genererMagicLinkKode();
    expect(kode).toHaveLength(MAGIC_LINK_KODE_LENGDE);
    expect(kode).toMatch(/^[A-Z2-9]+$/);
    expect(kode).not.toMatch(/[01OI]/);
  });

  it('normaliserer og grupperer visning', () => {
    expect(normaliserMagicLinkKode('ab-cd ef')).toBe('ABCDEF');
    expect(visMagicLinkKode('abcdefghijkl')).toBe('ABCD-EFGH-IJKL');
  });

  it('verify-sti er samme endepunkt som e-postlenka, uten klient-next', () => {
    const sti = magicLinkVerifySti('abcd-efgh-ijkl');
    expect(sti).toMatch(/^\/api\/auth\/magic-link\/verify\?/);
    expect(sti).toMatch(/token=ABCDEFGHIJKL/);
    expect(sti).toMatch(/callbackURL=%2Fsignin/);
    expect(sti).not.toMatch(/next=/);
  });

  it('stale/ugyldig token får erstattet-melding', () => {
    expect(meldingForMagicLinkFeil('INVALID_TOKEN')).toBe(MAGIC_LINK_ERSTATTET_MELDING);
    expect(meldingForMagicLinkFeil(null)).toBeNull();
    expect(MAGIC_LINK_ERSTATTET_MELDING).toMatch(/nyeste e-posten/);
    expect(MAGIC_LINK_ERSTATTET_MELDING).not.toMatch(/trykk på linken først/i);
    expect(MAGIC_LINK_ENROLL_UTEN_SESJON).toMatch(/Fortsett/);
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
