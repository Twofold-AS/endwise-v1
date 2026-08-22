import { describe, expect, it } from 'vitest';
import {
  BYTT_PASSORD_MIN_LENGDE,
  byttPassordKall,
  validerByttPassord,
} from '../src/bytt-passord.ts';

/**
 * F1-17 — BYTT PASSORD. Klientvalideringen og payloaden, som ren regel.
 *
 * Serveren håndhever `minPasswordLength: 12` uansett. Disse testene låser
 * det vi viser brukeren FØR kallet, og at andre sesjoner alltid rives.
 */

const GYLDIG = {
  gjeldende: 'gammelt-passord-123',
  nytt: 'et-helt-nytt-passord-456',
  bekreft: 'et-helt-nytt-passord-456',
};

describe('validerByttPassord', () => {
  it('godtar tre gyldige felt og trimmer ytterkanter', () => {
    const r = validerByttPassord({
      gjeldende: '  gammelt-passord-123  ',
      nytt: '  et-helt-nytt-passord-456  ',
      bekreft: '  et-helt-nytt-passord-456  ',
    });
    expect(r).toEqual({
      ok: true,
      gjeldende: 'gammelt-passord-123',
      nytt: 'et-helt-nytt-passord-456',
    });
  });

  it('⛔ krever gjeldende passord — uten det er det en reset, ikke et bytte', () => {
    const r = validerByttPassord({ ...GYLDIG, gjeldende: '   ' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.feil).toMatch(/gjeldende/i);
  });

  it('⛔ de to nye passordene må være like', () => {
    const r = validerByttPassord({ ...GYLDIG, bekreft: 'noe-helt-annet-789' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.feil).toMatch(/ikke like/);
  });

  it(`⛔ nytt passord under ${BYTT_PASSORD_MIN_LENGDE} tegn avvises`, () => {
    const r = validerByttPassord({ ...GYLDIG, nytt: 'for-kort', bekreft: 'for-kort' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.feil).toMatch(/12/);
  });

  it('⛔ nytt passord likt det gamle avvises', () => {
    const r = validerByttPassord({
      gjeldende: GYLDIG.gjeldende,
      nytt: GYLDIG.gjeldende,
      bekreft: GYLDIG.gjeldende,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.feil).toMatch(/forskjellig/);
  });
});

describe('byttPassordKall', () => {
  it('⛔ revokeOtherSessions er ALLTID true — default false er et hull', () => {
    const ok = validerByttPassord(GYLDIG);
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(byttPassordKall(ok)).toEqual({
      currentPassword: GYLDIG.gjeldende,
      newPassword: GYLDIG.nytt,
      revokeOtherSessions: true,
    });
  });
});
