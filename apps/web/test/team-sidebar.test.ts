import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  breadcrumbFor,
  childrenForRole,
  ENDWISE_NAV,
  ENDWISE_SETTINGS_NAV,
  FORHANDLER_NAV,
  isItemActive,
  itemsForRole,
  SETTINGS_NAV,
} from '../app/(app)/_shell/nav.ts';

/**
 * F5-13 / F5-19 — Team er egen sidebar-destinasjon hos både Endwise-admin
 * og forhandler. Ikke Settings-flyout, ikke Settings-fane, ikke Admin-tab.
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
  });

  it('ENDWISE_SETTINGS_NAV har ikke Team — destinasjonen bor i sidebaren', () => {
    const settings = utenKommentarer(
      nav.slice(nav.indexOf('export const ENDWISE_SETTINGS_NAV'), nav.indexOf('export function contextsForRole')),
    );
    expect(settings).not.toMatch(/label:\s*'Team'/);
    expect(settings).toMatch(/label:\s*'Dev-mode'/);
    expect(settings).toMatch(/label:\s*'Min profil'/);
    expect(ENDWISE_SETTINGS_NAV.children?.some((c) => c.label === 'Team')).toBe(false);
  });

  it('ingen Admin-fane i Endwise-nav', () => {
    expect(ENDWISE_NAV.some((i) => i.label === 'Admin')).toBe(false);
    expect(nav).not.toMatch(/label:\s*'Admin'/);
  });
});

describe('Team i sidebar — forhandler', () => {
  const nav = les('../app/(app)/_shell/nav.ts');
  const forhandler = utenKommentarer(
    nav.slice(nav.indexOf('export const FORHANDLER_NAV'), nav.indexOf('export const SETTINGS_NAV')),
  );
  const settings = utenKommentarer(
    nav.slice(nav.indexOf('export const SETTINGS_NAV'), nav.indexOf('export const MEKANIKER_NAV')),
  );

  it('FORHANDLER_NAV har Team som egen destinasjon med inline barn', () => {
    const team = FORHANDLER_NAV.find((i) => i.key === 'team');
    expect(team).toBeDefined();
    expect(team?.label).toBe('Team');
    expect(team?.href).toBe('/innstillinger/team');
    expect(team?.children?.map((c) => c.label)).toEqual([
      'Team & tilgang',
      'Tjenestekatalog',
      'Mekanikere',
      'Kompetanse',
      'Kapasitet',
    ]);
    expect(forhandler).toMatch(/key:\s*'team'/);
    expect(forhandler).toMatch(/label:\s*'Team'/);
  });

  it('Team & tilgang er ADMIN_OF_TENANT; Tjenestekatalog er synlig for DRIFT', () => {
    const team = FORHANDLER_NAV.find((i) => i.key === 'team');
    expect(team).toBeDefined();
    const tilgang = childrenForRole(team!, 'dealer_admin').map((c) => c.label);
    const staff = childrenForRole(team!, 'dealer_staff').map((c) => c.label);
    expect(tilgang).toContain('Team & tilgang');
    expect(tilgang).toContain('Tjenestekatalog');
    expect(tilgang).toContain('Mekanikere');
    expect(staff).toEqual(['Tjenestekatalog']);
    expect(staff).not.toContain('Team & tilgang');
  });

  it('SETTINGS_NAV har ikke Team & tilgang eller Tjenestekatalog', () => {
    const labels = SETTINGS_NAV.children?.map((c) => c.label) ?? [];
    expect(labels).not.toContain('Team & tilgang');
    expect(labels).not.toContain('Tjenestekatalog');
    expect(labels).toEqual([
      'Abonnement',
      'Varsler',
      'Tjenester & priser',
      'Integrasjoner',
      'Profil',
    ]);
    expect(settings).not.toMatch(/label:\s*'Team & tilgang'/);
    expect(settings).not.toMatch(/label:\s*'Tjenestekatalog'/);
  });

  it('forhandler-nav har ingen Admin-tab', () => {
    expect(itemsForRole(FORHANDLER_NAV, 'dealer_admin').some((i) => i.label === 'Admin')).toBe(
      false,
    );
  });
});

describe('Team vs Settings — aktiv rad og breadcrumb', () => {
  const team = FORHANDLER_NAV.find((i) => i.key === 'team')!;

  it('Team-ruter aktiverer Team, ikke Settings', () => {
    expect(isItemActive(team, '/innstillinger/team')).toBe(true);
    expect(isItemActive(team, '/innstillinger/tjenestekatalog')).toBe(true);
    expect(isItemActive(team, '/mekanikere')).toBe(true);
    expect(isItemActive(team, '/mekanikere/kompetanse')).toBe(true);
    expect(isItemActive(SETTINGS_NAV, '/innstillinger/team')).toBe(false);
    expect(isItemActive(SETTINGS_NAV, '/innstillinger/tjenestekatalog')).toBe(false);
    expect(isItemActive(SETTINGS_NAV, '/mekanikere')).toBe(false);
  });

  it('gjenværende Settings-barn aktiverer Settings, ikke Team', () => {
    expect(isItemActive(SETTINGS_NAV, '/innstillinger')).toBe(true);
    expect(isItemActive(SETTINGS_NAV, '/innstillinger/varsler')).toBe(true);
    expect(isItemActive(SETTINGS_NAV, '/innstillinger/profil')).toBe(true);
    expect(isItemActive(SETTINGS_NAV, '/innstillinger/tjenester')).toBe(true);
    expect(isItemActive(SETTINGS_NAV, '/abonnement')).toBe(true);
    expect(isItemActive(SETTINGS_NAV, '/integrasjoner')).toBe(true);
    expect(isItemActive(team, '/innstillinger')).toBe(false);
    expect(isItemActive(team, '/innstillinger/varsler')).toBe(false);
    expect(isItemActive(team, '/innstillinger/profil')).toBe(false);
  });

  it('breadcrumb er Team › underpunkt, ikke Settings', () => {
    expect(breadcrumbFor('/innstillinger/team', '', 'forhandler')).toEqual([
      { label: 'Team', href: '/innstillinger/team' },
      { label: 'Team & tilgang' },
    ]);
    expect(breadcrumbFor('/innstillinger/tjenestekatalog', '', 'forhandler')).toEqual([
      { label: 'Team', href: '/innstillinger/team' },
      { label: 'Tjenestekatalog' },
    ]);
    expect(breadcrumbFor('/mekanikere/kompetanse', '', 'forhandler')).toEqual([
      { label: 'Team', href: '/innstillinger/team' },
      { label: 'Kompetanse' },
    ]);
    expect(breadcrumbFor('/innstillinger/varsler', '', 'forhandler')).toEqual([
      { label: 'Settings', href: '/innstillinger' },
      { label: 'Varsler' },
    ]);
    expect(breadcrumbFor('/endwise/team', '', 'endwise')).toEqual([
      { label: 'Team', href: '/endwise/team' },
    ]);
  });
});
