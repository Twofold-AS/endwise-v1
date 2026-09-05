import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SHELL_LOGO_PX, SHELL_TOGGLE_PX } from '../app/(app)/_shell/phone-chrome.ts';
import { destinasjonFaner } from '../app/(app)/_shell/seksjon-faner.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Mikael 02.09 03:23 — Tilbake uten ikon, større logo', () => {
  it('Tilbake er pil-SVG uten ordet Tilbake', () => {
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const pil = utenKommentarer(les('../app/(app)/_shell/tilbake-pil.tsx'));
    expect(shell).toMatch(/data-shell-tilbake/);
    expect(shell).toMatch(/TilbakePil/);
    expect(shell).toMatch(/aria-label="Tilbake"/);
    expect(shell).not.toMatch(/ChevronLeft|lucide/);
    expect(pil).toMatch(/<svg/);
    expect(pil).not.toMatch(/>Tilbake</);
    expect(pil).not.toMatch(/lucide|ChevronLeft/);
  });

  it('logo er 24px merke; sidebar-toggle er 16px som nav-ikonene', () => {
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    expect(SHELL_LOGO_PX).toBe(24);
    expect(SHELL_TOGGLE_PX).toBe(16);
    expect(sidebar).toMatch(/const IKON = 16/);
    const header = utenKommentarer(les('../app/(app)/_shell/sidebar-header.tsx'));
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const chrome = utenKommentarer(les('../app/(app)/_shell/phone-chrome.ts'));
    expect(header).toMatch(/SHELL_TOGGLE_PX/);
    expect(shell).toMatch(/SHELL_TOGGLE_PX/);
    expect(header).toMatch(/SHELL_LOGO_PX|width=\{24\}|LOGO = 24/);
    expect(shell).toMatch(/SHELL_LOGO_PX|PHONE_LOGO_PX|width=\{24\}/);
    expect(chrome).toMatch(/SHELL_TOGGLE_PX = 16/);
    expect(chrome).not.toMatch(/SHELL_TOGGLE_PX = 24/);
    expect(header).not.toMatch(/LOGO = 18/);
  });
});

