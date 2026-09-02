import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { destinasjonFaner } from '../app/(app)/_shell/seksjon-faner.ts';
import { SHELL_LOGO_PX, SHELL_TOGGLE_PX } from '../app/(app)/_shell/phone-chrome.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Mikael 02.09 03:23 — Tilbake uten ikon, større logo', () => {
  it('Tilbake er bare ordet, uten SVG/lucide/chevron', () => {
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const pil = utenKommentarer(les('../app/(app)/_shell/tilbake-pil.tsx'));
    expect(shell).toMatch(/data-shell-tilbake/);
    expect(shell).toMatch(/Tilbake/);
    expect(shell).not.toMatch(/TilbakePil/);
    expect(shell).not.toMatch(/<svg/);
    expect(shell).not.toMatch(/ChevronLeft|lucide/);
    expect(pil).not.toMatch(/<svg/);
    expect(pil).toMatch(/Tilbake/);
  });

  it('logo og sidebar-toggle er minst 24px på PC og telefon', () => {
    expect(SHELL_LOGO_PX).toBeGreaterThanOrEqual(24);
    expect(SHELL_TOGGLE_PX).toBeGreaterThanOrEqual(24);
    const header = utenKommentarer(les('../app/(app)/_shell/sidebar-header.tsx'));
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const chrome = utenKommentarer(les('../app/(app)/_shell/phone-chrome.ts'));
    expect(header).toMatch(/SHELL_LOGO_PX|width=\{24\}|LOGO = 24/);
    expect(shell).toMatch(/SHELL_LOGO_PX|PHONE_LOGO_PX|width=\{24\}/);
    expect(chrome).not.toMatch(/PHONE_LOGO_PX = 18/);
    expect(chrome).not.toMatch(/SHELL_TOGGLE_PX = 16/);
    expect(header).not.toMatch(/LOGO = 18/);
  });
});

describe('Mikael 02.09 03:23 — top-bar 2 under Ronny på alle destinasjoner', () => {
  it('layout monterer DestinasjonSeksjonBar under WorkshopBloub', () => {
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    const ronny = layout.lastIndexOf('<WorkshopBloub');
    const bar = layout.lastIndexOf('<DestinasjonSeksjonBar');
    expect(ronny).toBeGreaterThan(-1);
    expect(bar).toBeGreaterThan(ronny);
    expect(layout).not.toMatch(/TopBar/);
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
    ).toEqual([{ label: 'Verkstedet', href: '/dashboard', valgt: true }]);

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
