import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { breadcrumbFor, FORHANDLER_NAV, MEKANIKER_NAV } from '../app/(app)/_shell/nav.ts';
import { erDealerInnboks, erInnboksSide } from '../app/(app)/_shell/seksjon-sti.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Mikael IA 28.08 kveld — Innboks uten Oversikt', () => {
  it('ingen Oversikt-pille på innboks, filtre er ikke destinasjoner', () => {
    const innboks = FORHANDLER_NAV.find((i) => i.key === 'innboks');
    expect(innboks?.href).toBe('/innboks');
    expect(innboks?.pills).toBeUndefined();
    const filter = utenKommentarer(les('../app/(app)/_shell/inbox-filter.tsx'));
    expect(filter).toMatch(/label: 'Alle chatter'/);
    expect(filter).toMatch(/label: 'Kunder'/);
    expect(filter).toMatch(/label: 'Intern'/);
    expect(filter).toMatch(/label: 'Endwise'/);
    expect(filter).not.toMatch(/Oversikt/);
    expect(MEKANIKER_NAV.some((i) => i.label === 'Innboks')).toBe(false);
  });

  it('breadcrumb er Innboks, ikke Innboks › Oversikt', () => {
    expect(breadcrumbFor('/innboks', '', 'forhandler')).toEqual([
      { label: 'Innboks', href: '/innboks' },
    ]);
    expect(breadcrumbFor('/innboks/abc', '', 'forhandler')).toEqual([
      { label: 'Innboks', href: '/innboks' },
    ]);
  });

  it('telefon top-bar 2 er filterrad med ikon+tekst og Ny chat — desktop skjuler den', () => {
    const seksjon = utenKommentarer(les('../app/(app)/_shell/seksjon-bar.tsx'));
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    expect(layout).toMatch(/InnboksSeksjonBar/);
    expect(layout).toMatch(/OrganisasjonSeksjonBar/);
    expect(seksjon).toMatch(/export function InnboksSeksjonBar/);
    expect(seksjon).toMatch(/export function OrganisasjonSeksjonBar/);
    expect(seksjon).toMatch(/aria-label="Innboks"/);
    expect(seksjon).toMatch(/md:hidden/);
    expect(seksjon).toMatch(/INNBOKS_FILTERE/);
    expect(seksjon).toMatch(/Ny chat/);
    expect(seksjon).toMatch(/MessageSquarePlus/);
    expect(seksjon).not.toMatch(/Oversikt/);
    expect(seksjon).toMatch(/bg-sidebar-active/);
    expect(seksjon).toMatch(/hover:bg-surface-2/);
    expect(seksjon).toMatch(/PhoneHScroll/);
    expect(seksjon).toMatch(/py-1\.5/);
    expect(seksjon).toMatch(/max-md:py-1/);
    expect(seksjon).not.toMatch(/bg-fg text-bg/);
    expect(seksjon).not.toMatch(/h-row-store|h-11/);
    expect(seksjon).toMatch(/\{p\.label\}/);
  });

  it('erInnboksSide dekker dealer og inspect, filterbar er kun dealer', () => {
    expect(erInnboksSide('/innboks')).toBe(true);
    expect(erInnboksSide('/innboks/tråd-1')).toBe(true);
    expect(erInnboksSide('/endwise/verksted/acme/innboks')).toBe(true);
    expect(erInnboksSide('/endwise/innboks')).toBe(false);
    expect(erInnboksSide('/organisasjon')).toBe(false);
    expect(erDealerInnboks('/innboks')).toBe(true);
    expect(erDealerInnboks('/endwise/verksted/acme/innboks')).toBe(false);
    const seksjon = utenKommentarer(les('../app/(app)/_shell/seksjon-bar.tsx'));
    expect(seksjon).toMatch(/erDealerInnboks/);
  });
});

describe('Mikael IA — telefon vs desktop innboks', () => {
  const side = utenKommentarer(les('../app/(app)/innboks/_inbox-sidebar.tsx'));
  const samtale = utenKommentarer(les('../app/(app)/innboks/_ny-samtale.tsx'));
  const pane = utenKommentarer(les('../app/(app)/innboks/page.tsx'));
  const chrome = utenKommentarer(les('../app/(app)/innboks/_chrome.tsx'));
  const hoved = utenKommentarer(les('../app/(app)/innboks/_hovedflate.tsx'));

  it('desktop list-header er ikon-only, skjult på telefon', () => {
    expect(side).toMatch(/INNBOKS_FILTERE/);
    expect(side).toMatch(/hidden[\s\S]*md:flex/);
    expect(side).toMatch(/aria-label=\{p\.label\}/);
    expect(side).toMatch(/title=\{p\.label\}/);
    expect(side).not.toMatch(/<span>\{p\.label\}<\/span>/);
    expect(side).toMatch(/bg-sidebar-active/);
    expect(side).toMatch(/hover:bg-surface-2/);
  });

  it('Ny chat åpner Kunde · Intern · Support — ingen Mekaniker', () => {
    expect(side).toMatch(/Ny chat/);
    expect(side).toMatch(/NySamtaleLenke/);
    expect(side).toMatch(/\/innboks\?ny=1/);
    expect(samtale).toMatch(/label: 'Kunde'/);
    expect(samtale).toMatch(/label: 'Intern'/);
    expect(samtale).toMatch(/label: 'Support'/);
    expect(samtale).not.toMatch(/Mekaniker/);
  });

  it('landing er alle chatter, desktop tomflate er postkasse', () => {
    expect(side).toMatch(/part === 'alle' \|\| t\.kind === part/);
    expect(side).toMatch(/listThreads/);
    expect(side).toMatch(/t\.unread/);
    expect(pane).toMatch(/Ingen valgte meldinger/);
    expect(pane).toMatch(/<Inbox /);
    expect(pane).toMatch(/Ny chat/);
    expect(pane).not.toMatch(/Oversikt/);
    expect(chrome).toMatch(/InboxHovedflate/);
    expect(chrome).toMatch(/InboxSidebar/);
    expect(chrome).toMatch(/DetaljerSlot/);
    expect(hoved).toMatch(/max-md:hidden/);
  });
});
