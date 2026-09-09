import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV, ORGANISASJON_SEKSJONER } from '../app/(app)/_shell/nav.ts';
import {
  PULSE_AVVIK_HREF,
  PULSE_ENDRINGER_HREF,
  PULSE_FORESPORSEL_HREF,
} from '../app/(app)/_shell/phone-home.ts';
import { erPhoneSideChrome, phoneSideChrome } from '../app/(app)/_shell/phone-side-chrome.ts';
import { RONNY_IDLE } from '../app/(app)/_workshop/ronny-idle.ts';
import {
  parseTimeplanFane,
  TIMEPLAN_AVVIK_HREF,
  TIMEPLAN_FANER,
  TIMEPLAN_FORESPOR_HREF,
  timeplanHref,
} from '../app/(app)/jobber/_faner.ts';
import { kunderHref, parseKunderFane } from '../app/(app)/kunder/_faner.ts';
import { ORG_CHROME_FANER, synligeOrgChrome } from '../app/(app)/organisasjon/_seksjoner.ts';
import {
  parseTjenesterFane,
  TJENESTER_FANER,
  tjenesterHref,
} from '../app/(app)/prisliste/_faner.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function funksjon(kilde: string, navn: string) {
  const start = kilde.indexOf(`export function ${navn}`);
  expect(start).toBeGreaterThan(-1);
  const neste = kilde.slice(start + 1).search(/\nexport function |\nexport const /);
  return neste === -1 ? kilde.slice(start) : kilde.slice(start, start + 1 + neste);
}

