import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  beholdForsteToken,
  lesResetToken,
  resetLenkeFeil,
} from '../app/nytt-passord/reset-token.ts';

/**
 * F1-16 — tokenet skal overleve at sida stryker query-strengen.
 *
 * `useSearchParams` oppdateres når `history.replaceState` fjerner `?token=`.
 * Effekten som leser params må da BEHOLDE det første ikke-tomme tokenet,
 * ellers vises «Denne siden må åpnes fra lenken i e-posten» etter et ekte
 * e-postklikk.
 */
describe('lesResetToken', () => {
  it('leser token (sendResetPassword-navnet)', () => {
    expect(lesResetToken(new URLSearchParams('token=abc123'))).toBe('abc123');
  });

  it('godtar token_hash og hash hvis Better Auth sender dem', () => {
    expect(lesResetToken(new URLSearchParams('token_hash=hash-1'))).toBe('hash-1');
    expect(lesResetToken(new URLSearchParams('hash=hash-2'))).toBe('hash-2');
  });

  it('foretrekker token foran token_hash', () => {
    expect(lesResetToken(new URLSearchParams('token=fra-mail&token_hash=annet'))).toBe('fra-mail');
  });

  it('tom eller manglende query gir null — ikke en tom streng', () => {
    expect(lesResetToken(new URLSearchParams(''))).toBeNull();
    expect(lesResetToken(new URLSearchParams('token='))).toBeNull();
    expect(lesResetToken(new URLSearchParams('token=   '))).toBeNull();
    expect(lesResetToken(null)).toBeNull();
  });
});

describe('beholdForsteToken', () => {
  it('beholder første ikke-tomme token når searchParams tømmes etter strip', () => {
    const fraMail = lesResetToken(new URLSearchParams('token=fra-mail'));
    const etterStrip = lesResetToken(new URLSearchParams(''));
    expect(beholdForsteToken(null, fraMail)).toBe('fra-mail');
    expect(beholdForsteToken('fra-mail', etterStrip)).toBe('fra-mail');
    expect(beholdForsteToken('fra-mail', null)).toBe('fra-mail');
  });

  it('forblir tom uten token — sida åpnet direkte', () => {
    expect(beholdForsteToken(null, null)).toBeNull();
  });
});

describe('resetLenkeFeil', () => {
  it('leser Better Auths error-query uten å kalle et verify-orakel', () => {
    expect(resetLenkeFeil(new URLSearchParams('error=INVALID_TOKEN'))).toBe('INVALID_TOKEN');
    expect(resetLenkeFeil(new URLSearchParams('token=abc'))).toBeNull();
    expect(resetLenkeFeil(null)).toBeNull();
  });
});

describe('F1-16: /nytt-passord tømmer ikke tokenet etter strip', () => {
  const her = dirname(fileURLToPath(import.meta.url));

  it('sida bruker beholdForsteToken og logger aldri tokenet', () => {
    const side = readFileSync(resolve(her, '../app/nytt-passord/page.tsx'), 'utf8');
    expect(side).toMatch(/beholdForsteToken/);
    expect(side).toMatch(/lesResetToken/);
    expect(side).not.toMatch(/setToken\(params\?\.get\(['"]token['"]\) \?\? null\)/);
    expect(side).not.toMatch(/console\.(log|debug|info|warn|error)\([^)]*token/i);
  });

  it('sendResetPassword setter query-navnet token, ikke token_hash', () => {
    const auth = readFileSync(resolve(her, '../../../packages/auth/src/auth.ts'), 'utf8');
    expect(auth).toMatch(/searchParams\.set\(['"]token['"], token\)/);
    expect(auth).not.toMatch(/searchParams\.set\(['"]token_hash['"]/);
  });
});
