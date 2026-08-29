import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  breadcrumbFor,
  ENDWISE_NAV,
  ENDWISE_SETTINGS_NAV,
  erSettingsSti,
  FORHANDLER_NAV,
  isItemActive,
  itemsForRole,
  MEKANIKER_NAV,
  PARKED_LABEL,
  QUICK_ACTIONS,
  SETTINGS_NAV,
  shellForBruker,
} from '../app/(app)/_shell/nav.ts';

/**
 * Jonas IA 28.08.2026 — ett skall, piller på siden, ikke visningsvelger.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Jonas IA — forhandler sidebar', () => {
  it('rader uten barn i sidebaren, piller på siden', () => {
    expect(FORHANDLER_NAV.map((i) => i.label)).toEqual([
      'Verkstedet',
      'Innboks',
      'Timeplan',
      'Kunder',
      'Lager',
      'Butikk',
      'Samarbeid',
      'Salg',
      'Organisasjon',
      'Hjelp',
    ]);
    for (const rad of FORHANDLER_NAV) {
      expect(rad.children).toBeUndefined();
    }
    expect(FORHANDLER_NAV.find((i) => i.key === 'saker')?.pills?.map((p) => p.label)).toEqual([
      'Liste',
      'Kalender',
    ]);
    expect(FORHANDLER_NAV.find((i) => i.key === 'kunder')?.pills?.map((p) => p.label)).toEqual([
      'Kunder',
      'Kjøretøy',
    ]);
    expect(FORHANDLER_NAV.find((i) => i.key === 'lager')?.pills?.map((p) => p.label)).toEqual([
      'Oversikt',
      'Deler',
      'Plass',
      'Inn og ut',
    ]);
    expect(FORHANDLER_NAV.find((i) => i.key === 'butikk')?.pills?.map((p) => p.label)).toEqual([
      'Katalog',
      'Handlekurv / kasse',
    ]);
    expect(FORHANDLER_NAV.find((i) => i.key === 'organisasjon')?.label).toBe('Organisasjon');
    expect(
      FORHANDLER_NAV.find((i) => i.key === 'organisasjon')?.pills?.map((p) => p.label),
    ).toEqual(['Oversikt', 'Ansatte', 'Abonnement', 'Integrasjoner']);
    expect(FORHANDLER_NAV.find((i) => i.key === 'helpdesk')?.href).toBe('/support');
    expect(FORHANDLER_NAV.find((i) => i.key === 'samarbeid')?.dividerBefore).toBe(true);
    expect(FORHANDLER_NAV.find((i) => i.key === 'helpdesk')?.dividerBefore).toBe(true);
    expect(FORHANDLER_NAV.some((i) => i.label === 'Forhandleren')).toBe(false);
    expect(FORHANDLER_NAV.some((i) => i.label === 'Organisasjon')).toBe(true);
    expect(FORHANDLER_NAV.some((i) => i.label === 'Admin')).toBe(false);
  });

  it('selger og forhandler ser samme rader; butikk skjules uten flagg', () => {
    const admin = itemsForRole(FORHANDLER_NAV, 'dealer_admin', true).map((i) => i.label);
    const staff = itemsForRole(FORHANDLER_NAV, 'dealer_staff', true).map((i) => i.label);
    expect(admin).toEqual(staff);
    expect(
      itemsForRole(FORHANDLER_NAV, 'dealer_staff', false).some((i) => i.key === 'butikk'),
    ).toBe(false);
  });

  it('Innstillinger er profil-destinasjon uten flyout', () => {
    expect(SETTINGS_NAV.href).toBe('/innstillinger/profil');
    expect(SETTINGS_NAV.children).toBeUndefined();
    expect(isItemActive(SETTINGS_NAV, '/innstillinger/varsler')).toBe(true);
    expect(isItemActive(SETTINGS_NAV, '/abonnement')).toBe(false);
    expect(erSettingsSti('/innstillinger/team')).toBe(false);
  });
});

describe('Jonas IA — mekaniker og endwise', () => {
  it('mekaniker-nav er Dine jobber / jobbene / lager / butikk / kompetanse / timeplan / hjelp / meg', () => {
    expect(MEKANIKER_NAV.map((i) => i.label)).toEqual([
      'Dine jobber',
      'Jobbene mine',
      'Lager',
      'Butikk',
      'Kompetanse',
      'Timeplan',
      'Hjelp',
      'Meg',
    ]);
    expect(MEKANIKER_NAV.find((i) => i.key === 'lager')?.pills?.map((p) => p.label)).toEqual([
      'Oversikt',
    ]);
    expect(MEKANIKER_NAV.find((i) => i.key === 'butikk')?.pills?.map((p) => p.label)).toEqual([
      'Katalog',
    ]);
    expect(MEKANIKER_NAV.some((i) => i.label === 'Verkstedet')).toBe(false);
    expect(MEKANIKER_NAV.some((i) => i.label === 'Ansatte')).toBe(false);
    expect(MEKANIKER_NAV.some((i) => i.label === 'Innstillinger')).toBe(false);
  });

  it('endwise-admin har Forhandlere før Team; partner ser ikke Team/Flagg', () => {
    expect(ENDWISE_NAV.map((i) => i.label)).toEqual([
      'Oversikt',
      'Innboks',
      'Forhandlere',
      'Team',
      'Hjelpeartikler',
      'Flagg',
    ]);
    expect(itemsForRole(ENDWISE_NAV, 'endwise_support').map((i) => i.label)).toEqual([
      'Oversikt',
      'Innboks',
      'Forhandlere',
    ]);
    expect(ENDWISE_NAV.some((i) => i.label === 'Admin')).toBe(false);
    expect(ENDWISE_SETTINGS_NAV.href).toBe('/innstillinger/profil');
  });

  it('ett skall per innlogging', () => {
    expect(
      shellForBruker({ role: 'dealer_staff', jobFunction: 'mekaniker', isMechanic: true }),
    ).toBe('mekaniker');
    expect(shellForBruker({ role: 'dealer_staff', jobFunction: 'selger' })).toBe('forhandler');
    expect(shellForBruker({ role: 'dealer_admin' })).toBe('forhandler');
    expect(shellForBruker({ role: 'endwise_support', erPlattform: true })).toBe('endwise_partner');
    expect(shellForBruker({ role: 'endwise_admin', erPlattform: true })).toBe('endwise');
  });
});

describe('Jonas IA — breadcrumb og piller', () => {
  it('Timeplan / Ansatte / Lager bruker piller, ikke sidebar-barn', () => {
    expect(breadcrumbFor('/jobber', '', 'forhandler')).toEqual([
      { label: 'Timeplan', href: '/jobber' },
      { label: 'Liste' },
    ]);
    expect(breadcrumbFor('/jobber', 'visning=kalender', 'forhandler')).toEqual([
      { label: 'Timeplan', href: '/jobber' },
      { label: 'Kalender' },
    ]);
    expect(breadcrumbFor('/prisliste', '', 'forhandler')).toEqual([
      { label: 'Salg', href: '/prisliste' },
    ]);
    expect(breadcrumbFor('/organisasjon', 'seksjon=ansatte', 'forhandler')).toEqual([
      { label: 'Organisasjon', href: '/organisasjon' },
      { label: 'Ansatte' },
    ]);
    expect(breadcrumbFor('/lager', '', 'forhandler')).toEqual([
      { label: 'Lager', href: '/lager' },
      { label: 'Oversikt' },
    ]);
    expect(breadcrumbFor('/support', '', 'forhandler')).toEqual([
      { label: 'Hjelp', href: '/support' },
    ]);
    expect(PARKED_LABEL['/prisliste']).toBe('Salg');
  });

  it('ingen visningsvelger i sidebaren', () => {
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    expect(sidebar).not.toMatch(/ContextSwitcher/);
    expect(sidebar).toMatch(/SidebarHeader/);
    expect(QUICK_ACTIONS[0]?.href).toBe('/bookinger/ny');
  });
});
