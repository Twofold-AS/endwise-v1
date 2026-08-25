import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  breadcrumbFor,
  childrenForRole,
  ENDWISE_NAV,
  ENDWISE_SETTINGS_NAV,
  erSettingsSti,
  FORHANDLER_NAV,
  isItemActive,
  itemsForRole,
  SETTINGS_NAV,
} from '../app/(app)/_shell/nav.ts';

/**
 * F5-13 / F5-19 — Organisasjon er egen sidebar-destinasjon hos forhandler.
 * Endwise-admin beholder label Team. Settings er en destinasjon til profil,
 * ikke flyout. Ikke Admin-tab.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Team i sidebar — Endwise-admin', () => {
  const nav = les('../app/(app)/_shell/nav.ts');

  it('ENDWISE_NAV har Team etter Innboks, label Team, href /endwise/team', () => {
    const start = nav.indexOf('export const ENDWISE_NAV');
    const slutt = nav.indexOf('export const ENDWISE_SETTINGS_NAV');
    const blokk = nav.slice(start, slutt);
    const innboks = blokk.indexOf("key: 'endwise-innboks'");
    const team = blokk.indexOf("key: 'endwise-team'");
    const forhandlere = blokk.indexOf("key: 'endwise-forhandlere'");
    expect(team).toBeGreaterThan(innboks);
    expect(forhandlere).toBeGreaterThan(team);
    expect(blokk).toMatch(/label:\s*'Team'/);
    expect(blokk).toMatch(/href:\s*'\/endwise\/team'/);
    expect(blokk).not.toMatch(/label:\s*'Organisasjon'/);
  });

  it('ENDWISE_SETTINGS_NAV går til profil, uten dealer-barn og uten Team', () => {
    const settings = utenKommentarer(
      nav.slice(
        nav.indexOf('export const ENDWISE_SETTINGS_NAV'),
        nav.indexOf('export function contextsForRole'),
      ),
    );
    expect(ENDWISE_SETTINGS_NAV.href).toBe('/innstillinger/profil');
    expect(ENDWISE_SETTINGS_NAV.children).toBeUndefined();
    expect(settings).not.toMatch(/label:\s*'Team'/);
    expect(settings).not.toMatch(/label:\s*'Abonnement'/);
    expect(settings).not.toMatch(/label:\s*'Dev-mode'/);
    expect(settings).not.toMatch(/label:\s*'Min profil'/);
    expect(ENDWISE_SETTINGS_NAV.children?.some((c) => c.label === 'Team')).toBeFalsy();
  });

  it('Dev-mode-siden lever videre på /endwise/innstillinger', () => {
    const side = les('../app/(app)/endwise/innstillinger/page.tsx');
    expect(side.length).toBeGreaterThan(0);
    const oversikt = les('../app/(app)/endwise/page.tsx');
    expect(oversikt).toMatch(/href: '\/endwise\/innstillinger'/);
  });

  it('ingen Admin-fane i Endwise-nav', () => {
    expect(ENDWISE_NAV.some((i) => i.label === 'Admin')).toBe(false);
    expect(nav).not.toMatch(/label:\s*'Admin'/);
  });
});

describe('Organisasjon i sidebar — forhandler', () => {
  const nav = les('../app/(app)/_shell/nav.ts');
  const forhandler = utenKommentarer(
    nav.slice(nav.indexOf('export const FORHANDLER_NAV'), nav.indexOf('export const SETTINGS_NAV')),
  );
  const settings = utenKommentarer(
    nav.slice(nav.indexOf('export const SETTINGS_NAV'), nav.indexOf('export const MEKANIKER_NAV')),
  );

  it('Organisasjon ligger over Helpdesk, med Team/Tjenestekatalog/Kompetanse/Kapasitet', () => {
    const keys = FORHANDLER_NAV.map((i) => i.key);
    expect(keys.indexOf('team')).toBeGreaterThan(keys.indexOf('ai-verktoy'));
    expect(keys.indexOf('team')).toBeLessThan(keys.indexOf('helpdesk'));
    const org = FORHANDLER_NAV.find((i) => i.key === 'team');
    expect(org).toBeDefined();
    expect(org?.label).toBe('Organisasjon');
    expect(org?.href).toBe('/innstillinger/team');
    expect(org?.children?.map((c) => c.label)).toEqual([
      'Team',
      'Tjenestekatalog',
      'Kompetanse',
      'Kapasitet',
    ]);
    expect(org?.children?.map((c) => c.href)).toEqual([
      '/innstillinger/team',
      '/innstillinger/tjenestekatalog',
      '/mekanikere/kompetanse',
      '/mekanikere/kapasitet',
    ]);
    expect(forhandler).toMatch(/key:\s*'team'/);
    expect(forhandler).toMatch(/label:\s*'Organisasjon'/);
    expect(forhandler).not.toMatch(/label:\s*'Team & tilgang'/);
    expect(forhandler).not.toMatch(/label:\s*'Mekanikere'/);
  });

  it('Team er ADMIN_OF_TENANT; Tjenestekatalog er synlig for DRIFT', () => {
    const org = FORHANDLER_NAV.find((i) => i.key === 'team');
    expect(org).toBeDefined();
    if (!org) throw new Error('FORHANDLER_NAV mangler Organisasjon');
    const tilgang = childrenForRole(org, 'dealer_admin').map((c) => c.label);
    const staff = childrenForRole(org, 'dealer_staff').map((c) => c.label);
    expect(tilgang).toEqual(['Team', 'Tjenestekatalog', 'Kompetanse', 'Kapasitet']);
    expect(staff).toEqual(['Tjenestekatalog']);
    expect(staff).not.toContain('Team');
  });

  it('SETTINGS_NAV er profil-destinasjon uten flyout-barn', () => {
    expect(SETTINGS_NAV.href).toBe('/innstillinger/profil');
    expect(SETTINGS_NAV.children).toBeUndefined();
    expect(settings).toMatch(/href:\s*'\/innstillinger\/profil'/);
    expect(settings).not.toMatch(/label:\s*'Abonnement'/);
    expect(settings).not.toMatch(/label:\s*'Team & tilgang'/);
    expect(settings).not.toMatch(/label:\s*'Tjenestekatalog'/);
    expect(settings).not.toMatch(/children:/);
  });

  it('forhandler-nav har ingen Admin-tab', () => {
    expect(itemsForRole(FORHANDLER_NAV, 'dealer_admin').some((i) => i.label === 'Admin')).toBe(
      false,
    );
  });
});

describe('Organisasjon vs Settings — aktiv rad og breadcrumb', () => {
  const org = FORHANDLER_NAV.find((i) => i.key === 'team');

  it('Organisasjon-ruter aktiverer Organisasjon, ikke Settings', () => {
    expect(org).toBeDefined();
    if (!org) throw new Error('FORHANDLER_NAV mangler Organisasjon');
    expect(isItemActive(org, '/innstillinger/team')).toBe(true);
    expect(isItemActive(org, '/innstillinger/tjenestekatalog')).toBe(true);
    expect(isItemActive(org, '/mekanikere')).toBe(false);
    expect(isItemActive(org, '/mekanikere/kompetanse')).toBe(true);
    expect(isItemActive(org, '/mekanikere/kapasitet')).toBe(true);
    expect(isItemActive(SETTINGS_NAV, '/innstillinger/team')).toBe(false);
    expect(isItemActive(SETTINGS_NAV, '/innstillinger/tjenestekatalog')).toBe(false);
    expect(isItemActive(SETTINGS_NAV, '/mekanikere')).toBe(false);
  });

  it('Settings-stier aktiverer Settings, ikke Organisasjon', () => {
    expect(org).toBeDefined();
    if (!org) throw new Error('FORHANDLER_NAV mangler Organisasjon');
    expect(erSettingsSti('/innstillinger')).toBe(true);
    expect(erSettingsSti('/innstillinger/profil')).toBe(true);
    expect(erSettingsSti('/innstillinger/varsler')).toBe(true);
    expect(erSettingsSti('/innstillinger/team')).toBe(false);
    expect(isItemActive(SETTINGS_NAV, '/innstillinger')).toBe(true);
    expect(isItemActive(SETTINGS_NAV, '/innstillinger/varsler')).toBe(true);
    expect(isItemActive(SETTINGS_NAV, '/innstillinger/profil')).toBe(true);
    expect(isItemActive(SETTINGS_NAV, '/innstillinger/tjenester')).toBe(true);
    expect(isItemActive(SETTINGS_NAV, '/abonnement')).toBe(true);
    expect(isItemActive(SETTINGS_NAV, '/integrasjoner')).toBe(true);
    expect(isItemActive(org, '/innstillinger')).toBe(false);
    expect(isItemActive(org, '/innstillinger/varsler')).toBe(false);
    expect(isItemActive(org, '/innstillinger/profil')).toBe(false);
    expect(isItemActive(ENDWISE_SETTINGS_NAV, '/innstillinger/profil')).toBe(true);
    expect(isItemActive(ENDWISE_SETTINGS_NAV, '/abonnement')).toBe(false);
  });

  it('breadcrumb er Organisasjon › underpunkt, ikke Settings', () => {
    expect(breadcrumbFor('/innstillinger/team', '', 'forhandler')).toEqual([
      { label: 'Organisasjon', href: '/innstillinger/team' },
      { label: 'Team' },
    ]);
    expect(breadcrumbFor('/innstillinger/tjenestekatalog', '', 'forhandler')).toEqual([
      { label: 'Organisasjon', href: '/innstillinger/team' },
      { label: 'Tjenestekatalog' },
    ]);
    expect(breadcrumbFor('/mekanikere/kompetanse', '', 'forhandler')).toEqual([
      { label: 'Organisasjon', href: '/innstillinger/team' },
      { label: 'Kompetanse' },
    ]);
    expect(breadcrumbFor('/innstillinger/varsler', '', 'forhandler')).toEqual([
      { label: 'Settings', href: '/innstillinger/profil' },
      { label: 'Varsler' },
    ]);
    expect(breadcrumbFor('/endwise/team', '', 'endwise')).toEqual([
      { label: 'Team', href: '/endwise/team' },
    ]);
  });
});

describe('Settings i sidebaren er destinasjon, ikke flyout', () => {
  it('utvidet Settings er Link til profil, uten DropdownMenu', () => {
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    const start = sidebar.indexOf('settingsNav &&');
    expect(start).toBeGreaterThan(-1);
    const bunn = sidebar.slice(start, sidebar.indexOf('function isChildActive'));
    expect(bunn).toMatch(/<Link/);
    expect(bunn).toMatch(/settingsNav\.href/);
    expect(bunn).not.toMatch(/DropdownMenuHeader/);
    expect(bunn).not.toMatch(/childrenForRole\(settingsNav/);
  });

  it('inspect har fortsatt settingsNav = null', () => {
    const sidebar = les('../app/(app)/_shell/sidebar.tsx');
    expect(sidebar).toMatch(/inspect \? null/);
  });
});
