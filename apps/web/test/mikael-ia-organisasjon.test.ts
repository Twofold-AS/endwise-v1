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
import { parseOrgSeksjon } from '../app/(app)/organisasjon/_seksjoner.ts';
import { FANER, FANE_IDS, synligeFaner } from '../app/(app)/innstillinger/_faner.ts';

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
      'Jobber',
      'Kunder',
      'Lager',
      'Butikk',
      'Samarbeid',
      'Rapporter',
      'Organisasjon',
      'Hjelp',
    ]);
    for (const rad of FORHANDLER_NAV) {
      expect(rad.children).toBeUndefined();
    }
    const org = FORHANDLER_NAV.find((i) => i.key === 'organisasjon');
    expect(org?.href).toBe('/organisasjon');
    expect(org?.pills?.map((p) => p.label)).toEqual([
      'Oversikt',
      'Timeplan',
      'Ansatte',
      'Abonnement',
      'Integrasjoner',
    ]);
    expect(ORGANISASJON_SEKSJONER.map((p) => p.label)).toEqual([
      'Oversikt',
      'Timeplan',
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
    expect(pillsForRole(org, 'dealer_staff').map((p) => p.label)).toEqual([
      'Oversikt',
      'Timeplan',
      'Ansatte',
    ]);
    expect(pillsForRole(org, 'dealer_admin').map((p) => p.label)).toEqual([
      'Oversikt',
      'Timeplan',
      'Ansatte',
      'Abonnement',
      'Integrasjoner',
    ]);
    expect(itemsForRole(FORHANDLER_NAV, 'dealer_staff', true).some((i) => i.key === 'organisasjon')).toBe(
      true,
    );
  });

  it('mekaniker ser ikke Organisasjon', () => {
    expect(MEKANIKER_NAV.some((i) => i.label === 'Organisasjon')).toBe(false);
    expect(MEKANIKER_NAV.map((i) => i.label)).toEqual([
      'Min dag',
      'Jobbene mine',
      'Lager',
      'Butikk',
      'Kompetanse',
      'Timeplan',
      'Hjelp',
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
    expect(isItemActive(org, '/prisliste')).toBe(true);
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
      { label: 'Organisasjon', href: '/organisasjon' },
      { label: 'Oversikt' },
    ]);
    expect(PARKED_LABEL['/prisliste']).toBe('Organisasjon · Oversikt');
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
    expect(aktivitet).not.toMatch(/destructive|#EE2924|#ee2924/i);
  });
});

describe('Mikael IA — shell-chrome og telefon', () => {
  const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
  const header = utenKommentarer(les('../app/(app)/_shell/sidebar-header.tsx'));
  const top = utenKommentarer(les('../app/(app)/_shell/top-bar.tsx'));
  const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
  const rad = utenKommentarer(les('../app/(app)/_shell/bruker-rad.tsx'));
  const seksjon = utenKommentarer(les('../app/(app)/_shell/seksjon-bar.tsx'));
  const phone = utenKommentarer(les('../app/(app)/_shell/phone-nav.tsx'));

  it('minimize sitter i sidebaren, ikke i top-bar 1', () => {
    expect(header).toMatch(/PanelLeftClose|PanelLeftOpen/);
    expect(top).not.toMatch(/PanelLeftClose|PanelLeftOpen/);
    expect(header).toMatch(/width=\{22\}/);
    expect(header).not.toMatch(/Forhandler/);
  });

  it('brukerchip er bevel uten rolletittel', () => {
    expect(rad).toMatch(/BEVEL/);
    expect(rad).not.toMatch(/rolle \?\?/);
    expect(rad).not.toMatch(/UserCog/);
  });

  it('telefon: horisontal nav, ingen top-bar 1, Hjelp er knapp', () => {
    expect(layout).toMatch(/PhoneNav/);
    expect(layout).toMatch(/md:hidden/);
    expect(layout).toMatch(/OrganisasjonSeksjonBar/);
    expect(phone).toMatch(/overflow-x-auto/);
    expect(phone).toMatch(/h-control/);
    expect(phone).toMatch(/text-label/);
    expect(phone).not.toMatch(/TipCard|helpdesk-slider|hamburger/i);
    expect(sidebar).toMatch(/hidden[\s\S]*md:flex/);
  });

  it('top-bar 2 er sidebar-rad, ikke svart pille', () => {
    expect(seksjon).toMatch(/bg-sidebar-active/);
    expect(seksjon).toMatch(/hover:bg-surface-2/);
    expect(seksjon).toMatch(/overflow-x-auto/);
    expect(seksjon).toMatch(/h-control/);
    expect(seksjon).toMatch(/text-label/);
    expect(seksjon).toMatch(/gap-2/);
    expect(seksjon).not.toMatch(/bg-fg text-bg/);
    expect(seksjon).not.toMatch(/rounded-pill/);
    expect(seksjon).not.toMatch(/h-row-store|h-11/);
  });
});
