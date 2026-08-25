import { describe, expect, it } from 'vitest';
import {
  catalogDurationSum,
  endsAtFromDuration,
  formatServiceNames,
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  resolveServiceVersionIds,
  resolveSlotMinutes,
  unionSkills,
  uniqueIds,
} from '../src/booking/lines.ts';

/**
 * F3-09 / P3 — flere tjenester + manuell varighet, uten database.
 * Motoren (booking-engine.test) sjekker skriving når APP_DATABASE_URL er satt.
 */
describe('jobblinjer og varighet', () => {
  it('katalogtid er summen av valgte tjenester', () => {
    expect(catalogDurationSum([60])).toBe(60);
    expect(catalogDurationSum([45, 30, 15])).toBe(90);
    expect(catalogDurationSum([])).toBe(0);
  });

  it('manuell varighet overstyrer katalogen innenfor 5–720 min', () => {
    expect(resolveSlotMinutes(90, 75)).toBe(75);
    expect(resolveSlotMinutes(90, 4)).toBe(90);
    expect(resolveSlotMinutes(90, 721)).toBe(90);
    expect(resolveSlotMinutes(90, null)).toBe(90);
    expect(resolveSlotMinutes(0, undefined)).toBe(MIN_DURATION_MINUTES);
  });

  it('endsAt følger manuell varighet, ikke katalogdefault', () => {
    const start = new Date('2026-08-25T09:00:00Z');
    const catalogEnd = endsAtFromDuration(start, 60);
    const manualEnd = endsAtFromDuration(start, resolveSlotMinutes(60, 90));
    expect(catalogEnd.toISOString()).toBe('2026-08-25T10:00:00.000Z');
    expect(manualEnd.toISOString()).toBe('2026-08-25T10:30:00.000Z');
    expect(manualEnd.getTime() - start.getTime()).toBe(90 * 60_000);
  });

  it('flere tjenester dedupes og beholder rekkefølge', () => {
    expect(resolveServiceVersionIds('a', ['b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    expect(uniqueIds(['', 'x', 'x'])).toEqual(['x']);
  });

  it('ferdigheter fra flere tjenester slås sammen', () => {
    expect(unionSkills([['mc-eu'], ['olje', 'mc-eu'], []])).toEqual(['mc-eu', 'olje']);
  });

  it('jobbnavn er «A + B», aldri ticket', () => {
    expect(formatServiceNames(['EU-kontroll', 'Oljeskift'])).toBe('EU-kontroll + Oljeskift');
    expect(formatServiceNames([null, 'Undersøkelse'])).toBe('Undersøkelse');
    expect(formatServiceNames([])).toBe('Tjeneste');
    expect(MAX_DURATION_MINUTES).toBe(720);
  });
});
