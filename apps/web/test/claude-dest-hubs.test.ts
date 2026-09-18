import { describe, expect, it } from 'vitest';
import { ansattVaktLabel } from '../app/(app)/_innbygging/ansatt-vakt';
import {
  BUTIKK_HUB_TAK,
  butikkPageSub,
  hubForhandsvisning,
  visSeAlle,
} from '../app/(app)/_innbygging/butikk-hub';
import {
  grupperKunderAlfa,
  KUNDE_ALFA,
  KUNDE_SIDE_STORRELSE,
  kundeAlfaNokkel,
  kundeInitialer,
  kunderPagerTekst,
  kunderPageSub,
  kunderTomTekst,
} from '../app/(app)/_innbygging/kunder-katalog';
import { LAGER_HUB_LENKER, LAGER_HUB_STATUS } from '../app/(app)/_innbygging/lager-hub';

describe('Claude dest — Kunder-katalog', () => {
  it('initialer · alfa # + A–Å · pageSub · pager · tom søk', () => {
    expect(kundeInitialer('Kari Nordmann')).toBe('KN');
    expect(kundeInitialer('Ola')).toBe('OL');
    expect(kundeAlfaNokkel('Åse Lien')).toBe('Å');
    expect(kundeAlfaNokkel('12 Motors')).toBe('#');
    expect(KUNDE_ALFA[0]).toBe('#');
    expect(KUNDE_ALFA.at(-1)).toBe('Å');
    expect(kunderPageSub(24)).toBe('24 registrerte kunder');
    expect(kunderPagerTekst(0, 20, 24)).toBe('Viser 1–20 av 24');
    expect(kunderPagerTekst(20, 4, 24)).toBe('Viser 21–24 av 24');
    expect(kunderTomTekst(true)).toBe('Ingen kunder matcher søket.');
    expect(KUNDE_SIDE_STORRELSE).toBe(20);
    expect(grupperKunderAlfa([{ name: 'Kari' }, { name: 'Åse' }]).map((g) => g.bokstav)).toEqual([
      'K',
      'Å',
    ]);
  });
});

describe('Claude dest — Lager / Butikk / Ansatte', () => {
  it('Lager-hub har På lager · Tilgjengelig · Reservert · Under minimum', () => {
    expect([...LAGER_HUB_STATUS]).toEqual([
      'På lager',
      'Tilgjengelig',
      'Reservert',
      'Under minimum',
    ]);
    expect(LAGER_HUB_LENKER.map((l) => l.label)).toEqual(['Deler', 'Inn- og utlogg']);
  });

  it('Butikk-hub pageSub og 3 + Se alle', () => {
    expect(butikkPageSub(12, 5)).toBe('12 varer · 5 kjøretøy');
    expect(hubForhandsvisning([1, 2, 3, 4], BUTIKK_HUB_TAK)).toEqual([1, 2, 3]);
    expect(visSeAlle(3)).toBe(false);
    expect(visSeAlle(4)).toBe(true);
  });

  it('Ansatte-rader: På jobb / Av vakt', () => {
    expect(ansattVaktLabel('på_jobb')).toBe('På jobb');
    expect(ansattVaktLabel('opptatt')).toBe('På jobb');
    expect(ansattVaktLabel('fri')).toBe('Av vakt');
    expect(ansattVaktLabel(null)).toBe('Av vakt');
  });
});
