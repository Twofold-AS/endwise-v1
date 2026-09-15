import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ENDRINGER_MOCK_EKSEMPEL,
  endringerFraBookinger,
  endringTypeFraNotat,
} from '../app/(app)/_innbygging/endringer.ts';
import { lagerStatusFor } from '../app/(app)/_innbygging/lager-katalog.ts';
import { pulseTallCeller } from '../app/(app)/_innbygging/pulse-tall-celler.ts';
import { JOBB_STATUS_LABEL, jobbStatusFraNotat } from '../app/(app)/_innbygging/status-katalog.ts';
import { FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';
import { DEALER_PULSE_KEYS, PULSE_ENDRINGER_HREF } from '../app/(app)/_shell/phone-home.ts';
import { parseTimeplanFane } from '../app/(app)/jobber/_faner.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Claude-innbygging — full content under existing chrome', () => {
  it('chrome urørt: FORHANDLER_NAV og Timeplan-piller uten nye destinasjoner', () => {
    expect(FORHANDLER_NAV.map((i) => i.key)).toEqual([
      'home',
      'innboks',
      'saker',
      'kunder',
      'tjenester',
      'organisasjon',
      'lager',
      'butikk',
    ]);
    const timeplan = FORHANDLER_NAV.find((i) => i.key === 'saker');
    expect(timeplan?.pills?.map((p) => p.label)).toEqual(['Timeplan', 'Opprett jobb', 'Endringer']);
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/data-phone-top-bar="1"/);
    expect(shell).toMatch(/data-phone-top-bar="2"/);
    expect(shell).not.toMatch(/fane=endringer/);
  });

  it('I dag: Endringer nederst som ink-tekst til /jobber?fane=endringer', () => {
    expect(PULSE_ENDRINGER_HREF).toBe('/jobber?fane=endringer');
    expect(parseTimeplanFane('/jobber', 'endringer')).toBe('endringer');
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const heroStart = kort.indexOf('export function PulseHeroFlate');
    const hero = kort.slice(heroStart, kort.indexOf('export function PulseTall', heroStart));
    expect(hero.indexOf('data-pulse-teller-rad')).toBeLessThan(hero.indexOf('PulseEndringerLenke'));
    expect(hero.slice(hero.indexOf('data-pulse-hero-bunn'))).toMatch(/PulseEndringerLenke/);
    expect(kort).toMatch(/text-label/);
    expect(kort).not.toMatch(/border-left|border-l-/);
  });

  it('seks kjernekort består; Tall er #7; +Jobb er ikke hero; Hjelp bare footer', () => {
    expect([...DEALER_PULSE_KEYS]).toEqual([
      'idag',
      'innboks',
      'lager',
      'analyser',
      'team',
      'jobb',
    ]);
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).toMatch(/PulseHeroFlate/);
    expect(hjem).toMatch(/PulseAnalyserKort/);
    expect(hjem).toMatch(/PulseJobbFlis/);
    expect(hjem).toMatch(/PulseTallKort/);
    expect(hjem).toMatch(/PulseTekstFooter/);
    expect(hjem.lastIndexOf('PulseJobbFlis')).toBeLessThan(hjem.lastIndexOf('PulseTallKort'));
    const jobb = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    expect(jobb).toMatch(/data-pulse-timeplan-gulv/);
    expect(jobb).toMatch(/bookinger\/ny/);
    expect(jobb).not.toMatch(/data-verkstedet-hero.*PulseJobbFlis|PulseJobbFlis[\s\S]*hero/);
    const footer = les('../app/(app)/_innbygging/pulse-footer.tsx');
    expect(footer).toMatch(/\/organisasjon/);
    expect(footer).toMatch(/\/hjelp/);
    expect(hjem).not.toMatch(/PHONE_KORT_META\.hjelp/);
  });

  it('Tall 2×2: Visninger · Bookinger · Returer · Credits kun med entitlement', () => {
    expect(pulseTallCeller({ visninger: 1, bookinger: 2, returer: 3 }).map((c) => c.id)).toEqual([
      'visninger',
      'bookinger',
      'returer',
    ]);
    expect(
      pulseTallCeller({ visninger: 1, bookinger: 2, returer: 3, credits: 9 }).map((c) => c.id),
    ).toContain('credits');
    const tall = les('../app/(app)/_innbygging/pulse-tall.tsx');
    expect(tall).toMatch(/grid-cols-2/);
    expect(tall).toMatch(/bg-surface-2/);
    expect(tall).not.toMatch(/#0066ff/);
  });

  it('jobb-statusmerker: katalog uten pip', () => {
    expect(JOBB_STATUS_LABEL.confirmed).toBe('Planlagt');
    expect(JOBB_STATUS_LABEL.in_progress).toBe('Pågår');
    expect(JOBB_STATUS_LABEL.completed).toBe('Ferdig');
    expect(JOBB_STATUS_LABEL.flyttet).toBe('Flyttet');
    expect(JOBB_STATUS_LABEL.avvik).toBe('Avvik');
    expect(JOBB_STATUS_LABEL.foresporsel).toBe('Forespørsel');
    expect(JOBB_STATUS_LABEL.hentet).toBe('Hentet');
    expect(jobbStatusFraNotat('confirmed', '[AVVIK 12:00] sprakk')).toBe('avvik');
    const merke = les('../app/(app)/_innbygging/status-merke.tsx');
    expect(merke).not.toMatch(/border-left|border-l-|pip/);
  });

  it('Endringer-kort: fire typer + Godkjenn/Avslå/Behandlet', () => {
    expect(endringTypeFraNotat('[AVVIK] bytte mekaniker')).toBe('bytte');
    const kort = endringerFraBookinger(
      [
        {
          id: '1',
          status: 'confirmed',
          notes: '[AVVIK 10:00] sprakk dekk',
          serviceName: 'EU',
          regNumber: 'EL1',
          mechanicName: 'Kari',
        },
      ],
      new Map(),
    );
    expect(kort[0]?.type).toBe('avvik');
    expect(ENDRINGER_MOCK_EKSEMPEL.map((k) => k.type)).toEqual([
      'utvidet',
      'bytte',
      'flytte',
      'avvik',
    ]);
    expect(les('../app/(app)/jobber/_endringer.tsx')).toMatch(/TimeplanAlleEndringer/);
    const endringerFlate = les('../app/(app)/jobber/_endringer.tsx');
    expect(endringerFlate).toMatch(/innholdPilleKlasse/);
    expect(endringerFlate).not.toMatch(/border-b-2/);
    const ui = les('../app/(app)/_innbygging/endringer-kort.tsx');
    expect(ui).toMatch(/Godkjenn/);
    expect(ui).toMatch(/Avslå/);
    expect(ui).toMatch(/Behandlet/);
    expect(les('../app/(app)/bookinger/[id]/page.tsx')).toMatch(/MeldAvvikForesporsel/);
  });

  it('Innboks: piller, Uleste først, kjøretøy-hode, deltaker-ark', () => {
    const piller = les('../app/(app)/_innbygging/innboks-piller.tsx');
    expect(piller).toMatch(/Alle/);
    expect(piller).toMatch(/Kunder/);
    expect(piller).toMatch(/Intern/);
    expect(piller).toMatch(/Support/);
    expect(piller).toMatch(/Løst/);
    expect(piller).toMatch(/innholdPilleKlasse/);
    expect(les('../app/(app)/innboks/_top-bar2.tsx')).toMatch(/Uleste først/);
    expect(les('../app/(app)/innboks/[id]/page.tsx')).toMatch(/data-trad-kjoretoy/);
    expect(les('../app/(app)/innboks/[id]/page.tsx')).toMatch(/DeltakerArk/);
    const ark = les('../app/(app)/_innbygging/deltaker-ark.tsx');
    expect(ark).toMatch(/InviterAnsatt/);
    expect(ark).toMatch(/Fjern/);
    expect(ark).toMatch(/Forlat/);
    expect(ark).toMatch(/Marker løst/);
    expect(ark).toMatch(/Gjenåpne/);
  });

  it('Kunder / Lager / Butikk / Org / Ny jobb-flater finnes', () => {
    expect(les('../app/(app)/kunder/page.tsx')).toMatch(/Opprett kunde/);
    expect(les('../app/(app)/kunder/page.tsx')).toMatch(/Legg til kjøretøy/);
    expect(les('../app/(app)/kunder/page.tsx')).toMatch(/data-kunde-kjoretoy-chips/);
    expect(les('../app/(app)/lager/deler/page.tsx')).toMatch(/LagerStatusMerke/);
    expect(les('../app/(app)/lager/deler/page.tsx')).toMatch(/BestillDelArk/);
    expect(les('../app/(app)/lager/deler/page.tsx')).toMatch(/EndreMinimumArk/);
    expect(lagerStatusFor({ underMinimum: true })).toBe('under_minimum');
    expect(lagerStatusFor({ bestilt: true })).toBe('bestilt');
    expect(les('../app/(app)/butikk/page.tsx')).toMatch(/ButikkKjoretoySalg/);
    expect(les('../app/(app)/butikk/page.tsx')).toMatch(/Produktkatalog/);
    expect(les('../app/(app)/organisasjon/_ansatte.tsx')).toMatch(/data-ansatt-tittel/);
    expect(les('../app/(app)/organisasjon/_ansatte.tsx')).toMatch(/data-ansatt-tilgang/);
    expect(les('../app/(app)/organisasjon/_ansatte.tsx')).toMatch(/data-ansatt-kvalifikasjoner/);
    expect(les('../app/(app)/integrasjoner/_innhold.tsx')).toMatch(/InnbyggingIntegrasjonRader/);
    const ny = les('../app/(app)/bookinger/ny/page.tsx');
    expect(ny).toMatch(/Kunde\+kjøretøy/);
    expect(ny).toMatch(/Tjenester\+varighet/);
    expect(ny).toMatch(/Dato\/klokke/);
    expect(ny).toMatch(/Bekreft/);
    expect(ny).toMatch(/Suspense/);
    expect(ny).toMatch(/data-ny-jobb-bilde/);
  });
});
