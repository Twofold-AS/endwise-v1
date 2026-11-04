import { TILLATELSE_NIVA, TILLATELSE_OMRADER } from '@endwise/db';
import { describe, expect, it } from 'vitest';
import {
  harTillatelse,
  kanLedeHandling,
  kanTildele,
  LAGER_NIVA,
  LEDER_HANDLINGER,
  NIVA,
  navHarOmrade,
  nivaDekker,
  OMRADER,
  TILLATELSE_FEIL,
  TILLATELSE_HINT,
  vurderTildeling,
} from '../src/tillatelse/index.ts';

describe('F23 / white label F6a: tillatelser', () => {
  it('dealer_admin og endwise_admin har alt, support og kunde ingenting', () => {
    expect(
      harTillatelse({ rolle: 'dealer_admin', omrade: 'bookinger', trenger: 'endre', gitt: [] }),
    ).toBe(true);
    expect(
      harTillatelse({ rolle: 'endwise_admin', omrade: 'kunder', trenger: 'se', gitt: [] }),
    ).toBe(true);
    expect(
      harTillatelse({ rolle: 'endwise_support', omrade: 'bookinger', trenger: 'se', gitt: [] }),
    ).toBe(false);
    expect(harTillatelse({ rolle: 'customer', omrade: 'bookinger', trenger: 'se', gitt: [] })).toBe(
      false,
    );
  });

  it('ansatt: endre dekker se, se dekker ikke endre, annet område er nei', () => {
    expect(nivaDekker('endre', 'se')).toBe(true);
    expect(nivaDekker('se', 'endre')).toBe(false);
    const gitt = [{ omrade: 'bookinger', niva: 'endre' }];
    expect(harTillatelse({ rolle: 'dealer_staff', omrade: 'bookinger', trenger: 'se', gitt })).toBe(
      true,
    );
    expect(
      harTillatelse({ rolle: 'dealer_staff', omrade: 'bookinger', trenger: 'endre', gitt }),
    ).toBe(true);
    expect(harTillatelse({ rolle: 'dealer_staff', omrade: 'kunder', trenger: 'se', gitt })).toBe(
      false,
    );
  });

  it('ingen kan endre egne tillatelser, Ansatte Endre kan ikke dele ut', () => {
    expect(kanTildele({ aktorRolle: 'dealer_admin', aktorId: 'a', malUserId: 'a' })).toBe(false);
    expect(kanTildele({ aktorRolle: 'dealer_staff', aktorId: 'a', malUserId: 'b' })).toBe(false);
    expect(kanTildele({ aktorRolle: 'dealer_admin', aktorId: 'a', malUserId: 'b' })).toBe(true);
    expect(kanLedeHandling('dealer_staff')).toBe(false);
    expect(kanLedeHandling('dealer_admin')).toBe(true);
    expect(LEDER_HANDLINGER).toContain('tillatelser.dele_ut');
    expect(TILLATELSE_HINT).toBe('Spør daglig leder');
    expect([...OMRADER]).toEqual([...TILLATELSE_OMRADER]);
    expect([...NIVA]).toEqual([...TILLATELSE_NIVA]);
    expect(LAGER_NIVA.se).toContain('listParts');
    expect(LAGER_NIVA.endre).toContain('move');
    expect(navHarOmrade({ rolle: 'dealer_staff', omrade: 'kunder', gitt: null })).toBe(true);
    expect(
      navHarOmrade({
        rolle: 'dealer_staff',
        omrade: 'kunder',
        gitt: [{ omrade: 'bookinger', niva: 'endre' }],
      }),
    ).toBe(false);
    expect(
      vurderTildeling({
        aktorRolle: 'dealer_admin',
        aktorId: 'a',
        malUserId: 'a',
        omrade: 'bookinger',
        niva: 'endre',
      }),
    ).toEqual({ ok: false, grunn: TILLATELSE_FEIL });
    expect(
      vurderTildeling({
        aktorRolle: 'dealer_admin',
        aktorId: 'a',
        malUserId: 'b',
        omrade: 'ukjent',
        niva: 'se',
      }).ok,
    ).toBe(false);
  });
});