describe('CODE-GO Mikael — IA + chrome', () => {
  it('toppkort: ingen Endringer, Modus-plate Avvik/Forespørsler → Timeplan-faner', () => {
    expect(PULSE_AVVIK_HREF).toBe(TIMEPLAN_AVVIK_HREF);
    expect(PULSE_FORESPORSEL_HREF).toBe(TIMEPLAN_FORESPOR_HREF);
    expect(PULSE_AVVIK_HREF).toBe('/jobber?fane=avvik');
    expect(PULSE_FORESPORSEL_HREF).toBe('/jobber?fane=forespor');
    expect(PULSE_ENDRINGER_HREF).toBe('/jobber?fane=avvik');
    expect(timeplanHref('avvik')).toBe('/jobber?fane=avvik');
    expect(timeplanHref('forespor')).toBe('/jobber?fane=forespor');
    expect(timeplanHref('opprett')).toBe('/bookinger/ny');
    expect(parseTimeplanFane('/jobber', 'avvik')).toBe('avvik');
    expect(parseTimeplanFane('/jobber', 'forespor')).toBe('forespor');
    expect(parseTimeplanFane('/bookinger/ny', null)).toBe('opprett');
    expect(TIMEPLAN_FANER.map((f) => f.label)).toEqual([
      'Timeplan',
      'Opprett jobb',
      'Avvik',
      'Forespørsler',
    ]);

    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const hero = funksjon(kort, 'PulseHeroFlate');
    expect(hero).toMatch(/data-pulse-del="1"/);
    expect(hero).toMatch(/PulseDagSirkel/);
    expect(hero).toMatch(/PulseValgLenke/);
    expect(kort).toMatch(/ew-modus-plate/);
    expect(hero).not.toMatch(/PulseEndringerLenke/);
    expect(hero).not.toMatch(/Endringer/);
    expect(hero).toMatch(/PULSE_AVVIK_HREF/);
    expect(hero).toMatch(/PULSE_FORESPORSEL_HREF/);
    expect(les('../app/(app)/avvik/page.tsx')).toMatch(/jobber\?fane=avvik/);
    expect(les('../app/(app)/timeplan/endringer/page.tsx')).toMatch(/jobber\?fane=avvik/);
  });

  it('Jobb-rad: etikett venstre, ikon flush høyre', () => {
    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const jobb = funksjon(kort, 'PulseJobbFlis');
    expect(jobb).toMatch(/justify-between/);
    expect(jobb.indexOf('>Jobb<')).toBeGreaterThan(-1);
    expect(jobb.indexOf('>Jobb<')).toBeLessThan(jobb.indexOf('PulseIkonFlate'));
  });

  it('Timeplan/Kunder/Tjenester/Org deler Innstillinger-chrome', () => {
    expect(erPhoneSideChrome('/jobber')).toBe(true);
    expect(erPhoneSideChrome('/bookinger/ny')).toBe(true);
    expect(erPhoneSideChrome('/kunder')).toBe(true);
    expect(erPhoneSideChrome('/prisliste')).toBe(true);
    expect(erPhoneSideChrome('/organisasjon')).toBe(true);
    expect(erPhoneSideChrome('/home')).toBe(false);

    const tp = phoneSideChrome(
      '/jobber',
      { get: () => 'avvik' },
      { isAdmin: true, erForhandler: true },
    );
    expect(tp?.tittel).toBe('Timeplan');
    expect(tp?.aktiv).toBe('avvik');
    expect(tp?.faner.map((f) => f.label)).toEqual([
      'Timeplan',
      'Opprett jobb',
      'Avvik',
      'Forespørsler',
    ]);

    const ku = phoneSideChrome(
      '/kunder',
      { get: () => null },
      { isAdmin: true, erForhandler: true },
    );
    expect(ku?.tittel).toBe('Kunder');
    expect(ku?.faner.map((f) => f.label)).toEqual([
      'Alle kunder',
      'Opprett kunde',
      'Registrer kjøretøy',
    ]);
    expect(parseKunderFane('/kunder', 'opprett', null)).toBe('opprett');
    expect(kunderHref('kjoretoy')).toBe('/kunder?fane=kjoretoy');

    const tj = phoneSideChrome(
      '/prisliste',
      { get: () => 'opprett' },
      { isAdmin: true, erForhandler: true },
    );
    expect(tj?.tittel).toBe('Tjenester');
    expect(TJENESTER_FANER.map((f) => f.label)).toEqual(['Alle tjenester', 'Opprett tjenester']);
    expect(parseTjenesterFane('opprett')).toBe('opprett');
    expect(tjenesterHref('opprett')).toBe('/prisliste?fane=opprett');

    const org = phoneSideChrome(
      '/organisasjon',
      { get: () => null },
      { isAdmin: true, erForhandler: true },
    );
    expect(org?.tittel).toBe('Organisasjon');
    expect(org?.faner.map((f) => f.label)).toEqual([
      'Oversikt',
      'Ansatte',
      'Timeplan',
      'Abonnement',
      'Integrasjoner',
    ]);
    expect(synligeOrgChrome(false).map((f) => f.id)).toEqual(['oversikt', 'ansatte', 'timeplan']);
    expect(ORG_CHROME_FANER.find((f) => f.id === 'timeplan')?.href).toBe('/jobber');

    const orgSide = utenKommentarer(les('../app/(app)/organisasjon/page.tsx'));
    expect(orgSide).toMatch(/SideChromeSkall/);
    expect(orgSide).not.toMatch(/OrganisasjonListe/);
  });

  it('desktop dest-piller matcher chrome-fanene', () => {
    const timeplan = FORHANDLER_NAV.find((i) => i.key === 'saker');
    expect(timeplan?.pills?.map((p) => p.label)).toEqual([
      'Timeplan',
      'Opprett jobb',
      'Avvik',
      'Forespørsler',
    ]);
    const kunder = FORHANDLER_NAV.find((i) => i.key === 'kunder');
    expect(kunder?.pills?.map((p) => p.label)).toEqual([
      'Alle kunder',
      'Opprett kunde',
      'Registrer kjøretøy',
    ]);
    const tjenester = FORHANDLER_NAV.find((i) => i.key === 'tjenester');
    expect(tjenester?.pills?.map((p) => p.label)).toEqual(['Alle tjenester', 'Opprett tjenester']);
    expect(ORGANISASJON_SEKSJONER.map((p) => p.label)).toEqual([
      'Oversikt',
      'Ansatte',
      'Timeplan',
      'Abonnement',
      'Integrasjoner',
    ]);
  });

  it('kundeoversikt har Endre-rader og registrer kjøretøy', () => {
    const kort = utenKommentarer(les('../app/(app)/kunder/[id]/page.tsx'));
    expect(kort).toMatch(/KundeEndre/);
    expect(kort).toMatch(/RegistrerKjoretoy/);
    const endre = utenKommentarer(les('../app/(app)/kunder/_endre.tsx'));
    expect(endre).toMatch(/Telefonnummer/);
    expect(endre).toMatch(/Adresse/);
    expect(endre).toMatch(/customers\.update/);
    expect(endre).toMatch(/ADRESSE_PREFIKS/);
    expect(les('../../../apps/api/src/trpc/routers/customers.ts')).toMatch(
      /update: staffProcedure/,
    );
  });

  it('Ronny: åpne øyne, ingen pliss på heureux', () => {
    expect([...RONNY_IDLE]).toEqual(['curieux', 'heureux', 'wink', 'surpris']);
    const expr = les('../../../packages/ui/src/vendor/bloub/expressions.ts');
    expect(expr).toMatch(/id: 'heureux'[\s\S]*pair\(0\.28, 0\.42/);
    expect(expr).not.toMatch(/id: 'heureux'[\s\S]*pair\(0\.27, 0\.17/);
    const bot = utenKommentarer(les('../app/(app)/_workshop/ronny-bot.tsx'));
    expect(bot).toMatch(/wink \? 'wink' : 'idle'/);
    expect(bot).toMatch(/wink \? 'neutre' : ansikt/);
    expect(bot).not.toMatch(/wink \? 'heureux'/);
  });

  it('GO-preview viser chrome-faner og Ronny uten innlogging', () => {
    const preview = utenKommentarer(les('../app/ia-chrome-preview/page.tsx'));
    expect(preview).toMatch(/data-ia-chrome-preview="go"/);
    expect(preview).toMatch(/\/jobber/);
    expect(preview).toMatch(/\/kunder/);
    expect(preview).toMatch(/\/prisliste/);
    expect(preview).toMatch(/\/organisasjon/);
    expect(preview).toMatch(/curieux/);
    expect(preview).toMatch(/heureux/);
    expect(preview).toMatch(/wink/);
    expect(preview).toMatch(/surpris/);
    expect(preview).toMatch(/PulseJobbFlis/);
  });
});
