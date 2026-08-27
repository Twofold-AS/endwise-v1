import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BUTIKK_NAV,
  breadcrumbFor,
  childrenForRole,
  ENDWISE_NAV,
  ENDWISE_SETTINGS_NAV,
  erSettingsSti,
  FORHANDLER_NAV,
  isItemActive,
  itemsForRole,
  LAGER_NAV,
  MEKANIKER_NAV,
  PARKED_LABEL,
  QUICK_ACTIONS,
  SETTINGS_NAV,
} from '../app/(app)/_shell/nav.ts';

/**
 * F5-13 / F5-19 — Organisasjon er egen sidebar-destinasjon hos forhandler.
 * Endwise-admin beholder label Team. Innstillinger er en destinasjon til profil,
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
    expect(blokk).not.toMatch(/label:\s*'Ansatte'/);
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

  it('Organisasjon ligger over Rapporter og Hjelp, med Forhandleren/Team/Kompetanse/Timeplan (uten Prisliste)', () => {
    const keys = FORHANDLER_NAV.map((i) => i.key);
    expect(keys).toEqual([
      'dashboard',
      'innboks',
      'saker',
      'kunder',
      'team',
      'analyse',
      'helpdesk',
    ]);
    expect(keys.indexOf('team')).toBeLessThan(keys.indexOf('analyse'));
    expect(keys.indexOf('analyse')).toBeLessThan(keys.indexOf('helpdesk'));
    expect(keys).not.toContain('ai-verktoy');
    expect(keys).not.toContain('samarbeid');
    const org = FORHANDLER_NAV.find((i) => i.key === 'team');
    expect(org).toBeDefined();
    expect(org?.label).toBe('Organisasjon');
    expect(org?.href).toBe('/organisasjon/forhandleren');
    expect(org?.children?.map((c) => c.label)).toEqual([
      'Forhandleren',
      'Team',
      'Kompetanse',
      'Timeplan',
    ]);
    expect(org?.children?.map((c) => c.href)).toEqual([
      '/organisasjon/forhandleren',
      '/innstillinger/team',
      '/mekanikere/kompetanse',
      '/mekanikere/kapasitet',
    ]);
    expect(forhandler).toMatch(/key:\s*'team'/);
    expect(forhandler).toMatch(/label:\s*'Organisasjon'/);
    expect(forhandler).not.toMatch(/label:\s*'Ansatte'/);
    expect(forhandler).not.toMatch(/label:\s*'Team & tilgang'/);
    expect(forhandler).not.toMatch(/label:\s*'Mekanikere'/);
    expect(forhandler).not.toMatch(/label:\s*'AI-verktøy'/);
    expect(forhandler).not.toMatch(/label:\s*'Samarbeid'/);
  });

  it('Organisasjon er ADMIN_OF_TENANT; Prisliste bor under Jobber for DRIFT', () => {
    const org = FORHANDLER_NAV.find((i) => i.key === 'team');
    const verksted = FORHANDLER_NAV.find((i) => i.key === 'dashboard');
    const jobber = FORHANDLER_NAV.find((i) => i.key === 'saker');
    expect(org).toBeDefined();
    expect(verksted).toBeDefined();
    expect(jobber).toBeDefined();
    if (!org || !verksted || !jobber) {
      throw new Error('FORHANDLER_NAV mangler Organisasjon/Verkstedet/Jobber');
    }
    const tilgang = childrenForRole(org, 'dealer_admin').map((c) => c.label);
    const staffOrg = childrenForRole(org, 'dealer_staff').map((c) => c.label);
    const staffVerksted = childrenForRole(verksted, 'dealer_staff').map((c) => c.label);
    const staffJobber = childrenForRole(jobber, 'dealer_staff').map((c) => c.label);
    expect(tilgang).toEqual(['Forhandleren', 'Team', 'Kompetanse', 'Timeplan']);
    expect(staffOrg).toEqual([]);
    expect(itemsForRole(FORHANDLER_NAV, 'dealer_staff').some((i) => i.key === 'team')).toBe(false);
    expect(verksted.children).toBeUndefined();
    expect(staffVerksted).toEqual([]);
    expect(staffJobber).toEqual(['Oversikt', 'Kalender', 'Prisliste']);
    expect(jobber.children?.map((c) => c.href)).toEqual([
      '/jobber',
      '/jobber?visning=kalender',
      '/prisliste',
    ]);
  });

  it('SETTINGS_NAV er profil-destinasjon uten flyout-barn', () => {
    expect(SETTINGS_NAV.href).toBe('/innstillinger/profil');
    expect(SETTINGS_NAV.label).toBe('Innstillinger');
    expect(ENDWISE_SETTINGS_NAV.label).toBe('Innstillinger');
    expect(SETTINGS_NAV.children).toBeUndefined();
    expect(settings).toMatch(/href:\s*'\/innstillinger\/profil'/);
    expect(settings).not.toMatch(/label:\s*'Abonnement'/);
    expect(settings).not.toMatch(/label:\s*'Team & tilgang'/);
    expect(settings).not.toMatch(/label:\s*'Tjenestekatalog'/);
    expect(settings).not.toMatch(/label:\s*'Settings'/);
    expect(settings).not.toMatch(/children:/);
  });

  it('forhandler-nav har ingen Admin-tab', () => {
    expect(itemsForRole(FORHANDLER_NAV, 'dealer_admin').some((i) => i.label === 'Admin')).toBe(
      false,
    );
  });
});

describe('Organisasjon vs Innstillinger — aktiv rad og breadcrumb', () => {
  const org = FORHANDLER_NAV.find((i) => i.key === 'team');

  it('Organisasjon-ruter aktiverer Organisasjon, ikke Innstillinger', () => {
    expect(org).toBeDefined();
    if (!org) throw new Error('FORHANDLER_NAV mangler Organisasjon');
    expect(isItemActive(org, '/organisasjon/forhandleren')).toBe(true);
    expect(isItemActive(org, '/forhandleren')).toBe(true);
    expect(isItemActive(org, '/innstillinger/team')).toBe(true);
    expect(isItemActive(org, '/innstillinger/tjenestekatalog')).toBe(false);
    const verksted = FORHANDLER_NAV.find((i) => i.key === 'dashboard');
    const jobber = FORHANDLER_NAV.find((i) => i.key === 'saker');
    expect(verksted).toBeDefined();
    expect(jobber).toBeDefined();
    if (!verksted || !jobber) throw new Error('FORHANDLER_NAV mangler Verkstedet/Jobber');
    expect(isItemActive(verksted, '/innstillinger/tjenestekatalog')).toBe(false);
    expect(isItemActive(verksted, '/prisliste')).toBe(false);
    expect(isItemActive(verksted, '/dashboard')).toBe(true);
    expect(isItemActive(verksted, '/verkstedet')).toBe(true);
    expect(isItemActive(jobber, '/innstillinger/tjenestekatalog')).toBe(true);
    expect(isItemActive(jobber, '/prisliste')).toBe(true);
    expect(isItemActive(org, '/mekanikere')).toBe(false);
    expect(isItemActive(org, '/mekanikere/kompetanse')).toBe(true);
    expect(isItemActive(org, '/mekanikere/kapasitet')).toBe(true);
    expect(isItemActive(SETTINGS_NAV, '/innstillinger/team')).toBe(false);
    expect(isItemActive(SETTINGS_NAV, '/innstillinger/tjenestekatalog')).toBe(false);
    expect(isItemActive(SETTINGS_NAV, '/mekanikere')).toBe(false);
  });

  it('Innstillinger-stier aktiverer Innstillinger, ikke Organisasjon', () => {
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

  it('breadcrumb er Organisasjon › underpunkt, ikke Innstillinger', () => {
    expect(breadcrumbFor('/innstillinger/team', '', 'forhandler')).toEqual([
      { label: 'Organisasjon', href: '/organisasjon/forhandleren' },
      { label: 'Team' },
    ]);
    expect(breadcrumbFor('/organisasjon/forhandleren', '', 'forhandler')).toEqual([
      { label: 'Organisasjon', href: '/organisasjon/forhandleren' },
      { label: 'Forhandleren' },
    ]);
    expect(breadcrumbFor('/innstillinger/tjenestekatalog', '', 'forhandler')).toEqual([
      { label: 'Jobber', href: '/jobber' },
      { label: 'Prisliste' },
    ]);
    expect(breadcrumbFor('/prisliste', '', 'forhandler')).toEqual([
      { label: 'Jobber', href: '/jobber' },
      { label: 'Prisliste' },
    ]);
    expect(breadcrumbFor('/mekanikere/kompetanse', '', 'forhandler')).toEqual([
      { label: 'Organisasjon', href: '/organisasjon/forhandleren' },
      { label: 'Kompetanse' },
    ]);
    expect(breadcrumbFor('/innstillinger/varsler', '', 'forhandler')).toEqual([
      { label: 'Innstillinger', href: '/innstillinger/profil' },
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

const FORBUDT_LABEL = [
  'Kontor',
  'Gulvet',
  'Dashboard',
  'Settings',
  'Helpdesk',
  'Feature-flags',
  'AI-verktøy',
  'Ansatte',
  'Tjenestekatalog',
  'Direkte data',
];

function alleNavLabels(): string[] {
  const rader = [
    ...FORHANDLER_NAV,
    ...MEKANIKER_NAV,
    ...LAGER_NAV,
    ...BUTIKK_NAV,
    ...ENDWISE_NAV,
    SETTINGS_NAV,
    ENDWISE_SETTINGS_NAV,
  ];
  return [
    ...rader.map((r) => r.label),
    ...rader.flatMap((r) => r.children?.map((c) => c.label) ?? []),
    ...QUICK_ACTIONS.map((a) => a.label),
  ];
}

describe('Verkstednorsk nav-labels (25.08.2026)', () => {
  it('forhandler: Verkstedet uten dropdown, Jobber▾ Oversikt+Kalender+Prisliste', () => {
    expect(FORHANDLER_NAV.map((i) => i.label)).toEqual([
      'Verkstedet',
      'Innboks',
      'Jobber',
      'Kunder',
      'Organisasjon',
      'Rapporter',
      'Hjelp',
    ]);
    const verksted = FORHANDLER_NAV.find((i) => i.key === 'dashboard');
    expect(verksted?.href).toBe('/dashboard');
    expect(verksted?.children).toBeUndefined();
    const jobber = FORHANDLER_NAV.find((i) => i.key === 'saker');
    expect(jobber?.href).toBe('/jobber');
    expect(jobber?.children?.map((c) => c.label)).toEqual(['Oversikt', 'Kalender', 'Prisliste']);
    expect(jobber?.children?.map((c) => c.href)).toEqual([
      '/jobber',
      '/jobber?visning=kalender',
      '/prisliste',
    ]);
    const rapporter = FORHANDLER_NAV.find((i) => i.key === 'analyse');
    expect(rapporter?.href).toBe('/rapporter');
    expect(rapporter?.children).toBeUndefined();
    expect(FORHANDLER_NAV.some((i) => i.key === 'ai-verktoy')).toBe(false);
    expect(FORHANDLER_NAV.some((i) => i.key === 'samarbeid')).toBe(false);
    expect(FORHANDLER_NAV.find((i) => i.key === 'helpdesk')?.href).toBe('/hjelp');
    expect(FORHANDLER_NAV.find((i) => i.key === 'helpdesk')?.badge).toBe('helpdesk');
  });

  it('mekaniker, lager og endwise-admin matcher tabellen', () => {
    expect(MEKANIKER_NAV.map((i) => i.label)).toEqual([
      'Min dag',
      'Jobbene mine',
      'Kompetanse',
      'Timeplan',
      'Meg',
    ]);
    expect(LAGER_NAV.map((i) => i.label)).toEqual(['Oversikt', 'Deler', 'Plass', 'Inn og ut']);
    expect(ENDWISE_NAV.map((i) => i.label)).toEqual([
      'Oversikt',
      'Innboks',
      'Team',
      'Forhandlere',
      'Hjelpeartikler',
      'Flagg',
    ]);
    expect(QUICK_ACTIONS.map((a) => a.label)).toEqual(['Ny jobb', 'Ny melding', 'Ny kunde']);
    expect(QUICK_ACTIONS[0]?.href).toBe('/bookinger/ny');
  });

  it('forbudte ord er ikke synlige nav-labels', () => {
    const labels = alleNavLabels();
    for (const forbudt of FORBUDT_LABEL) {
      expect(labels).not.toContain(forbudt);
    }
  });

  it('hrefs er uendret for omdøpte rader', () => {
    expect(LAGER_NAV.find((i) => i.label === 'Plass')?.href).toBe('/lager/lokasjoner');
    expect(LAGER_NAV.find((i) => i.label === 'Inn og ut')?.href).toBe('/lager/bevegelser');
    expect(MEKANIKER_NAV.find((i) => i.label === 'Jobbene mine')?.href).toBe('/mekaniker/arbeid');
    expect(ENDWISE_NAV.find((i) => i.label === 'Flagg')?.href).toBe('/endwise/flagg');
    expect(SETTINGS_NAV.href).toBe('/innstillinger/profil');
  });

  it('breadcrumb og PARKED_LABEL følger de nye navnene', () => {
    expect(breadcrumbFor('/saker', '', 'forhandler')).toEqual([
      { label: 'Jobber', href: '/jobber' },
      { label: 'Oversikt' },
    ]);
    expect(breadcrumbFor('/jobber', '', 'forhandler')).toEqual([
      { label: 'Jobber', href: '/jobber' },
      { label: 'Oversikt' },
    ]);
    expect(breadcrumbFor('/saker', 'visning=kalender', 'forhandler')).toEqual([
      { label: 'Jobber', href: '/jobber' },
      { label: 'Kalender' },
    ]);
    expect(breadcrumbFor('/analyse', '', 'forhandler')).toEqual([
      { label: 'Rapporter', href: '/rapporter' },
    ]);
    expect(breadcrumbFor('/rapporter', '', 'forhandler')).toEqual([
      { label: 'Rapporter', href: '/rapporter' },
    ]);
    expect(breadcrumbFor('/analyse', 'visning=direkte', 'forhandler')).toEqual([
      { label: 'Rapporter', href: '/rapporter' },
    ]);
    const rapporter = FORHANDLER_NAV.find((i) => i.key === 'analyse');
    expect(rapporter).toBeDefined();
    if (!rapporter) throw new Error('FORHANDLER_NAV mangler Rapporter');
    expect(isItemActive(rapporter, '/analyse')).toBe(true);
    expect(isItemActive(rapporter, '/rapporter')).toBe(true);
    expect(breadcrumbFor('/support', '', 'forhandler')).toEqual([
      { label: 'Hjelp', href: '/hjelp' },
    ]);
    expect(breadcrumbFor('/hjelp', '', 'forhandler')).toEqual([{ label: 'Hjelp', href: '/hjelp' }]);
    expect(breadcrumbFor('/dashboard', '', 'forhandler')).toEqual([
      { label: 'Verkstedet', href: '/dashboard' },
    ]);
    expect(breadcrumbFor('/verkstedet', '', 'forhandler')).toEqual([
      { label: 'Verkstedet', href: '/dashboard' },
    ]);
    expect(breadcrumbFor('/integrasjoner', '', 'forhandler')).toEqual([
      { label: 'Innstillinger', href: '/innstillinger/profil' },
      { label: 'Koblinger' },
    ]);
    expect(breadcrumbFor('/ai-innsikt', '', 'forhandler')).toEqual([
      { label: 'Parkert · Innsikt' },
    ]);
    expect(PARKED_LABEL['/support']).toBe('Hjelp');
    expect(PARKED_LABEL['/innstillinger/tjenestekatalog']).toBe('Jobber · Prisliste');
    expect(PARKED_LABEL['/prisliste']).toBe('Jobber · Prisliste');
    expect(PARKED_LABEL['/lager/lokasjoner']).toBe('Lager · Plass');
    expect(PARKED_LABEL['/lager/bevegelser']).toBe('Lager · Inn og ut');
    expect(PARKED_LABEL['/admin/flagg']).toBe('Parkert · Flagg');
    expect(PARKED_LABEL['/ai-verktoy/diagnose']).toBe('Parkert · Diagnose');
  });
});
