import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV, ORGANISASJON_SEKSJONER } from '../app/(app)/_shell/nav.ts';
import { DEALER_PULSE_KEYS } from '../app/(app)/_shell/phone-home.ts';
import { TIMEPLAN_FANER } from '../app/(app)/jobber/_faner.ts';
import { INGEN_API as LAGER_INGEN_API, LAGER_HUB_SEKSJONER } from '../app/(app)/lager/_hub.ts';
import {
  aboPageSub,
  ansattePageSub,
  erPaJobbNaa,
  INGEN_API,
  INTEGRASJONER_PAGE_SUB,
  ORG_HUB_SEKSJONER,
} from '../app/(app)/organisasjon/_hub.ts';
import { ORG_CHROME_FANER, parseOrgSeksjon } from '../app/(app)/organisasjon/_seksjoner.ts';
import { TJENESTER_FANER } from '../app/(app)/prisliste/_faner.ts';
import { tjenesterPageSub, trefferTjenesteSok } from '../app/(app)/prisliste/_hub.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Claude Design BIT 7 — Org / Tjenester', () => {
  it('chrome-piller og Bit 1–6-låser er urørt — ingen Claude Tjenester-pille', () => {
    expect(TJENESTER_FANER.map((f) => f.label)).toEqual(['Alle tjenester', 'Opprett tjenester']);
    const tjenester = FORHANDLER_NAV.find((i) => i.key === 'tjenester');
    expect(tjenester?.pills?.map((p) => p.label)).toEqual(['Alle tjenester', 'Opprett tjenester']);
    expect(tjenester?.href).toBe('/prisliste');
    expect(ORGANISASJON_SEKSJONER.map((p) => p.label)).toEqual([
      'Oversikt',
      'Ansatte',
      'Timeplan',
      'Abonnement',
      'Integrasjoner',
    ]);
    expect(ORG_CHROME_FANER.find((f) => f.id === 'timeplan')?.href).toBe('/jobber');
    expect(parseOrgSeksjon('timeplan', true)).toBe('oversikt');
    expect(TIMEPLAN_FANER.map((f) => f.label)).toEqual(['Timeplan', 'Opprett jobb', 'Endringer']);
    expect([...DEALER_PULSE_KEYS]).toEqual([
      'idag',
      'innboks',
      'lager',
      'analyser',
      'team',
      'jobb',
    ]);
    expect(LAGER_HUB_SEKSJONER.map((s) => s.label)).toEqual([
      'Deler',
      'Inn- og utlogg',
      'Bestill deler',
      'Kjøretøy til salgs',
    ]);
    expect(LAGER_INGEN_API).toBe('ingen API');
    const nav = utenKommentarer(les('../app/(app)/_shell/nav.ts'));
    expect(nav).not.toMatch(/label: 'Tjenester',\s*href: '\/tjenester'/);
    expect(FORHANDLER_NAV.some((i) => i.label === 'Tjenester' && i.href === '/tjenester')).toBe(
      false,
    );
  });

  it('Tjenester-liste: søk, pageSub, Ny via eksisterende opprett, live detalj', () => {
    expect(tjenesterPageSub(9)).toBe('9 tjenester tilbys');
    expect(
      trefferTjenesteSok({ name: 'EU-kontroll MC', description: 'EU', vehicleType: 'mc' }, 'eu'),
    ).toBe(true);
    expect(trefferTjenesteSok({ name: 'Service ATV', description: null, vehicleType: 'atv' }, 'båt')).toBe(
      false,
    );
    const flate = utenKommentarer(les('../app/(app)/innstillinger/tjenestekatalog/_flate.tsx'));
    expect(flate).toMatch(/tjenesterPageSub/);
    expect(flate).toMatch(/trefferTjenesteSok/);
    expect(flate).toMatch(/data-tjenester-sok/);
    expect(flate).toMatch(/PhoneSokFelt/);
    expect(flate).toMatch(/services\.list/);
    expect(flate).toMatch(/TjenesteKort/);
    const side = utenKommentarer(les('../app/(app)/prisliste/page.tsx'));
    expect(side).toMatch(/tittel="Tjenester"/);
    expect(side).toMatch(/TJENESTER_FANER/);
    expect(side).toMatch(/NyTjeneste/);
    expect(side).toMatch(/skjulNy/);
    expect(side).not.toMatch(/label: 'Tjenester'/);
    const kort = utenKommentarer(les('../app/(app)/innstillinger/tjenestekatalog/_tjeneste-kort.tsx'));
    expect(kort).toMatch(/durationMinutes/);
    expect(kort).toMatch(/priceMinor/);
    expect(kort).toMatch(/skills/);
    expect(kort).toMatch(/services\.update/);
    const preview = utenKommentarer(les('../app/tjenester-preview/page.tsx'));
    expect(preview).toMatch(/data-tjenester-preview/);
    expect(preview).toMatch(/tjenesterPageSub/);
  });

  it('Org-hub peker på eksisterende destinasjoner — ingen vakt-/Hellanor-live', () => {
    expect(ORG_HUB_SEKSJONER.map((s) => s.label)).toEqual([
      'Ansatte',
      'Timeplan ansatte',
      'Abonnement',
      'Integrasjoner',
    ]);
    expect(ORG_HUB_SEKSJONER.find((s) => s.id === 'ansatte')?.href).toBe(
      '/organisasjon?seksjon=ansatte',
    );
    expect(ORG_HUB_SEKSJONER.find((s) => s.id === 'timeplan')?.href).toBe('/jobber');
    expect(ORG_HUB_SEKSJONER.find((s) => s.id === 'abonnement')?.href).toBe(
      '/organisasjon?seksjon=abonnement',
    );
    expect(ORG_HUB_SEKSJONER.find((s) => s.id === 'integrasjoner')?.href).toBe(
      '/organisasjon?seksjon=integrasjoner',
    );
    expect(ansattePageSub(8, 3)).toBe('8 ansatte · 3 på jobb nå');
    expect(erPaJobbNaa('på_jobb')).toBe(true);
    expect(erPaJobbNaa('opptatt')).toBe(true);
    expect(erPaJobbNaa('ledig')).toBe(false);
    expect(aboPageSub('Pro')).toBe('Nåværende plan: Pro');
    expect(aboPageSub(null)).toBe('Nåværende plan: ikke startet');
    expect(INTEGRASJONER_PAGE_SUB).toBe('Systemer koblet mot Endwise');
    expect(INGEN_API).toBe('ingen API');

    const kort = utenKommentarer(les('../app/(app)/organisasjon/forhandleren/_kort.tsx'));
    expect(kort).toMatch(/data-org-hub/);
    expect(kort).toMatch(/OrgHubSeksjoner/);
    expect(kort).toMatch(/TimeplanAnsatteNotat/);
    expect(kort).toMatch(/Firmaopplysninger/);
    expect(kort).toMatch(/Antall ansatte/);
    expect(kort).toMatch(/forhandler\.get/);
    expect(kort).toMatch(/team\.list/);

    const ansatte = utenKommentarer(les('../app/(app)/organisasjon/_ansatte.tsx'));
    expect(ansatte).toMatch(/ansattePageSub/);
    expect(ansatte).toMatch(/erPaJobbNaa/);
    expect(ansatte).toMatch(/data-ansatte-pagesub/);
    expect(ansatte).toMatch(/INGEN_API/);
    expect(ansatte).toMatch(/team\.fjern/);
    expect(ansatte).toMatch(/competence\.setMechanicSkill/);
    expect(ansatte).not.toMatch(/SHIFTS|Hellanor|Mailchimp/);

    const timeplan = utenKommentarer(les('../app/(app)/organisasjon/_hub-flate.tsx'));
    expect(timeplan).toMatch(/data-org-timeplan-ansatte/);
    expect(timeplan).toMatch(/INGEN_API/);
    expect(timeplan).not.toMatch(/SHIFTS/);

    const abo = utenKommentarer(les('../app/(app)/abonnement/_innhold.tsx'));
    expect(abo).toMatch(/aboPageSub/);
    expect(abo).toMatch(/billing\.plans/);
    expect(abo).toMatch(/billing\.subscription/);

    const integ = utenKommentarer(les('../app/(app)/integrasjoner/_innhold.tsx'));
    expect(integ).toMatch(/INTEGRASJONER_PAGE_SUB/);
    expect(integ).toMatch(/billing\.katalog/);
    expect(integ).not.toMatch(/type="checkbox"|type="switch"/);
    expect(integ).not.toMatch(/Hellanor|Mailchimp/);

    const preview = utenKommentarer(les('../app/org-preview/page.tsx'));
    expect(preview).toMatch(/data-org-preview/);
    expect(preview).toMatch(/ORG_HUB_SEKSJONER/);
    expect(preview).toMatch(/Hellanor\/Mailchimp/);
  });
});
