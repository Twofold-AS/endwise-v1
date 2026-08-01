import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CryptoConfigError, decryptSecret, encryptSecret, secretsEqual } from '../src/crypto.ts';

/**
 * F1-07 — Envelope-crypto. Rene enhetstester (ingen DB, ingen Docker): kjører
 * overalt. Beviser rundtur, at ingenting lekker i klartekst, og at tukling og
 * feil nøkkel oppdages (AES-256-GCM auth-tag).
 */
describe('envelope-crypto', () => {
  const kek = randomBytes(32);

  it('rundtur: dekryptert = original', () => {
    const secret = 'quick-token-abc123-ÆØÅ';
    const env = encryptSecret(secret, kek);
    expect(decryptSecret(env, kek)).toBe(secret);
  });

  it('ciphertext inneholder ikke klartekst', () => {
    const secret = 'hemmelig-token';
    const env = encryptSecret(secret, kek);
    expect(env).not.toContain(secret);
  });

  it('to krypteringer av samme klartekst gir ulik ciphertext (fersk DEK/IV)', () => {
    const a = encryptSecret('x', kek);
    const b = encryptSecret('x', kek);
    expect(a).not.toBe(b);
  });

  it('feil KEK kan ikke dekryptere', () => {
    const env = encryptSecret('token', kek);
    expect(() => decryptSecret(env, randomBytes(32))).toThrow();
  });

  it('tuklet envelope avvises (auth-tag)', () => {
    const env = JSON.parse(encryptSecret('token', kek));
    const tampered = Buffer.from(env.ciphertext, 'base64');
    tampered[0] ^= 0xff;
    env.ciphertext = tampered.toString('base64');
    expect(() => decryptSecret(JSON.stringify(env), kek)).toThrow();
  });

  it('ugyldig KEK-lengde kaster CryptoConfigError', () => {
    expect(() => encryptSecret('x', randomBytes(16))).toThrow(CryptoConfigError);
  });

  it('secretsEqual: konstant-tids sammenligning', () => {
    expect(secretsEqual('abc', 'abc')).toBe(true);
    expect(secretsEqual('abc', 'abd')).toBe(false);
    expect(secretsEqual('abc', 'abcd')).toBe(false);
  });
});
