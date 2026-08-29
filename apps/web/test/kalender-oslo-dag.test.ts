import { describe, expect, it } from 'vitest';
import { osloKalenderdag } from '../app/(app)/_lib/oslo-dag';
import { sammeKalenderdag } from '../app/(app)/dashboard/_pa-jobb';
import { dagensSaker } from '../app/(app)/dashboard/_timeplan-layout';

/**
 * F3-05 / F3-07 / F7-03 — jobb 29. aug Oslo skal ikke lande på 30. aug.
 * Samme case som packages/modules/test/oslo-dag.test.ts (Timeplan-stripen).
 */
const JOBB_29_AUG = {
  id: 'j1',
  startsAt: '2026-08-29T06:00:00.000Z', // 08:00 Europe/Oslo
};

describe('Timeplan / Verkstedet / Jobber — kalenderdag Europe/Oslo', () => {
  it('jobb 29. aug 08:00 Oslo lander på 29. aug, ikke 30.', () => {
    expect(osloKalenderdag(JOBB_29_AUG.startsAt)).toBe('2026-08-29');
    const naa = new Date('2026-08-29T10:00:00.000Z'); // 12:00 CEST
    expect(sammeKalenderdag(JOBB_29_AUG.startsAt, naa)).toBe(true);
    expect(dagensSaker([JOBB_29_AUG], naa).map((j) => j.id)).toEqual(['j1']);
    expect(dagensSaker([JOBB_29_AUG], new Date('2026-08-30T10:00:00.000Z'))).toEqual([]);
  });
});
