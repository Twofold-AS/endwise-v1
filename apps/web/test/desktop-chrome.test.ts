import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV, MEKANIKER_NAV } from '../app/(app)/_shell/nav.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Mikael desktop-chrome 01.09.2026', () => {
  it('forhandler-nav: Tjenester deretter Organisasjon under Kunder, uten Samarbeid/Bot/Hjelp', () => {
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
    const kunder = FORHANDLER_NAV.findIndex((i) => i.key === 'kunder');
    expect(FORHANDLER_NAV[kunder + 1]?.label).toBe('Tjenester');
    expect(FORHANDLER_NAV[kunder + 2]?.label).toBe('Organisasjon');
    expect(FORHANDLER_NAV.find((i) => i.key === 'tjenester')?.href).toBe('/prisliste');
    expect(FORHANDLER_NAV.some((i) => /Samarbeid|Bot|Hjelp|Salg/.test(i.label))).toBe(false);
    expect(MEKANIKER_NAV.some((i) => i.label === 'Hjelp')).toBe(false);
  });

  it('sidebar: hvit, ingen header-divider, +2px gap, TipCard, ingen avatar', () => {
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    const header = utenKommentarer(les('../app/(app)/_shell/sidebar-header.tsx'));
    const rad = utenKommentarer(les('../app/(app)/_shell/bruker-rad.tsx'));
    expect(sidebar).toMatch(/bg-\[#ffffff\]/);
    expect(sidebar).not.toMatch(/border-b |border-b"|header[\s\S]*border-b/);
    expect(sidebar).toMatch(/gap-\[4px\]/);
    expect(sidebar).toMatch(/TipCard/);
    expect(sidebar).toMatch(/variant="sidebar"/);
    expect(header).toMatch(/LOGO = 32/);
    expect(header).toMatch(/text-title/);
    expect(rad).toMatch(/telefon \? avatar : null/);
    expect(rad).toMatch(/collapsed && !telefon/);
    expect(rad).toMatch(/LogOut/);
  });

  it('app-skall: ingen breadcrumb-topbar, ingen Grainient, ingen mørkt-toggle, ShaderGradient-stripe', () => {
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    const rot = les('../app/layout.tsx');
    const workshop = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
    const globals = les('../app/globals.css');
    const profil = utenKommentarer(les('../app/(app)/innstillinger/_profil-fane.tsx'));
    const meg = utenKommentarer(les('../app/(app)/min-dag/meg/page.tsx'));
    expect(layout).not.toMatch(/TopBar/);
    expect(layout).toMatch(/WorkshopBloub/);
    expect(rot).toMatch(/data-theme="light"/);
    expect(rot).not.toMatch(/TEMA_SKRIPT|endwise:tema/);
    expect(workshop).toMatch(/ShaderGradientBakgrunn/);
    expect(workshop).toMatch(/data-workshop-strip/);
    expect(workshop).not.toMatch(/fixed[\s\S]*bottom/);
    expect(workshop).not.toMatch(/Grainient/);
    expect(globals).not.toMatch(/grainient/);
    expect(profil).not.toMatch(/Mørkt tema|settTema/);
    expect(meg).not.toMatch(/Mørkt tema|byttTema/);
  });
});
