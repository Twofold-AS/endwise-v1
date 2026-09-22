import { describe, expect, it } from 'vitest';
import {
  harForesporNotat,
  parseForesporLinje,
  serialiserBehandling,
  serialiserForespor,
  sisteForespor,
} from '../src/booking/endringer-notat.ts';
import {
  computeJobSlots,
  mechanicQualified,
  minutesToLabel,
  openingHoursMinutes,
} from '../src/booking/job-slots.ts';

describe('jobSlots — åpningstid', () => {
  it('hverdag 08–19, lørdag 10–15, søndag stengt', () => {
    expect(openingHoursMinutes(0)).toEqual([480, 1140]);
    expect(openingHoursMinutes(4)).toEqual([480, 1140]);
    expect(openingHoursMinutes(5)).toEqual([600, 900]);
    expect(openingHoursMinutes(6)).toBeNull();
  });

  it('minutesToLabel er 08:00-format', () => {
    expect(minutesToLabel(480)).toBe('08:00');
    expect(minutesToLabel(630)).toBe('10:30');
  });
});

describe('jobSlots — kandidater og 30-min', () => {
  const meks = [
    { id: 'a', name: 'Ada', active: true, skillKeys: ['eu', 'mc'] },
    { id: 'b', name: 'Bo', active: true, skillKeys: ['mc'] },
    { id: 'c', name: 'Cato', active: false, skillKeys: ['eu', 'mc'] },
  ];

  it('ingen slots når søndag eller ingen varighet', () => {
    expect(
      computeJobSlots({
        weekdayMon0: 6,
        durationMinutes: 60,
        requiredSkills: [],
        mechanics: meks,
        busy: [],
      }),
    ).toEqual([]);
    expect(
      computeJobSlots({
        weekdayMon0: 0,
        durationMinutes: 0,
        requiredSkills: [],
        mechanics: meks,
        busy: [],
      }),
    ).toEqual([]);
  });

  it('ingen kvalifisert → tom liste (tilsiktet)', () => {
    expect(
      computeJobSlots({
        weekdayMon0: 0,
        durationMinutes: 60,
        requiredSkills: ['baat'],
        mechanics: meks,
        busy: [],
      }),
    ).toEqual([]);
  });

  it('sertifisering som er utløpt diskvalifiserer', () => {
    expect(
      mechanicQualified(
        { id: 'a', name: 'Ada', active: true, skillKeys: ['eu'], expiredSkillKeys: ['eu'] },
        ['eu'],
      ),
    ).toBe(false);
  });

  it('30-min steg og full varighet må få plass', () => {
    const slots = computeJobSlots({
      weekdayMon0: 5,
      durationMinutes: 120,
      requiredSkills: ['mc'],
      mechanics: meks,
      busy: [],
    });
    expect(slots[0]?.label).toBe('10:00');
    expect(slots[0]?.endLabel).toBe('12:00');
    expect(slots.at(-1)?.label).toBe('13:00');
    expect(slots.every((s) => s.endMin <= 900)).toBe(true);
    expect(slots.every((s) => s.startMin % 30 === 0)).toBe(true);
  });

  it('overlappende jobb blokkerer mekaniker, ikke hele dagen hvis annen er ledig', () => {
    const slots = computeJobSlots({
      weekdayMon0: 0,
      durationMinutes: 60,
      requiredSkills: ['eu'],
      mechanics: meks,
      busy: [{ mechanicId: 'a', startMin: 480, endMin: 600 }],
    });
    expect(slots.find((s) => s.label === '08:00')).toBeUndefined();
    expect(slots.find((s) => s.label === '10:00')?.mechanicIds).toEqual(['a']);
  });
});

describe('endringer-notat', () => {
  it('serialiserer og parser FORESPOR', () => {
    const linje = serialiserForespor({
      type: 'flytte',
      message: 'Kan vi ta onsdag',
      proposedStartsAt: '2026-09-23T08:00:00.000Z',
      proposedMechanicId: '11111111-1111-1111-1111-111111111111',
    });
    expect(harForesporNotat(linje)).toBe(true);
    const parsed = parseForesporLinje(linje);
    expect(parsed?.type).toBe('flytte');
    expect(parsed?.proposedStartsAt).toBe('2026-09-23T08:00:00.000Z');
    expect(sisteForespor(`gammelt\n${linje}`)?.message).toBe('Kan vi ta onsdag');
    expect(serialiserBehandling('godkjent')).toBe('[ENDRING godkjent]');
  });
});
