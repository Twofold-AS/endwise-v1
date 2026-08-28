import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  breadcrumbFor,
  FORHANDLER_NAV,
  INNBOKS_SEKSJONER,
  MEKANIKER_NAV,
} from '../app/(app)/_shell/nav.ts';
import { erInnboksSide } from '../app/(app)/_shell/seksjon-sti.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Mikael IA 28.08 kveld — Innboks matcher Organisasjon-skallet', () => {
  it('top-bar 2 er bare Oversikt, ikke Kunder/Intern/Endwise som destinasjoner', () => {
    const innboks = FORHANDLER_NAV.find((i) => i.key === 'innboks');
    expect(innboks?.href).toBe('/innboks');
    expect(innboks?.pills?.map((p) => p.label)).toEqual(['Oversikt']);
    expect(innboks?.pills?.map((p) => p.href)).toEqual(['/innboks']);
    expect(INNBOKS_SEKSJONER.map((p) => p.label)).toEqual(['Oversikt']);
    expect(innboks?.pills?.some((p) => p.label === 'Kunder')).toBe(false);
    expect(innboks?.pills?.some((p) => p.label === 'Intern')).toBe(false);
    expect(innboks?.pills?.some((p) => p.label === 'Endwise')).toBe(false);
    expect(MEKANIKER_NAV.some((i) => i.label === 'Innboks')).toBe(false);
  });

  it('breadcrumb lander på Innboks › Oversikt', () => {
    expect(breadcrumbFor('/innboks', '', 'forhandler')).toEqual([
      { label: 'Innboks', href: '/innboks' },
      { label: 'Oversikt' },
    ]);
    expect(breadcrumbFor('/innboks/abc', '', 'forhandler')).toEqual([
      { label: 'Innboks', href: '/innboks' },
      { label: 'Oversikt' },
    ]);
  });

  it('samme top-bar 2-chrome som Organisasjon, inkl. telefon py', () => {
    const seksjon = utenKommentarer(les('../app/(app)/_shell/seksjon-bar.tsx'));
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    expect(layout).toMatch(/InnboksSeksjonBar/);
    expect(layout).toMatch(/OrganisasjonSeksjonBar/);
    expect(seksjon).toMatch(/export function InnboksSeksjonBar/);
    expect(seksjon).toMatch(/export function OrganisasjonSeksjonBar/);
    expect(seksjon).toMatch(/ariaLabel="Innboks"/);
    expect(seksjon).toMatch(/INNBOKS_SEKSJONER/);
    expect(seksjon).toMatch(/h-control min-h-control/);
    expect(seksjon).toMatch(/bg-sidebar-active/);
    expect(seksjon).toMatch(/hover:bg-surface-2/);
    expect(seksjon).toMatch(/gap-2/);
    expect(seksjon).toMatch(/max-md:py-1\.5/);
    expect(seksjon).toMatch(/max-md:py-1/);
    expect(seksjon).not.toMatch(/bg-fg text-bg/);
    expect(seksjon).not.toMatch(/h-row-store|h-11/);
  });

  it('erInnboksSide dekker dealer og inspect, ikke Endwise-plattform', () => {
    expect(erInnboksSide('/innboks')).toBe(true);
    expect(erInnboksSide('/innboks/tråd-1')).toBe(true);
    expect(erInnboksSide('/endwise/verksted/acme/innboks')).toBe(true);
    expect(erInnboksSide('/endwise/innboks')).toBe(false);
    expect(erInnboksSide('/organisasjon')).toBe(false);
  });
});

describe('Mikael IA — filterikoner under Oversikt + Ny samtale', () => {
  const side = utenKommentarer(les('../app/(app)/innboks/_inbox-sidebar.tsx'));
  const samtale = utenKommentarer(les('../app/(app)/innboks/_ny-samtale.tsx'));
  const pane = utenKommentarer(les('../app/(app)/innboks/page.tsx'));
  const chrome = utenKommentarer(les('../app/(app)/innboks/_chrome.tsx'));

  it('fire ikon-filtre med tilgjengelige navn, ingen synlig label', () => {
    expect(side).toMatch(/label: 'Alle chatter'/);
    expect(side).toMatch(/label: 'Kunder'/);
    expect(side).toMatch(/label: 'Intern'/);
    expect(side).toMatch(/label: 'Endwise'/);
    expect(side).toMatch(/icon: Inbox/);
    expect(side).toMatch(/icon: Users/);
    expect(side).toMatch(/icon: Wrench/);
    expect(side).toMatch(/icon: LifeBuoy/);
    expect(side).toMatch(/aria-label=\{p\.label\}/);
    expect(side).toMatch(/title=\{p\.label\}/);
    expect(side).not.toMatch(/<span>\{p\.label\}<\/span>/);
    expect(side).toMatch(/bg-sidebar-active/);
    expect(side).toMatch(/hover:bg-surface-2/);
    expect(side).not.toMatch(/Vis \$\{p\.label\}/);
  });

  it('Ny samtale er tekstknapp i filterraden, ikke et ikon', () => {
    expect(side).toMatch(/Ny samtale/);
    expect(side).toMatch(/NySamtaleLenke/);
    expect(side).toMatch(/\/innboks\?ny=1/);
    expect(side).not.toMatch(/Ny samtale<\/Link>\s*<\/button>/);
    expect(samtale).toMatch(/label: 'Kunde'/);
    expect(samtale).toMatch(/label: 'Intern'/);
    expect(samtale).toMatch(/label: 'Support'/);
    expect(samtale).not.toMatch(/Mekaniker/);
  });

  it('Oversikt er alle chatter — lista og ulest-regler er urørt', () => {
    expect(side).toMatch(/part === 'alle' \|\| t\.kind === part/);
    expect(side).toMatch(/listThreads/);
    expect(side).toMatch(/t\.unread/);
    expect(side).toMatch(/useInboxModus/);
    expect(pane).toMatch(/aria-label="Oversikt"|Oversikt/);
    expect(chrome).toMatch(/h-full min-h-0/);
    expect(chrome).toMatch(/InboxSidebar/);
    expect(chrome).toMatch(/DetaljerSlot/);
  });
});
