import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  hashTeamBekreftelse,
  kodeMatcher,
  teamBekreftelseId,
} from '../src/trpc/routers/team-bekreftelse.ts';

describe('team-bekreftelse', () => {
  it('hasher koden med SHA-256 og matcher timing-safe', () => {
    const kode = '654321';
    expect(hashTeamBekreftelse(kode)).toBe(createHash('sha256').update(kode, 'utf8').digest('hex'));
    expect(kodeMatcher(hashTeamBekreftelse(kode), kode)).toBe(true);
    expect(kodeMatcher(hashTeamBekreftelse(kode), '000000')).toBe(false);
  });

  it('identifikatoren er tenant + leder + mål — ikke koden', () => {
    const id = teamBekreftelseId('t1', 'leder', 'ansatt');
    expect(id).toBe('team-2fa:t1:leder:ansatt');
    expect(id).not.toMatch(/654321/);
  });
});
