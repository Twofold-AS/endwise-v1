import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV } from '../app/(app)/_shell/nav.ts';
import { PHONE_PROFIL_RAD } from '../app/(app)/_shell/phone-chrome.ts';
import {
  PULSE_AVVIK_HREF,
  PULSE_ENDRINGER_HREF,
  PULSE_FORESPORSEL_HREF,
} from '../app/(app)/_shell/phone-home.ts';
import {
  avvikTeller,
  foresporTeller,
  PULSE_DAG_BUE_START,
  PULSE_DAG_BUE_SWEEP,
} from '../app/(app)/_shell/phone-home-pulse.ts';
import { erPhoneSideChrome, phoneSideChrome } from '../app/(app)/_shell/phone-side-chrome.ts';
import { destinasjonFaner } from '../app/(app)/_shell/seksjon-faner.ts';
import {
  ENDRINGER_DELER,
  parseEndringerDel,
  parseTimeplanFane,
  TIMEPLAN_ENDRINGER_HREF,
  TIMEPLAN_FANER,
  timeplanHref,
} from '../app/(app)/jobber/_faner.ts';

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

describe('CODE-GO Mikael — halvsirkel + Endringer + innboks + org', () => {
  it('toppkort: halvsirkel på teller-rad, Avvik/Forespørsler-boks, Endringer-knapp', () => {
    expect(PULSE_DAG_BUE_START).toBe(Math.PI);
    expect(PULSE_DAG_BUE_SWEEP).toBe(Math.PI);
    expect(PULSE_ENDRINGER_HREF).toBe('/jobber?fane=endringer');
    expect(PULSE_ENDRINGER_HREF).toBe(TIMEPLAN_ENDRINGER_HREF);
    expect(PULSE_AVVIK_HREF).toBe('/jobber?fane=avvik');
    expect(PULSE_FORESPORSEL_HREF).toBe('/jobber?fane=forespor');
    expect(
      avvikTeller([
        { id: '1', status: 'confirmed', startsAt: '2026-09-08T08:00:00', notes: '[AVVIK 12] sen' },
        { id: '2', status: 'confirmed', startsAt: '2026-09-08T09:00:00', notes: null },
      ]),
    ).toBe(1);
    expect(foresporTeller([])).toBe(0);

    const kort = utenKommentarer(les('../app/(app)/_shell/pulse-kort.tsx'));
    const hero = funksjon(kort, 'PulseHeroFlate');
    const sirkel = funksjon(kort, 'PulseDagSirkel');
    expect(sirkel).toMatch(/data-pulse-dag-halvsirkel/);
    expect(sirkel).toMatch(/sweep=\{PULSE_DAG_BUE_SWEEP\}/);
    expect(sirkel).toMatch(/fmtPulseTime/);
    expect(sirkel).toMatch(/PULSE_DAG_FYLL_INK|#141414/);
    expect(sirkel).toMatch(/data-pulse-dag-dither/);
    expect(sirkel).not.toMatch(/data-pulse-dag-naa/);
    expect(sirkel).not.toMatch(/#0066ff/);
    expect(hero).toMatch(/data-pulse-teller-rad/);
    expect(hero).toMatch(/PulseDagSirkel/);
    expect(hero).toMatch(/PulseAvvikForesporBoks/);
    expect(hero).toMatch(/PulseEndringerLenke/);
    expect(hero).not.toMatch(/PulseValgLenke/);
    expect(kort).toMatch(/ew-modus-plate/);
    expect(kort).toMatch(/data-pulse-avvik-boks/);
    expect(kort).toMatch(/CircleQuestionMark/);
    expect(funksjon(kort, 'PulseAvvikForesporBoks')).not.toMatch(/text-danger|text-warn/);
    expect(kort).toMatch(/>Endringer</);
    expect(kort).toMatch(/ArrowUpRight/);
    expect(les('../../../packages/ui/src/vendor/amicro/dither-donut.tsx')).toMatch(
      /sweep\s*=\s*Math\.PI \* 2/,
    );
  });

  it('Timeplan-chrome er Timeplan · Opprett jobb · Endringer', () => {
    expect(TIMEPLAN_FANER.map((f) => f.label)).toEqual(['Timeplan', 'Opprett jobb', 'Endringer']);
    expect(timeplanHref('endringer')).toBe('/jobber?fane=endringer');
    expect(parseTimeplanFane('/jobber', 'avvik')).toBe('endringer');
    expect(parseTimeplanFane('/jobber', 'forespor')).toBe('endringer');
    expect(parseTimeplanFane('/jobber', 'endringer')).toBe('endringer');
    expect(parseEndringerDel('/jobber', 'forespor')).toBe('forespor');
    expect(ENDRINGER_DELER.map((f) => f.label)).toEqual(['Avvik', 'Forespørsler']);
    expect(les('../app/(app)/timeplan/endringer/page.tsx')).toMatch(/jobber\?fane=endringer/);
    expect(les('../app/(app)/jobber/_endringer.tsx')).toMatch(/data-timeplan-endringer-flate/);
    expect(les('../app/(app)/jobber/_endringer.tsx')).toMatch(/data-endringer-fane/);

    const tp = phoneSideChrome(
      '/jobber',
      { get: (k) => (k === 'fane' ? 'endringer' : null) },
      { isAdmin: true, erForhandler: true },
    );
    expect(tp?.tittel).toBe('Timeplan');
    expect(tp?.aktiv).toBe('endringer');
    expect(tp?.faner.map((f) => f.label)).toEqual(['Timeplan', 'Opprett jobb', 'Endringer']);

    expect(
      destinasjonFaner({
        pathname: '/jobber',
        search: 'fane=endringer',
        role: 'dealer_admin',
        shell: 'forhandler',
      }).map((f) => ({ label: f.label, valgt: f.valgt })),
    ).toEqual([
      { label: 'Timeplan', valgt: false },
      { label: 'Opprett jobb', valgt: false },
      { label: 'Endringer', valgt: true },
    ]);

    expect(FORHANDLER_NAV.find((i) => i.key === 'saker')?.pills?.map((p) => p.label)).toEqual([
      'Timeplan',
      'Opprett jobb',
      'Endringer',
    ]);
  });

  it('Innboks er Settings-chrome med egen top-bar 2', () => {
    expect(erPhoneSideChrome('/innboks')).toBe(true);
    const chrome = phoneSideChrome(
      '/innboks',
      { get: () => null },
      {
        isAdmin: true,
        erForhandler: true,
      },
    );
    expect(chrome?.id).toBe('innboks');
    expect(chrome?.bar2).toBe('innboks');
    expect(chrome?.tittel).toBe('Innboks');

    const bar = utenKommentarer(les('../app/(app)/innboks/_top-bar2.tsx'));
    expect(bar).toMatch(/data-innboks-top-bar2/);
    expect(bar).toMatch(/Ny melding/);
    expect(bar).toMatch(/data-innboks-tid/);
    expect(bar).toMatch(/data-innboks-gruppe/);
    expect(bar).toMatch(/data-innboks-slett/);
    expect(bar).not.toMatch(/ChevronDown/);
    expect(bar).toMatch(/Trash2/);
    expect(bar).toMatch(/InboxChromePopup/);
    expect(les('../app/(app)/_shell/inbox-filter.tsx')).toMatch(/label: 'Kunder'/);
    expect(les('../app/(app)/_shell/inbox-filter.tsx')).toMatch(/label: 'Internt'/);
    expect(les('../app/(app)/_shell/inbox-filter.tsx')).toMatch(/label: 'Support'/);

    const popup = utenKommentarer(les('../app/(app)/innboks/_popup.tsx'));
    expect(popup).toMatch(/PHONE_PROFIL_MENY_BREDDE/);
    expect(popup).toMatch(/PHONE_PROFIL_RAD/);
    expect(popup).toMatch(/data-innboks-popup-scrim/);
    expect(popup).toMatch(/fixed inset-0 z-\[70\]/);

    const side = utenKommentarer(les('../app/(app)/innboks/_inbox-sidebar.tsx'));
    expect(side).toMatch(/data-innboks-velg/);
    expect(side).not.toMatch(/InboxSorteringVelger/);
    expect(side).not.toMatch(/ew-modus-plate/);

    const samtale = utenKommentarer(les('../app/(app)/innboks/_ny-samtale.tsx'));
    expect(samtale).toMatch(/data-ny-samtale-knapperad/);
    expect(samtale).toMatch(/NySamtaleKnapperad/);

    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/InboxTopBar2/);
  });

  it('Organisasjon-oversikt er Innstillinger-rader', () => {
    const kort = utenKommentarer(les('../app/(app)/organisasjon/forhandleren/_kort.tsx'));
    expect(kort).toMatch(/data-org-oversikt/);
    expect(kort).toMatch(/OrgRad/);
    expect(kort).not.toMatch(/CardShell/);
    const rad = utenKommentarer(les('../app/(app)/organisasjon/_org-rad.tsx'));
    expect(rad).toMatch(/data-org-rad/);
    expect(rad).toMatch(/Endre/);
    const org = utenKommentarer(les('../app/(app)/organisasjon/page.tsx'));
    expect(org).toMatch(/SideChromeSkall/);
    expect(org).toMatch(/ForhandlerKort/);
  });

  it('profilmeny: Ditt abonnement i 17/700', () => {
    const meny = utenKommentarer(les('../app/(app)/_shell/phone-profil-meny.tsx'));
    expect(meny).toMatch(/Ditt abonnement/);
    expect(meny).not.toMatch(/Oppgrader abonnement/);
    expect(meny).toMatch(/text-\[17px\] font-\[700\]/);
    expect(meny).toMatch(/#0066ff/);
    expect(meny).toMatch(/Twofold/);
    expect(PHONE_PROFIL_RAD).toMatch(/text-\[17px\]/);
    expect(PHONE_PROFIL_RAD).toMatch(/font-\[700\]/);
  });
});
