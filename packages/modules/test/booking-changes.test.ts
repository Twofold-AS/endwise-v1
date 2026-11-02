import { describe, expect, it } from 'vitest';
import {
  assertEndringJobSlot,
  EndringSlotError,
  harFeltEndring,
  malFraOnske,
} from '../src/booking/apply-change.ts';
import {
  AVVIK_BEHANDLET_PREFIKS,
  AVVIK_NOTAT_PREFIKS,
  appendEndringNotat,
  encodeEndringOnske,
  FORESPOR_NOTAT_PREFIKS,
  harBehandletEndring,
  harVentendeAvvik,
  harVentendeForespor,
  markerEndringBehandlet,
  parseVentendeOnske,
  stripEndringOnske,
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

  it('koder og parser ønsket tid og mekaniker i notatet', () => {
    const naa = new Date('2026-09-24T10:00:00+02:00');
    const mek = '11111111-1111-4111-8111-111111111111';
    const ut = appendEndringNotat('[AVVIK 12.09] sen', 'forespor', 'Ny tid', naa, {
      startsAt: '2026-09-25T08:00:00.000Z',
      mechanicId: mek,
    });
    expect(ut).toContain(
      encodeEndringOnske({ startsAt: '2026-09-25T08:00:00.000Z', mechanicId: mek }),
    );
    const onske = parseVentendeOnske(ut, 'forespor');
    expect(onske).toEqual({ startsAt: '2026-09-25T08:00:00.000Z', mechanicId: mek });
    expect(utdragEndring(ut, 'forespor')).not.toMatch(/«ew:/);
    expect(stripEndringOnske(ut)).not.toMatch(/«ew:/);
    const behandlet = markerEndringBehandlet(ut, 'forespor', 'godkjent', naa);
    expect(parseVentendeOnske(behandlet, 'forespor')?.mechanicId).toBe(mek);
  });

  it('godkjenn-mål flytter tid og mekaniker, avslå-mål er uendret', () => {
    const naa = {
      startsAt: new Date('2026-09-25T08:00:00.000Z'),
      endsAt: new Date('2026-09-25T09:00:00.000Z'),
      mechanicId: '11111111-1111-4111-8111-111111111111',
    };
    const mal = malFraOnske(naa, {
      startsAt: '2026-09-25T10:00:00.000Z',
      mechanicId: '22222222-2222-4222-8222-222222222222',
    });
    expect(mal.startsAt.toISOString()).toBe('2026-09-25T10:00:00.000Z');
    expect(mal.endsAt.toISOString()).toBe('2026-09-25T11:00:00.000Z');
    expect(mal.mechanicId).toBe('22222222-2222-4222-8222-222222222222');
    expect(harFeltEndring(naa, mal)).toBe(true);
    expect(harFeltEndring(naa, malFraOnske(naa, null))).toBe(false);
  });

  it('jobSlots nekter søndag, opptatt mekaniker og manglende kompetanse', () => {
    const mek = '11111111-1111-4111-8111-111111111111';
    const annen = '22222222-2222-4222-8222-222222222222';
    const mekanikere = [
      { id: mek, active: true, skillKeys: ['mc-eu'] },
      { id: annen, active: true, skillKeys: [] },
    ];
    const mal = {
      startsAt: new Date('2026-09-25T08:00:00+02:00'),
      endsAt: new Date('2026-09-25T09:00:00+02:00'),
      mechanicId: mek,
    };
    expect(() =>
      assertEndringJobSlot({
        mal: {
          startsAt: new Date('2026-09-27T08:00:00+02:00'),
          endsAt: new Date('2026-09-27T09:00:00+02:00'),
          mechanicId: mek,
        },
        mekanikere,
        jobber: [],
        requiredSkills: ['mc-eu'],
      }),
    ).toThrow(EndringSlotError);
    expect(() =>
      assertEndringJobSlot({
        mal: { ...mal, mechanicId: annen },
        mekanikere,
        jobber: [],
        requiredSkills: ['mc-eu'],
      }),
    ).toThrow(EndringSlotError);
    expect(() =>
      assertEndringJobSlot({
        mal,
        mekanikere,
        jobber: [
          {
            mechanicId: mek,
            startsAt: '2026-09-25T08:00:00+02:00',
            endsAt: '2026-09-25T09:00:00+02:00',
            status: 'confirmed',
          },
        ],
        requiredSkills: ['mc-eu'],
      }),
    ).toThrow(EndringSlotError);
    expect(() =>
      assertEndringJobSlot({
        mal,
        mekanikere,
        jobber: [],
        requiredSkills: ['mc-eu'],
      }),
    ).not.toThrow();
  });
});