describe('Mikael 02.09 03:23 — top-bar 2 under Ronny på alle destinasjoner', () => {
  it('dealer-layout monterer ikke DestinasjonSeksjonBar; Endwise gjør det', () => {
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    const endwise = utenKommentarer(les('../app/(app)/endwise/layout.tsx'));
    expect(layout).toMatch(/WorkshopBloub/);
    expect(layout).not.toMatch(/DestinasjonSeksjonBar/);
    expect(layout).not.toMatch(/TopBar/);
    expect(endwise).toMatch(/DestinasjonSeksjonBar/);
  });

  it('stripen er h-control / text-label / sidebar-active / surface-2, ikke svarte piller', () => {
    const bar = utenKommentarer(les('../app/(app)/_shell/seksjon-bar.tsx'));
    expect(bar).toMatch(/h-control/);
    expect(bar).toMatch(/text-label/);
    expect(bar).toMatch(/bg-sidebar-active/);
    expect(bar).toMatch(/hover:bg-surface-2/);
    expect(bar).toMatch(/gap-2/);
    expect(bar).toMatch(/overflow-x-auto|flex-wrap/);
    expect(bar).not.toMatch(/bg-fg |bg-black|rounded-full bg-fg/);
    expect(bar).not.toMatch(/PhoneHScroll/);
  });

  it('faner kommer fra nav — org, timeplan, kunder, lager, butikk, endwise, innboks, ensom dest', () => {
    expect(
      destinasjonFaner({
        pathname: '/organisasjon',
        role: 'dealer_admin',
        shell: 'forhandler',
      }).map((f) => f.label),
    ).toEqual(['Oversikt', 'Ansatte', 'Abonnement', 'Integrasjoner']);

    expect(
      destinasjonFaner({
        pathname: '/jobber',
        search: 'visning=kalender',
        role: 'dealer_admin',
        shell: 'forhandler',
      }).map((f) => ({ label: f.label, valgt: f.valgt })),
    ).toEqual([
      { label: 'Liste', valgt: false },
      { label: 'Kalender', valgt: true },
    ]);

    expect(
      destinasjonFaner({
        pathname: '/kunder',
        role: 'dealer_staff',
        shell: 'forhandler',
      }).map((f) => f.label),
    ).toEqual(['Kunder', 'Kjøretøy']);

    expect(
      destinasjonFaner({
        pathname: '/lager/deler',
        role: 'dealer_admin',
        shell: 'forhandler',
      }).map((f) => ({ label: f.label, valgt: f.valgt })),
    ).toEqual([
      { label: 'Oversikt', valgt: false },
      { label: 'Deler', valgt: true },
      { label: 'Plass', valgt: false },
      { label: 'Inn og ut', valgt: false },
    ]);

    expect(
      destinasjonFaner({
        pathname: '/butikk/kasse',
        role: 'dealer_admin',
        shell: 'forhandler',
        shopEnabled: true,
      }).map((f) => f.label),
    ).toEqual(['Katalog', 'Handlekurv / kasse']);

    expect(
      destinasjonFaner({
        pathname: '/endwise/forhandlere',
        role: 'endwise_admin',
        shell: 'endwise',
      }).map((f) => f.label),
    ).toEqual(['Oversikt', 'Innboks', 'Forhandlere', 'Team', 'Hjelpeartikler', 'Flagg']);

    expect(
      destinasjonFaner({
        pathname: '/innboks',
        role: 'dealer_admin',
        shell: 'forhandler',
        inboxPart: 'customer_dealer',
      }).map((f) => ({ label: f.label, valgt: f.valgt })),
    ).toEqual([
      { label: 'Alle chatter', valgt: false },
      { label: 'Kunder', valgt: true },
      { label: 'Intern', valgt: false },
      { label: 'Endwise', valgt: false },
    ]);

    expect(
      destinasjonFaner({
        pathname: '/dashboard',
        role: 'dealer_admin',
        shell: 'forhandler',
      }),
    ).toEqual([]);

    expect(
      destinasjonFaner({
        pathname: '/prisliste',
        role: 'dealer_admin',
        shell: 'forhandler',
      }),
    ).toEqual([{ label: 'Tjenester', href: '/prisliste', valgt: true }]);
  });
});

describe('Mikael 02.09 03:23 — Ny melding er eget SVG', () => {
  it('compose bruker Messages-plus-banen, ikke lucide MessageSquarePlus', () => {
    const side = utenKommentarer(les('../app/(app)/innboks/_inbox-sidebar.tsx'));
    const ikon = utenKommentarer(les('../app/(app)/innboks/_ny-melding-ikon.tsx'));
    const pane = utenKommentarer(les('../app/(app)/innboks/page.tsx'));
    expect(side).toMatch(/NyMeldingIkon/);
    expect(side).not.toMatch(/MessageSquarePlus/);
    expect(pane).toMatch(/NyMeldingIkon/);
    expect(pane).not.toMatch(/MessageSquarePlus/);
    expect(ikon).toMatch(/<svg/);
    expect(ikon).toMatch(/11\.9991 14\.25/);
    expect(ikon).not.toMatch(/lucide|MessageSquarePlus/);
  });
});

describe('Mikael 02.09 03:23 — lucide som fortsatt venter på egen SVG', () => {
  it('rapporten lister lucide-navn som fortsatt brukes i web', () => {
    const rapport = les('../../../docs/rapporter/2026-09-02-lucide-igjen.md');
    expect(rapport).toMatch(/PanelLeftOpen/);
    expect(rapport).toMatch(/phone-shell\.tsx/);
    expect(rapport).toMatch(/Plus/);
    expect(rapport).not.toMatch(/TilbakePil/);
    expect(rapport).not.toMatch(/MessageCirclePlus/);
  });
});
