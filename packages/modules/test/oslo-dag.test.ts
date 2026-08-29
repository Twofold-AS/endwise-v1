import { describe, expect, it } from 'vitest';
import { osloDagsvindu, osloKalenderdag, PRODUKT_TIDSSONE } from '../src/tid.ts';

/**
 * Mikael 29.08.2026 (Europe/Oslo): Timeplan har jobb i dag 29. aug, men
 * viser den på 30. aug — alle jobber ett døgn frem.
 *
 * Rot (visning, ikke lagring): `bookings.starts_at` er timestamptz.
 * Timeplan-stripen gjør `setHours(0,0,0,0)` i nettleseren og sender
 * `toISOString()`. 29. aug 00:00 CEST er `2026-08-28T22:00:00.000Z`.
 * `mechanic.myDay` / gammel `dayWindow` gjør `setHours(0,0,0,0)` i
 * prosess-TZ. På Vercel (UTC) blir vinduet 28. 00:00Z–29. 00:00Z, så
 * 29. aug 08:00 Oslo (06:00Z) faller i stripen merket 30. aug.
 *
 * Samme klasse som #89: produkt-tidssone er Europe/Oslo, ikke UTC.
 */

const JOBB_29_AUG_OSLO = new Date('2026-08-29T06:00:00.000Z'); // 08:00 CEST

/** CEST-klientens Timeplan-stripe for «29. aug» (lokal midnatt → toISOString). */
const STRIPE_29_AUG = '2026-08-28T22:00:00.000Z';
/** Samme stripe for «30. aug». */
const STRIPE_30_AUG = '2026-08-29T22:00:00.000Z';

function iVindu(instant: Date, vindu: { from: Date; to: Date }): boolean {
  return instant >= vindu.from && instant < vindu.to;
}

describe('oslo-kalenderdag — Timeplan +1-dag', () => {
  it('produkt-tidssone er Europe/Oslo, uavhengig av #89', () => {
    expect(PRODUKT_TIDSSONE).toBe('Europe/Oslo');
  });

  it('jobb 29. aug 08:00 Oslo lander på 29. aug, ikke 30.', () => {
    expect(osloKalenderdag(JOBB_29_AUG_OSLO)).toBe('2026-08-29');
    expect(iVindu(JOBB_29_AUG_OSLO, osloDagsvindu('2026-08-29'))).toBe(true);
    expect(iVindu(JOBB_29_AUG_OSLO, osloDagsvindu('2026-08-30'))).toBe(false);
  });

  it('CEST-stripe-ISO for 29. aug eier jobben; 30. aug-stripen gjør det ikke', () => {
    expect(osloKalenderdag(STRIPE_29_AUG)).toBe('2026-08-29');
    expect(iVindu(JOBB_29_AUG_OSLO, osloDagsvindu(STRIPE_29_AUG))).toBe(true);
    expect(iVindu(JOBB_29_AUG_OSLO, osloDagsvindu(STRIPE_30_AUG))).toBe(false);
  });

  it('gammel UTC-dayWindow ville lagt 29. aug-jobben i 30. aug-stripen', () => {
    function utcDayWindow(dateISO: string): { from: Date; to: Date } {
      const from = new Date(dateISO);
      from.setUTCHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setUTCDate(to.getUTCDate() + 1);
      return { from, to };
    }
    expect(iVindu(JOBB_29_AUG_OSLO, utcDayWindow(STRIPE_29_AUG))).toBe(false);
    expect(iVindu(JOBB_29_AUG_OSLO, utcDayWindow(STRIPE_30_AUG))).toBe(true);
  });
});
