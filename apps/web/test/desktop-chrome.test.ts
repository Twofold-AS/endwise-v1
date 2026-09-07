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

  it('sidebar: seksjon, canvas-soft aktiv uten pip, tekst venstre, OppgraderPille, ingen avatar', () => {
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    const header = utenKommentarer(les('../app/(app)/_shell/sidebar-header.tsx'));
    const rad = utenKommentarer(les('../app/(app)/_shell/bruker-rad.tsx'));
    expect(sidebar).toMatch(/bg-sidebar/);
    expect(sidebar).not.toMatch(/bg-\[#ffffff\]/);
    expect(header).not.toMatch(/border-b/);
    expect(sidebar).not.toMatch(/min-h-10 shrink-0 items-center py-2[\s\S]{0,80}border-b-/);
    expect(sidebar).toMatch(/gap-\[4px\]/);
    expect(sidebar).toMatch(/data-sidebar-section/);
    expect(sidebar).toMatch(/bg-sidebar-active/);
    expect(sidebar).toMatch(/rounded-pill/);
    expect(sidebar).not.toMatch(/data-sidebar-pip/);
    expect(sidebar).not.toMatch(/bg-accent-pip/);
    expect(sidebar).not.toMatch(/border-l-|border-left/);
    expect(sidebar).toMatch(/text-left/);
    expect(sidebar).not.toMatch(/md:text-right/);
    expect(sidebar).toMatch(/TemaToggle/);
    expect(sidebar).toMatch(/OppgraderPille/);
    expect(sidebar).not.toMatch(/<TipCard/);
    expect(sidebar).toMatch(/BrukerRad/);
    expect(sidebar).not.toMatch(/settingsNav \? \(/);
    expect(sidebar).not.toMatch(/-mx-3 h-px bg-border/);
    expect(header).toMatch(/SHELL_LOGO_PX/);
    expect(header).not.toMatch(/text-title text-fg/);
    expect(rad).not.toMatch(/Avatar|BEVEL|variant === 'phone'/);
    expect(rad).toMatch(/if \(collapsed\)/);
    expect(rad).toMatch(/LogOut/);
    expect(rad).toMatch(/mx-2|md:mx-0/);
    expect(rad).toMatch(/min-w-0 flex-1 truncate/);
  });

  it('app-skall: breadcrumb-topbar over boks 2, dual theme, ingen Ronny-stripe på desktop', () => {
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    const rot = utenKommentarer(les('../app/layout.tsx'));
    const workshop = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
    const globals = les('../app/globals.css');
    const tema = les('../app/(app)/_lib/tema.ts');
    expect(layout).toMatch(/TopBar/);
    expect(layout).toMatch(/StandbyPanel/);
    expect(layout).toMatch(/data-desktop-axis/);
    expect(layout).toMatch(/md:w-\[1050px\]/);
    expect(layout).toMatch(/md:w-\[598px\]/);
    expect(layout).toMatch(/WorkshopBloub/);
    expect(rot).toMatch(/TEMA_SKRIPT/);
    expect(rot).toMatch(/Inter/);
    expect(rot).not.toMatch(/Geist/);
    expect(rot).toMatch(/suppressHydrationWarning/);
    expect(tema).toMatch(/endwise:tema/);
    expect(tema).toMatch(/classList.toggle\('dark'/);
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
  });
});
