import { describe, expect, it } from 'vitest';
import { isQuickPullHour, osloHour } from '../src/lib/oslo-time.ts';

/**
 * F8-01 — DST-guard for den planlagte Quick-pullen. Beviser at Vercel Cron
 * (UTC-only) treffer 08:00 og 16:00 Oslo NØYAKTIG to ganger, både vinter (CET,
 * UTC+1) og sommer (CEST, UTC+2). Vercel trigger på UTC-timene 6,7,14,15; kun de
 * som mapper til Oslo 08/16 skal kjøre.
 */
const utc = (month: number, hourUTC: number) => new Date(Date.UTC(2026, month, 15, hourUTC, 0, 0));
const TRIGGERS = [6, 7, 14, 15];

describe('osloHour / isQuickPullHour', () => {
  it('vinter (januar, UTC+1): 07 og 15 UTC → 08 og 16 Oslo', () => {
    expect(TRIGGERS.map((u) => osloHour(utc(0, u)))).toEqual([7, 8, 15, 16]);
    const runs = TRIGGERS.filter((u) => isQuickPullHour(utc(0, u)));
    expect(runs).toEqual([7, 15]);
  });

  it('sommer (juli, UTC+2): 06 og 14 UTC → 08 og 16 Oslo', () => {
    expect(TRIGGERS.map((u) => osloHour(utc(6, u)))).toEqual([8, 9, 16, 17]);
    const runs = TRIGGERS.filter((u) => isQuickPullHour(utc(6, u)));
    expect(runs).toEqual([6, 14]);
  });

  it('nøyaktig to kjøringer per døgn, uansett sesong', () => {
    expect(TRIGGERS.filter((u) => isQuickPullHour(utc(0, u)))).toHaveLength(2);
    expect(TRIGGERS.filter((u) => isQuickPullHour(utc(6, u)))).toHaveLength(2);
  });

  it('en ikke-planlagt time er ikke en pull-time', () => {
    expect(isQuickPullHour(utc(0, 0))).toBe(false); // 01:00 Oslo (vinter)
  });
});
