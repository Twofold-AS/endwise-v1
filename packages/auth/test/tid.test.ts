import { describe, expect, it } from 'vitest';
import { formaterKlokkeslett, PRODUKT_TIDSSONE } from '../src/tid.ts';

/**
 * F1-16 — utløpsklokke i Europe/Oslo, ikke prosessens UTC.
 * Mikael 29.08.2026 ~07:16 CEST: resetlenka viste «05:46». Det er
 * 05:16 UTC + 30 min skrevet uten tidssone (Vercel er UTC). Samme
 * øyeblikk i Oslo er 07:46. Lagret utløp er riktig; bare visningen.
 */
describe('formaterKlokkeslett (F1-16)', () => {
  it('et kjent UTC-øyeblikk vises som Europe/Oslo (sommertid)', () => {
    const utc = new Date('2026-08-29T05:46:00.000Z');
    expect(PRODUKT_TIDSSONE).toBe('Europe/Oslo');
    expect(formaterKlokkeslett(utc)).toBe('07:46');
    expect(formaterKlokkeslett(utc)).not.toBe('05:46');
  });

  it('vintertid er UTC+1, ikke en hardkodet +2', () => {
    expect(formaterKlokkeslett(new Date('2026-01-15T05:46:00.000Z'))).toBe('06:46');
  });
});
