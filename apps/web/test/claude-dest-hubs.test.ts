import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ansattePageSub,
  ansattInitialer,
  ansattVaktLabel,
  sorterAnsatteEtterVakt,
} from '../app/(app)/_innbygging/ansatt-vakt';
import {
  BUTIKK_HUB_TAK,
  butikkPageSub,
  butikkSeAlleKjoretoy,
  butikkSeAlleVarer,
  hubForhandsvisning,
  visSeAlle,
} from '../app/(app)/_innbygging/butikk-hub';
import {
  grupperKunderAlfa,
  jobbRadUndertekst,
  KUNDE_ALFA,
  KUNDE_SIDE_STORRELSE,
  kjoretoyRadTittel,
  kjoretoyRadUndertekst,
  kundeAlfaNokkel,
  kundeInitialer,
  kunderAngreTekst,
  kunderPagerTekst,
  kunderPageSub,
  kunderTomTekst,
  meldingTraadStatus,
} from '../app/(app)/_innbygging/kunder-katalog';
import {
  LAGER_HUB_LENKER,
  LAGER_HUB_STATUS,
  lagerBestillSub,
  lagerPageSub,
} from '../app/(app)/_innbygging/lager-hub';

const her = dirname(fileURLToPath(import.meta.url));
function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

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
    expect(kunderAngreTekst('Kari Nordmann')).toBe('Kari Nordmann er slettet');
    expect(KUNDE_SIDE_STORRELSE).toBe(20);
    expect(grupperKunderAlfa([{ name: 'Kari' }, { name: 'Åse' }]).map((g) => g.bokstav)).toEqual([
      'K',
      'Å',
    ]);
    expect(jobbRadUndertekst('2026-09-20T08:30:00', 'Kari')).toMatch(/kl\./);
    expect(jobbRadUndertekst('2026-09-20T08:30:00', 'Kari')).toMatch(/Kari/);
    expect(meldingTraadStatus(3)).toBe('Gruppesamtale');
    expect(meldingTraadStatus(2)).toBe('Åpen samtale');
    expect(meldingTraadStatus(2, true)).toBe('Løst');
    expect(kjoretoyRadTittel('Yamaha', 'MT-07', 'MC')).toBe('Yamaha MT-07');
    expect(kjoretoyRadUndertekst('MC', 2021, 'AB12345')).toBe('MC · 2021 · AB12345');
    expect(kjoretoyRadUndertekst('MC', 2021, null)).toBe('MC · 2021 · uten reg.nr');
  });

  it('alfaindeks er høyre side-rail, aldri wrap under søk', () => {
    const liste = les('../app/(app)/_innbygging/kunder-liste.tsx');
    expect(liste).toMatch(/data-kunde-alfa/);
    expect(liste).toMatch(/data-kunder-viewport/);
    expect(liste).toMatch(/absolute top-0 right-1 bottom-0/);
    expect(liste).toMatch(/w-\[26px\]/);
    expect(liste).toMatch(/flex-col/);
    expect(liste).toMatch(/pr-\[30px\]/);
    expect(liste).toMatch(/min-h-\[540px\]/);
    expect(liste).toMatch(/overflow-hidden/);
    expect(liste).toMatch(/font-bold/);
    expect(liste).toMatch(/font-medium/);
    expect(liste).toMatch(/text-\[11px\]/);
    expect(liste).toMatch(/bg-transparent/);
    expect(liste).not.toMatch(/flex-wrap gap-1/);
    const alfaStart = liste.indexOf('data-kunde-alfa');
    const sokStart = liste.indexOf('data-kunder-sok');
    expect(sokStart).toBeGreaterThan(-1);
    expect(alfaStart).toBeGreaterThan(sokStart);
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
    expect(LAGER_HUB_LENKER.map((l) => l.label)).toEqual([
      'Deler',
      'Inn- og utlogg',
      'Bestill deler',
      'Kjøretøy til salgs',
    ]);
    expect(LAGER_HUB_LENKER.map((l) => l.sub)).toEqual([
      'Beholdning, plassering og minimum',
      'Siste bevegelser på lageret',
      'Under minimum',
      'Beholdning for salg',
    ]);
    expect(lagerPageSub(18)).toBe('18 delenummer');
    expect(lagerBestillSub(3)).toBe('3 under minimum');
    expect(les('../app/(app)/lager/page.tsx')).toMatch(/Lagerstatus/);
    expect(les('../app/(app)/lager/bevegelser/page.tsx')).toMatch(/Inn- og utlogg/);
  });

  it('Butikk-hub pageSub og 3 + Se alle', () => {
    expect(butikkPageSub(12, 5)).toBe('12 varer · 5 kjøretøy');
    expect(hubForhandsvisning([1, 2, 3, 4], BUTIKK_HUB_TAK)).toEqual([1, 2, 3]);
    expect(visSeAlle(3)).toBe(false);
    expect(visSeAlle(4)).toBe(true);
    expect(butikkSeAlleVarer(12)).toBe('Se alle varer (12)');
    expect(butikkSeAlleKjoretoy(5)).toBe('Se alle kjøretøy (5)');
    expect(les('../app/(app)/butikk/page.tsx')).toMatch(/Varer i nettbutikk/);
    expect(les('../app/(app)/butikk/page.tsx')).toMatch(/data-butikk-ny/);
    expect(les('../app/(app)/butikk/salg/[id]/page.tsx')).toMatch(/Pris/);
    expect(les('../app/(app)/butikk/salg/[id]/page.tsx')).toMatch(/Kjørt/);
    expect(les('../app/(app)/butikk/salg/[id]/page.tsx')).toMatch(/Kanal/);
    expect(les('../app/(app)/butikk/salg/[id]/page.tsx')).toMatch(/Beskrivelse/);
    expect(les('../app/(app)/butikk/salg/[id]/page.tsx')).toMatch(/Rediger annonse/);
  });

  it('Ansatte-rader: På jobb / Av vakt', () => {
    expect(ansattVaktLabel('på_jobb')).toBe('På jobb');
    expect(ansattVaktLabel('opptatt')).toBe('På jobb');
    expect(ansattVaktLabel('fri')).toBe('Av vakt');
    expect(ansattVaktLabel(null)).toBe('Av vakt');
    expect(ansattInitialer('Kari Nordmann')).toBe('KN');
    expect(ansattePageSub(4, 2)).toBe('4 ansatte · 2 på jobb nå');
    expect(
      sorterAnsatteEtterVakt([
        { navn: 'Åse', status: 'fri' },
        { navn: 'Kari', status: 'på_jobb' },
        { navn: 'Ola', status: 'fri' },
      ]).map((r) => r.navn),
    ).toEqual(['Kari', 'Ola', 'Åse']);
    expect(les('../app/(app)/organisasjon/_ansatte.tsx')).toMatch(/data-ansatt-initialer/);
    expect(les('../app/(app)/organisasjon/_ansatte.tsx')).toMatch(/data-ansatt-ny/);
    expect(les('../app/(app)/organisasjon/_ansatte.tsx')).not.toMatch(/sr-only/);
  });
});
