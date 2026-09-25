import { describe, expect, it } from 'vitest';
import {
  AVVIK_BEHANDLET_PREFIKS,
  AVVIK_NOTAT_PREFIKS,
  appendEndringNotat,
  FORESPOR_NOTAT_PREFIKS,
  harBehandletEndring,
  harVentendeAvvik,
  harVentendeForespor,
  markerEndringBehandlet,
  utdragEndring,
} from '../src/booking/changes.ts';

describe('booking-endringer (F7-05 / BIT 3)', () => {
  it('skiller ventende [AVVIK  fra behandlet', () => {
    expect(harVentendeAvvik('[AVVIK 12.09] sen')).toBe(true);
    expect(harVentendeAvvik('[AVVIK-BEHANDLET godkjent 24.09] sen')).toBe(false);
    expect(harBehandletEndring('[AVVIK-BEHANDLET godkjent 24.09] sen')).toBe(true);
    expect(AVVIK_NOTAT_PREFIKS).toBe('[AVVIK ');
    expect(AVVIK_BEHANDLET_PREFIKS).toBe('[AVVIK-BEHANDLET ');
  });

  it('skriver om ventende linje ved godkjenning', () => {
    const naa = new Date('2026-09-24T10:00:00+02:00');
    const ut = markerEndringBehandlet('[AVVIK 12.09.2026, 10:00] sen', 'avvik', 'godkjent', naa);
    expect(ut).toContain(AVVIK_BEHANDLET_PREFIKS);
    expect(ut).toContain('godkjent');
    expect(ut).toContain(' sen');
    expect(harVentendeAvvik(ut)).toBe(false);
    expect(harBehandletEndring(ut)).toBe(true);
  });

  it('legger forespørsel bakerst uten å slette avvik', () => {
    const naa = new Date('2026-09-24T10:00:00+02:00');
    const ut = appendEndringNotat('[AVVIK 12.09] sen', 'forespor', 'Trenger 30 min', naa);
    expect(harVentendeAvvik(ut)).toBe(true);
    expect(harVentendeForespor(ut)).toBe(true);
    expect(ut).toContain(FORESPOR_NOTAT_PREFIKS);
    expect(utdragEndring(ut, 'forespor')).toMatch(/Trenger 30 min/);
  });
});
