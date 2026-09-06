import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DESKTOP_AXIS_W,
  DESKTOP_BOX2_W,
  DESKTOP_BOX3_W,
  DESKTOP_NAV_BTN_H,
  DESKTOP_NAV_BTN_W,
  DESKTOP_NAV_IKON,
  DESKTOP_NAV_LABEL_H,
  DESKTOP_NAV_LABEL_W,
  DESKTOP_PROFIL_H,
  DESKTOP_PROFIL_W,
  DESKTOP_SIDEBAR_INNER_W,
  DESKTOP_SIDEBAR_INSET,
  DESKTOP_SIDEBAR_W,
  DESKTOP_TOPBAR_H,
} from '../app/(app)/_shell/desktop-shell.ts';
import { FORHANDLER_NAV, landingForRole } from '../app/(app)/_shell/nav.ts';
import { erDealerPhoneHjem, phoneHjemHref } from '../app/(app)/_shell/phone-home.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Mikael desktop tre-kolonner + /home', () => {
  it('låser 389 + 598 + 452 = 1439, akse 1050, toppbar 53', () => {
    expect(DESKTOP_SIDEBAR_W).toBe(389);
    expect(DESKTOP_SIDEBAR_INNER_W).toBe(259);
    expect(DESKTOP_SIDEBAR_INSET).toBe(26);
    expect(DESKTOP_BOX2_W).toBe(598);
    expect(DESKTOP_BOX3_W).toBe(452);
    expect(DESKTOP_AXIS_W).toBe(1050);
    expect(DESKTOP_BOX2_W + DESKTOP_BOX3_W).toBe(DESKTOP_AXIS_W);
    expect(DESKTOP_TOPBAR_H).toBe(53);
    expect(DESKTOP_NAV_IKON).toBe(26);
    expect(DESKTOP_NAV_BTN_W).toBe(141);
    expect(DESKTOP_NAV_BTN_H).toBe(50);
    expect(DESKTOP_NAV_LABEL_W).toBe(55);
    expect(DESKTOP_NAV_LABEL_H).toBe(24);
    expect(DESKTOP_PROFIL_W).toBe(259);
    expect(DESKTOP_PROFIL_H).toBe(65);
  });

  it('layout splitter toppbar over boks 2 og tom standby over boks 3', () => {
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    const topbar = utenKommentarer(les('../app/(app)/_shell/top-bar.tsx'));
    const standby = utenKommentarer(les('../app/(app)/_shell/standby-panel.tsx'));
    expect(layout).toMatch(/data-desktop-axis/);
    expect(layout).toMatch(/data-shell-box="2"/);
    expect(layout).toMatch(/md:w-\[1050px\]/);
    expect(layout).toMatch(/md:w-\[598px\]/);
    expect(layout).toMatch(/<TopBar/);
    expect(layout).toMatch(/<StandbyPanel/);
    expect(layout).not.toMatch(/DestinasjonSeksjonBar/);
    expect(topbar).toMatch(/data-shell-topbar="2"/);
    expect(topbar).toMatch(/h-\[53px\]/);
    expect(topbar).toMatch(/md:w-\[598px\]/);
    expect(topbar).toMatch(/hidden[\s\S]*md:flex/);
    expect(standby).toMatch(/data-shell-box="3"/);
    expect(standby).toMatch(/data-shell-topbar="3"/);
    expect(standby).toMatch(/w-\[452px\]/);
    expect(standby).toMatch(/h-\[53px\]/);
    expect(standby).toMatch(/hidden[\s\S]*md:flex/);
    expect(standby).not.toMatch(/Ronny|Grainient|Galaxy|frost|fluid/);
  });

  it('sidebar desktop: 389 / inner 259 / inset 26 / nav 141×50 / gap-0 / profil 259×65', () => {
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    const rad = utenKommentarer(les('../app/(app)/_shell/bruker-rad.tsx'));
    expect(sidebar).toMatch(/data-shell-box="1"/);
    expect(sidebar).toMatch(/md:w-\[389px\]/);
    expect(sidebar).toMatch(/md:w-\[259px\]/);
    expect(sidebar).toMatch(/md:ml-\[26px\]/);
    expect(sidebar).toMatch(/md:h-\[50px\]/);
    expect(sidebar).toMatch(/md:w-\[141px\]/);
    expect(sidebar).toMatch(/md:gap-0/);
    expect(sidebar).toMatch(/IKON_DESKTOP = 26/);
    expect(sidebar).toMatch(/const IKON = 16/);
    expect(rad).toMatch(/md:h-\[65px\]/);
    expect(rad).toMatch(/md:w-\[259px\]/);
  });

  it('kanonisk landing er /home; /dashboard redirecter og beholdes som alias', () => {
    expect(FORHANDLER_NAV.find((i) => i.key === 'home')?.href).toBe('/home');
    expect(landingForRole('dealer_admin', false)).toBe('/home');
    expect(phoneHjemHref('forhandler')).toBe('/home');
    expect(erDealerPhoneHjem('/home', '')).toBe(true);
    expect(erDealerPhoneHjem('/dashboard', '')).toBe(true);
    const gammel = utenKommentarer(les('../app/(app)/dashboard/page.tsx'));
    expect(gammel).toMatch(/redirect\(/);
    expect(gammel).toMatch(/\/home/);
    const inspect = utenKommentarer(les('../app/(app)/endwise/verksted/[slug]/dashboard/page.tsx'));
    expect(inspect).toMatch(/redirect\(/);
    expect(inspect).toMatch(/\/home/);
  });

  it('⛔ ikke Attio HTML-preview, Fluid eller frost', () => {
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    expect(`${layout}\n${sidebar}`).not.toMatch(/frost|fluid|backdrop-blur|ColorBends|DotField/);
  });
});
