import { describe, expect, it } from 'vitest';
import { forsteSvarMs, medianTall, svarhastighetFraPar } from '../src/messages/svarhastighet.ts';

describe('svarhastighet — median førstesvar', () => {
  it('tom mengde er null, ikke 0', () => {
    expect(medianTall([])).toBeNull();
    expect(svarhastighetFraPar([])).toEqual({ medianMs: null, n: 0 });
  });

  it('ett utvalg er sitt eget median', () => {
    expect(medianTall([12_000])).toBe(12_000);
  });

  it('partall tar midtpunktet av de to midterste', () => {
    expect(medianTall([4, 2, 10, 8])).toBe(6);
  });

  it('oddetall tar midterste etter sortering', () => {
    expect(medianTall([30, 10, 20])).toBe(20);
  });

  it('førstesvar er outbound minus inbound, aldri negativ', () => {
    const inn = new Date('2026-09-01T08:00:00Z');
    const ut = new Date('2026-09-01T08:12:00Z');
    expect(forsteSvarMs(inn, ut)).toBe(12 * 60_000);
    expect(forsteSvarMs(ut, inn)).toBe(0);
  });
});
