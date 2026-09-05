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
  it('forhandler-nav: Jobber under Innboks, deretter Samarbeid/Rapporter/Organisasjon, Hjelp i footer', () => {
    expect(FORHANDLER_NAV.filter((i) => i.group !== 'footer').map((i) => i.label)).toEqual([
      'Verkstedet',
      'Innboks',
      'Jobber',
      'Kunder',
      'Samarbeid',
      'Rapporter',
      'Organisasjon',
      'Lager',
      'Butikk',
    ]);
    const kunder = FORHANDLER_NAV.findIndex((i) => i.key === 'kunder');
    expect(FORHANDLER_NAV[kunder + 1]?.label).toBe('Samarbeid');
    expect(FORHANDLER_NAV.find((i) => i.group === 'footer')?.label).toBe('Hjelp');
    expect(FORHANDLER_NAV.some((i) => i.key === 'tjenester')).toBe(false);
    expect(FORHANDLER_NAV.some((i) => /Bot|Salg/.test(i.label))).toBe(false);
    expect(MEKANIKER_NAV.some((i) => i.label === 'Hjelp')).toBe(false);
  });

  it('sidebar: inset/offcanvas, grupper, OppgraderPille, bevel-avatar', () => {
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    const header = utenKommentarer(les('../app/(app)/_shell/sidebar-header.tsx'));
    const rad = utenKommentarer(les('../app/(app)/_shell/bruker-rad.tsx'));
    expect(sidebar).toMatch(/data-sidebar-variant="inset"/);
    expect(sidebar).toMatch(/data-sidebar-collapsible="offcanvas"/);
    expect(sidebar).not.toMatch(/md:w-\[52px\]/);
    expect(header).not.toMatch(/border-b/);
    expect(sidebar).toMatch(/gap-\[4px\]/);
    expect(sidebar).toMatch(/OppgraderPille/);
    expect(sidebar).not.toMatch(/<TipCard/);
    expect(sidebar).toMatch(/BrukerRad/);
    expect(sidebar).not.toMatch(/settingsNav \? \(/);
    expect(header).toMatch(/SHELL_LOGO_PX/);
    expect(rad).toMatch(/Avatar/);
    expect(rad).toMatch(/BEVEL/);
    expect(rad).toMatch(/LogOut/);
    expect(rad).toMatch(/min-w-0 flex-1 truncate/);
  });

  it('app-skall: ingen breadcrumb-topbar, ingen mørkt-toggle, ingen Ronny-stripe på desktop', () => {
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
    expect(workshop).not.toMatch(/<Grainient/);
    expect(workshop).not.toMatch(/data-workshop-strip/);
    expect(workshop).not.toMatch(/Trykk på KI-Ronny/);
    expect(workshop).toMatch(/md:hidden/);
    expect(workshop).toMatch(/data-ronny-sheet/);
    expect(workshop).toMatch(/data-ronny-desktop-panel/);
    expect(workshop).toMatch(/max-w-\[400px\]/);
    expect(workshop).toMatch(/data-workshop-dock/);
    expect(workshop).toMatch(/fixed inset-x-0 bottom-0/);
    expect(workshop).toMatch(/data-ronny-composer/);
    expect(workshop).toMatch(/data-ronny-utvid/);
    expect(workshop).not.toMatch(/ShaderGradient/);
    expect(globals).toMatch(/grainient\.css/);
    expect(profil).not.toMatch(/Mørkt tema|settTema/);
    expect(meg).not.toMatch(/Mørkt tema|byttTema/);
  });
});
