import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORHANDLER_NAV, FORHANDLER_NAV_GRUPPER } from '../app/(app)/_shell/nav.ts';
import {
  DEALER_PHONE_HJEM,
  dealerPhoneHjemRader,
  PHONE_DEST_FYLL,
  PHONE_HERO_FYLL,
} from '../app/(app)/_shell/phone-home.ts';
import { destinasjonFaner } from '../app/(app)/_shell/seksjon-faner.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Forhandler UI-system — tokens', () => {
  it('kanoniske Apple-flater og tre blå bor i widget-tokens', () => {
    const css = les('../../../packages/widget-tokens/src/tokens.css');
    const light = css.slice(0, css.indexOf('[data-theme="dark"]'));
    expect(light).toMatch(/--ew-accent-strong:\s*#0071e3/);
    expect(light).toMatch(/--ew-accent:\s*#0066cc/);
    expect(light).toMatch(/--ew-accent-on-dark:\s*#2997ff/);
    expect(light).toMatch(/--ew-fg:\s*#1d1d1f/);
    expect(light).toMatch(/--ew-bg:\s*#f5f5f7/);
    expect(light).toMatch(/--ew-inset:\s*#f4f8fb/);
    expect(light).toMatch(/--ew-disabled:\s*#e2e2e5/);
    expect(light).toMatch(/--ew-border:\s*#d2d2d7/);
    expect(light).toMatch(/--ew-surface:\s*#ffffff/);
    expect(light).toMatch(/--ew-sidebar-active:\s*#0071e3/);
    expect(css).toMatch(/--ew-radius-pill:\s*980px/);
    expect(css).toMatch(/--ew-radius-xl:\s*8px/);
    expect(css).toMatch(/--ew-radius-sheet:\s*16px/);
    expect(light).toMatch(/--ew-bevel-shadow:\s*none/);
  });

  it('fylt primær peker på Apple Blue, outline på Link Blue', () => {
    const tema = les('../../../packages/ui/src/theme.css');
    const knapp = utenKommentarer(les('../../../packages/ui/src/components/button.tsx'));
    expect(tema).toMatch(/--primary:\s*var\(--ew-accent-strong\)/);
    expect(tema).toMatch(/--text-body--letter-spacing:\s*-0\.016em/);
    expect(knapp).toMatch(/bg-primary/);
    expect(knapp).toMatch(/border-\[var\(--ew-accent\)\]/);
  });
});

describe('Forhandler UI-system — sidebar Fluid-kontrakt', () => {
  it('inset + offcanvas, ingen ikon-skinne, cookie kun desktop, resize 160–360', () => {
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    const state = utenKommentarer(les('../app/(app)/_shell/sidebar-state.tsx'));
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    expect(sidebar).toMatch(/data-sidebar-variant="inset"/);
    expect(sidebar).toMatch(/data-sidebar-collapsible="offcanvas"/);
    expect(sidebar).toMatch(/data-sidebar-peek-edge/);
    expect(sidebar).not.toMatch(/md:w-\[52px\]/);
    expect(state).toMatch(/SIDEBAR_COOKIE_NAME = 'sidebar_state'/);
    expect(state).toMatch(/erDesktop\(\)/);
    expect(state).toMatch(/phoneOpen/);
    expect(state).toMatch(/SIDEBAR_MIN_WIDTH = 160/);
    expect(state).toMatch(/SIDEBAR_MAX_WIDTH = 360/);
    expect(sidebar).toMatch(/data-sidebar-resize/);
    expect(layout).toMatch(/data-shell-inset/);
    expect(layout).toMatch(/md:rounded-lg md:border md:border-border md:bg-card/);
    expect(sidebar).not.toMatch(/ContextSwitcher/);
  });

  it('IA: Verkstedet Innboks Jobber Kunder · Samarbeid Rapporter Organisasjon Lager · footer Hjelp', () => {
    expect(FORHANDLER_NAV_GRUPPER[0]?.keys).toEqual(['dashboard', 'innboks', 'jobber', 'kunder']);
    expect(FORHANDLER_NAV_GRUPPER[1]?.keys).toEqual([
      'samarbeid',
      'rapporter',
      'organisasjon',
      'lager',
      'butikk',
    ]);
    expect(FORHANDLER_NAV.find((i) => i.group === 'footer')?.label).toBe('Hjelp');
    expect(FORHANDLER_NAV.some((i) => i.label === 'Tjenester')).toBe(false);
  });
});

describe('Forhandler UI-system — hjem', () => {
  it('Frost-kort radius 8, 2×2-rutenett med Samarbeid|Hjelp, Lager sist', () => {
    expect(PHONE_HERO_FYLL).toMatch(/rounded-lg/);
    expect(PHONE_DEST_FYLL).toMatch(/rounded-lg/);
    expect(PHONE_HERO_FYLL).toMatch(/shadow-none/);
    expect(DEALER_PHONE_HJEM.map((r) => r.keys.join('|'))).toEqual([
      'verkstedet',
      'timeplan|statistikk',
      'innboks|jobber',
      'kunder|organisasjon',
      'samarbeid|hjelp',
      'lager',
    ]);
    expect(dealerPhoneHjemRader(false).at(-1)?.keys).toEqual(['lager']);
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(hjem).toMatch(/HJEM_CTA_FYLT/);
    expect(hjem).toMatch(/HJEM_CTA_OUTLINE/);
    expect(hjem).toMatch(/I dag/);
  });
});

describe('Forhandler UI-system — Organisasjon uten top-bar 2', () => {
  it('dealer-layout monterer ikke destinasjonspiller; Organisasjon er én fane', () => {
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    const bar = utenKommentarer(les('../app/(app)/_shell/seksjon-bar.tsx'));
    expect(layout).not.toMatch(/DestinasjonSeksjonBar/);
    expect(bar).toMatch(/shell === 'forhandler'\) return null/);
    expect(
      destinasjonFaner({
        pathname: '/organisasjon',
        role: 'dealer_admin',
        shell: 'forhandler',
      }).map((f) => f.label),
    ).toEqual(['Organisasjon']);
  });
});

describe('Forhandler UI-system — telefon-chrome urørt', () => {
  it('PhoneShell: merke midt, hale-pil, Ronny venstre for toggle, z-60', () => {
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    expect(shell).toMatch(/fixed inset-x-0 top-0 z-\[60\]/);
    expect(shell).toMatch(/data-ronny-avatar/);
    expect(shell).toMatch(/data-phone-sidebar-open/);
    expect(shell).toMatch(/TilbakePil/);
    expect(shell).toMatch(/md:hidden/);
    expect(shell).not.toMatch(/Endwise/);
  });
});
