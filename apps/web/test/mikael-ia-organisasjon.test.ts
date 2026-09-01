import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  breadcrumbFor,
  erSettingsSti,
  FORHANDLER_NAV,
  isItemActive,
  itemsForRole,
  MEKANIKER_NAV,
  ORGANISASJON_SEKSJONER,
  PARKED_LABEL,
  pillsForRole,
  SETTINGS_NAV,
} from '../app/(app)/_shell/nav.ts';
import { FANE_IDS, FANER, synligeFaner } from '../app/(app)/innstillinger/_faner.ts';
import { parseOrgSeksjon } from '../app/(app)/organisasjon/_seksjoner.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Mikael IA 28.08 — forhandler-tre', () => {
  it('sidebar er Organisasjon som én rad, ikke Ansatte-dropdown', () => {
    expect(FORHANDLER_NAV.map((i) => i.label)).toEqual([
      'Verkstedet',
      'Innboks',
      'Timeplan',
      'Kunder',
      'Tjenester',
      'Organisasjon',
      'Lager',
      'Butikk',
    ]);
    for (const rad of FORHANDLER_NAV) {
      expect(rad.children).toBeUndefined();
    }
    const org = FORHANDLER_NAV.find((i) => i.key === 'organisasjon');
    expect(org?.href).toBe('/organisasjon');
    expect(org?.pills?.map((p) => p.label)).toEqual([
      'Oversikt',
      'Ansatte',
      'Abonnement',
      'Integrasjoner',
    ]);
    expect(ORGANISASJON_SEKSJONER.map((p) => p.label)).toEqual([
      'Oversikt',
      'Ansatte',
      'Abonnement',
      'Integrasjoner',
    ]);
    expect(FORHANDLER_NAV.some((i) => i.label === 'Ansatte')).toBe(false);
    expect(FORHANDLER_NAV.some((i) => i.label === 'Admin')).toBe(false);
    expect(FORHANDLER_NAV.some((i) => i.label === 'Kompetanse')).toBe(false);
    expect(org?.pills?.some((p) => p.label === 'Kompetanse')).toBe(false);
    expect(org?.pills?.some((p) => p.label === 'Prisliste')).toBe(false);
    expect(org?.pills?.some((p) => p.label === 'Tjenester & priser')).toBe(false);
  });

  it('selger/support ser Organisasjon uten Abonnement og Integrasjoner', () => {
    const org = FORHANDLER_NAV.find((i) => i.key === 'organisasjon');
    if (!org) throw new Error('mangler Organisasjon');
    expect(pillsForRole(org, 'dealer_staff').map((p) => p.label)).toEqual(['Oversikt', 'Ansatte']);
    expect(pillsForRole(org, 'dealer_admin').map((p) => p.label)).toEqual([
      'Oversikt',
      'Ansatte',
      'Abonnement',
      'Integrasjoner',
    ]);
    expect(
      itemsForRole(FORHANDLER_NAV, 'dealer_staff', true).some((i) => i.key === 'organisasjon'),
    ).toBe(true);
  });

  it('mekaniker ser ikke Organisasjon', () => {
    expect(MEKANIKER_NAV.some((i) => i.label === 'Organisasjon')).toBe(false);
    expect(MEKANIKER_NAV.map((i) => i.label)).toEqual([
      'Dine jobber',
      'Jobbene mine',
      'Lager',
      'Butikk',
      'Kompetanse',
      'Timeplan',
      'Meg',
    ]);
  });

  it('Innstillinger er kun Profil + Varsler', () => {
    expect(SETTINGS_NAV.href).toBe('/innstillinger/profil');
    expect([...FANE_IDS]).toEqual(['profil', 'varsler']);
    expect(FANER.map((f) => f.label)).toEqual(['Profil', 'Varsler']);
    expect(synligeFaner(true).map((f) => f.id)).toEqual(['profil', 'varsler']);
    expect(erSettingsSti('/abonnement')).toBe(false);
    expect(erSettingsSti('/innstillinger/koblinger')).toBe(false);
    expect(erSettingsSti('/innstillinger/varsler')).toBe(true);
    expect(isItemActive(SETTINGS_NAV, '/abonnement')).toBe(false);
  });

  it('breadcrumb og aktiv rad for Organisasjon', () => {
    const org = FORHANDLER_NAV.find((i) => i.key === 'organisasjon');
    if (!org) throw new Error('mangler Organisasjon');
    expect(isItemActive(org, '/organisasjon')).toBe(true);
    expect(isItemActive(org, '/prisliste')).toBe(false);
    expect(isItemActive(org, '/abonnement')).toBe(true);
    expect(breadcrumbFor('/organisasjon', '', 'forhandler')).toEqual([
      { label: 'Organisasjon', href: '/organisasjon' },
      { label: 'Oversikt' },
    ]);
    expect(breadcrumbFor('/organisasjon', 'seksjon=ansatte', 'forhandler')).toEqual([
      { label: 'Organisasjon', href: '/organisasjon' },
      { label: 'Ansatte' },
    ]);
    expect(breadcrumbFor('/prisliste', '', 'forhandler')).toEqual([
      { label: 'Tjenester', href: '/prisliste' },
    ]);
    expect(PARKED_LABEL['/prisliste']).toBe('Tjenester');
  });

  it('ukjent eller admin-seksjon for selger faller til Oversikt', () => {
    expect(parseOrgSeksjon(null, true)).toBe('oversikt');
    expect(parseOrgSeksjon('ansatte', false)).toBe('ansatte');
    expect(parseOrgSeksjon('abonnement', false)).toBe('oversikt');
    expect(parseOrgSeksjon('integrasjoner', true)).toBe('integrasjoner');
  });
});

