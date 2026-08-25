import { describe, expect, it } from 'vitest';
import { AVATAR_HUMOR } from '../src/profil/index.ts';
import {
  MEKANIKER_STATUS_HUMOR,
  MEKANIKER_STATUS_LABEL,
  STATUS_TELLENDE_BOOKING,
  tellerSomBelastning,
  utledMekanikerStatus,
  visningsHumor,
} from '../src/profil/status-humor.ts';

/**
 * F6-19 — STATUS → HUMØR.
 *
 * Avataren på mekaniker-/ansattlista speiler FAKTISKE felt (`mechanics.active`
 * + dagens levende jobber mot `capacity`). Ingen presence, ingen nye kolonner.
 * ⛔ Status overstyrer KUN `humor` i visningen — identitet (form/farge/tone)
 * kommer fra den persistente avataren.
 */
describe('utledMekanikerStatus', () => {
  it('inaktiv mekaniker er fri, uansett jobber', () => {
    expect(utledMekanikerStatus({ aktiv: false, jobberIDag: 0, kapasitet: 1 })).toBe('fri');
    expect(utledMekanikerStatus({ aktiv: false, jobberIDag: 3, kapasitet: 1 })).toBe('fri');
  });

  it('aktiv uten levende jobber i dag er ledig', () => {
    expect(utledMekanikerStatus({ aktiv: true, jobberIDag: 0, kapasitet: 2 })).toBe('ledig');
  });

  it('aktiv med jobber under kapasitet er på jobb', () => {
    expect(utledMekanikerStatus({ aktiv: true, jobberIDag: 1, kapasitet: 2 })).toBe('på_jobb');
  });

  it('aktiv med jobber lik eller over kapasitet er opptatt', () => {
    expect(utledMekanikerStatus({ aktiv: true, jobberIDag: 2, kapasitet: 2 })).toBe('opptatt');
    expect(utledMekanikerStatus({ aktiv: true, jobberIDag: 3, kapasitet: 2 })).toBe('opptatt');
  });
});

describe('status → blobatar-humor (bibliotekets ekte uttrykk)', () => {
  it('ledig er happy, på jobb/opptatt er thinking, fri er idle — ikke sleepy', () => {
    expect(MEKANIKER_STATUS_HUMOR.ledig).toBe('happy');
    expect(MEKANIKER_STATUS_HUMOR.på_jobb).toBe('thinking');
    expect(MEKANIKER_STATUS_HUMOR.opptatt).toBe('thinking');
    expect(MEKANIKER_STATUS_HUMOR.fri).toBe('idle');
    expect(Object.values(MEKANIKER_STATUS_HUMOR)).not.toContain('sleepy');
    expect(Object.values(MEKANIKER_STATUS_HUMOR)).not.toContain('sad');
  });

  it('alle status-humør finnes i det persistente AVATAR_HUMOR-vokabularet', () => {
    for (const humor of Object.values(MEKANIKER_STATUS_HUMOR)) {
      expect(AVATAR_HUMOR).toContain(humor);
    }
  });

  it('norsk label står ved siden av uttrykket — uttrykket er ikke eneste signal', () => {
    expect(MEKANIKER_STATUS_LABEL.ledig).toBe('Ledig');
    expect(MEKANIKER_STATUS_LABEL.på_jobb).toBe('På jobb');
    expect(MEKANIKER_STATUS_LABEL.opptatt).toBe('Opptatt');
    expect(MEKANIKER_STATUS_LABEL.fri).toBe('Fri');
  });

  it('utledet status gir både humor og norsk label', () => {
    const s = utledMekanikerStatus({ aktiv: true, jobberIDag: 0, kapasitet: 1 });
    expect(MEKANIKER_STATUS_HUMOR[s]).toBe('happy');
    expect(MEKANIKER_STATUS_LABEL[s]).toBe('Ledig');
  });
});

describe('visningsHumor', () => {
  it('status vinner når den er satt — det lagrede uttrykket beholdes ellers', () => {
    expect(visningsHumor('wink', 'thinking')).toBe('thinking');
    expect(visningsHumor('wink', null)).toBe('wink');
    expect(visningsHumor(null, 'happy')).toBe('happy');
    expect(visningsHumor(null, null)).toBeNull();
  });
});

describe('hvilke bookinger teller som belastning', () => {
  it('draft, confirmed og in_progress teller — completed/cancelled/no_show gjør det ikke', () => {
    expect(STATUS_TELLENDE_BOOKING).toEqual(['draft', 'confirmed', 'in_progress']);
    expect(tellerSomBelastning('draft')).toBe(true);
    expect(tellerSomBelastning('confirmed')).toBe(true);
    expect(tellerSomBelastning('in_progress')).toBe(true);
    expect(tellerSomBelastning('completed')).toBe(false);
    expect(tellerSomBelastning('cancelled')).toBe(false);
    expect(tellerSomBelastning('no_show')).toBe(false);
  });
});