describe('Mikael IA — Opprett ansatt-dialog og kort', () => {
  const dialog = les('../app/(app)/organisasjon/_opprett-dialog.tsx');
  const kort = les('../app/(app)/organisasjon/_ansatte.tsx');
  const aktivitet = les('../app/(app)/organisasjon/_aktivitet.tsx');

  it('Opprett ansatt er dialog med påkrevde felt og disabled Tilganger', () => {
    expect(dialog).toMatch(/DialogTitle/);
    expect(dialog).toMatch(/>Opprett ansatt</);
    expect(dialog).toMatch(/Navn og etternavn/);
    expect(dialog).toMatch(/E-post adresse/);
    expect(dialog).toMatch(/Jobb tittel/);
    expect(dialog).toMatch(/Rolle/);
    expect(dialog).toMatch(/<select/);
    expect(dialog).toMatch(/Tilganger/);
    expect(dialog).toMatch(/disabled/);
    expect(dialog).toMatch(/invitasjoner\.opprett/);
    expect(dialog).toMatch(/team\.opprettUtenInvitasjon/);
    expect(dialog).not.toMatch(/Inviter ansatt/);
    expect(dialog).not.toMatch(/verdi: 'forhandler'/);
  });

  it('ansattkort har avatar, status, start, jobber, rolle+ og kompetanse+', () => {
    expect(kort).toMatch(/<Avatar/);
    expect(kort).toMatch(/AktivitetMerke/);
    expect(kort).toMatch(/ansattSiden/);
    expect(kort).toMatch(/jobberIDag/);
    expect(kort).toMatch(/aria-label="Endre rolle"/);
    expect(kort).toMatch(/aria-label="Legg til kompetanse"/);
    expect(kort).toMatch(/OpprettAnsattDialog/);
    expect(kort).not.toMatch(/bg-destructive|#EE2924/);
  });

  it('aktivitetsmerke bruker accent-soft / success, ikke Ny-rød', () => {
    expect(aktivitet).toMatch(/bg-success/);
    expect(aktivitet).toMatch(/bg-accent-soft/);
    expect(aktivitet).not.toMatch(/destructive/);
    expect(aktivitet).not.toMatch(/#ee2924/i);
  });
});

describe('Mikael IA — shell-chrome og telefon', () => {
  const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
  const header = utenKommentarer(les('../app/(app)/_shell/sidebar-header.tsx'));
  const top = utenKommentarer(les('../app/(app)/_shell/top-bar.tsx'));
  const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
  const rad = utenKommentarer(les('../app/(app)/_shell/bruker-rad.tsx'));
  const seksjon = utenKommentarer(les('../app/(app)/_shell/seksjon-bar.tsx'));
  const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
  const hscroll = utenKommentarer(les('../app/(app)/_shell/phone-h-scroll.tsx'));
  const chrome = utenKommentarer(les('../app/(app)/_shell/phone-chrome.ts'));

  it('minimize sitter i sidebaren, ikke i top-bar 1', () => {
    expect(header).toMatch(/PanelLeftClose|PanelLeftOpen/);
    expect(top).not.toMatch(/PanelLeftClose|PanelLeftOpen/);
    expect(header).toMatch(/LOGO = 18|width=\{18\}|width=\{LOGO\}/);
    expect(header).toMatch(/logo\/logo\.svg/);
    const headerLogoer = header.match(/<Image[\s\S]*?\/>/g) ?? [];
    expect(headerLogoer.length).toBeGreaterThanOrEqual(2);
    for (const logo of headerLogoer) {
      expect(logo).toMatch(/logo-invert/);
    }
    expect(header).not.toMatch(/recolor|filter:/);
    expect(header).not.toMatch(/Forhandler/);
  });

  it('sidebar-brukerchip er flat uten avatar; ingen telefon-bevel', () => {
    expect(rad).not.toMatch(/variant === 'phone'/);
    expect(rad).not.toMatch(/BEVEL/);
    expect(rad).not.toMatch(/Avatar/);
    expect(rad).not.toMatch(/rolle \?\?/);
    expect(rad).not.toMatch(/UserCog/);
    expect(rad).toMatch(/LogOut/);
  });

  it('telefon: fast toppbar + samme sidebar som overlay, ingen bevel/Mer-ark', () => {
    expect(layout).toMatch(/PhoneShell/);
    expect(layout).not.toMatch(/PhoneBevel/);
    expect(layout).not.toMatch(/PhoneNav/);
    expect(layout).toMatch(/WorkshopBloub/);
    expect(layout).not.toMatch(/TopBar/);
    expect(layout).toMatch(/OrganisasjonSeksjonBar/);
    expect(shell).toMatch(/md:hidden/);
    expect(shell).toMatch(/logo\/logo\.svg/);
    expect(shell).toMatch(/logo-invert/);
    expect(shell).toMatch(/PHONE_SAFE_TOP/);
    expect(shell).toMatch(/data-phone-sidebar-open/);
    expect(shell).toMatch(/PanelLeftOpen/);
    expect(shell).toMatch(/ml-auto/);
    expect(shell).not.toMatch(/PHONE_SAFE_BUNN/);
    expect(shell).not.toMatch(/PhoneHScroll|hamburger|\bMenu\b|Handlinger|QUICK_ACTIONS/i);
    expect(shell).not.toMatch(/recolor|filter:/);
    expect(shell).not.toMatch(/TipCard|helpdesk-slider|visningsvelger/i);
    expect(sidebar).toMatch(/data-phone-sidebar/);
    expect(sidebar).toMatch(/fixed inset-0/);
    expect(sidebar).toMatch(/hidden/);
    expect(sidebar).toMatch(/md:flex/);
    expect(sidebar).toMatch(/Handlinger/);
    expect(sidebar).toMatch(/min-width:\s*768px/);
    expect(chrome).toMatch(/scrollTo/);
    expect(chrome).not.toMatch(/scrollIntoView/);
    expect(hscroll).toMatch(/data-end-spacer/);
  });

  it('top-bar 2 er sidebar-rad, ikke svart pille', () => {
    expect(seksjon).toMatch(/bg-sidebar-active/);
    expect(seksjon).toMatch(/hover:bg-surface-2/);
    expect(seksjon).toMatch(/PhoneHScroll/);
    expect(seksjon).toMatch(/flex-wrap/);
    expect(seksjon).toMatch(/overflow-y-hidden/);
    expect(seksjon).toMatch(/touch-pan-x/);
    expect(seksjon).not.toMatch(/PHONE_LOGO_KOLONNE/);
    expect(hscroll).toMatch(/flex-nowrap/);
    expect(seksjon).toMatch(/whitespace-nowrap/);
    expect(seksjon).toMatch(/h-control/);
    expect(seksjon).toMatch(/min-h-control/);
    expect(seksjon).toMatch(/py-1\.5/);
    expect(seksjon).toMatch(/max-md:py-1/);
    expect(seksjon).toMatch(/max-md:h-auto/);
    expect(seksjon).toMatch(/text-label/);
    expect(hscroll).toMatch(/gap-2/);
    expect(seksjon).not.toMatch(/bg-fg text-bg/);
    expect(seksjon).not.toMatch(/rounded-pill/);
    expect(seksjon).not.toMatch(/h-row-store|h-11/);
    expect(seksjon).not.toMatch(/text-sm|text-\[11px\]/);
    expect(seksjon).not.toMatch(/shadow/);
    expect(seksjon).not.toMatch(/Button|variant=/);
  });
});

describe('Mikael IA — Prisliste på Oversikt, inspect', () => {
  it('Tjenester er /prisliste, ikke Organisasjon-pille og ikke Timeplan-popup', () => {
    const timeplan = FORHANDLER_NAV.find((i) => i.key === 'saker');
    expect(timeplan?.pills?.some((p) => /prisliste/i.test(p.label))).toBe(false);
    expect(timeplan?.pills?.some((p) => /prisliste/i.test(p.href))).toBe(false);
    expect(les('../app/(app)/prisliste/page.tsx')).toMatch(/PrislisteFlate/);
    expect(les('../app/(app)/prisliste/page.tsx')).toMatch(/tittel="Tjenester"/);
    expect(les('../app/(app)/prisliste/page.tsx')).not.toMatch(/redirect\('\/organisasjon'/);
    expect(les('../app/(app)/organisasjon/page.tsx')).not.toMatch(/PrislisteFlate/);
    expect(les('../app/(app)/organisasjon/page.tsx')).toMatch(/TjenesterInnhold/);
    expect(les('../app/(app)/organisasjon/page.tsx')).not.toMatch(/seksjon === 'prisliste'/);
    expect(les('../app/(app)/organisasjon/page.tsx')).not.toMatch(/seksjon === 'timeplan'/);
    expect(utenKommentarer(les('../app/(app)/saker/page.tsx'))).not.toMatch(
      /Prisliste|PrislisteFlate|prislisteApen/,
    );
  });

  it('inspect Organisasjon peker på /organisasjon, ikke Forhandleren-rad', () => {
    const plattform = les('../app/(app)/_lib/plattform.ts');
    expect(plattform).toMatch(/'\/organisasjon': '\/organisasjon'/);
    expect(plattform).not.toMatch(/'\/organisasjon': '\/organisasjon\/forhandleren'/);
    expect(les('../app/(app)/endwise/verksted/[slug]/organisasjon/page.tsx')).toMatch(
      /ForhandlerKort/,
    );
    expect(les('../app/(app)/endwise/verksted/[slug]/organisasjon/forhandleren/page.tsx')).toMatch(
      /organisasjon/,
    );
    expect(les('../app/(app)/_shell/seksjon-bar.tsx')).toMatch(/isVerkstedInspectPath/);
    expect(les('../app/(app)/_shell/seksjon-bar.tsx')).toMatch(/remapHrefTilInspect/);
  });
});
