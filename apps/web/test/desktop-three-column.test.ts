import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DESKTOP_AXIS_W,
  DESKTOP_BOX2_W,
  DESKTOP_BOX3_W,
  DESKTOP_ENTERPRISE_H,
  DESKTOP_ENTERPRISE_PX,
  DESKTOP_ENTERPRISE_W,
  DESKTOP_KORT_H,
  DESKTOP_KORT_PX,
  DESKTOP_KORT_PY,
  DESKTOP_KORT_W,
  DESKTOP_LOGO_H,
  DESKTOP_NAV_BTN_H,
  DESKTOP_NAV_BTN_PAD,
  DESKTOP_NAV_BTN_W,
  DESKTOP_NAV_IKON,
  DESKTOP_NAV_LABEL_H,
  DESKTOP_NAV_LABEL_SIZE,
  DESKTOP_PEOPLE_H,
  DESKTOP_PEOPLE_IKON_H,
  DESKTOP_PEOPLE_IKON_W,
  DESKTOP_PEOPLE_W,
  DESKTOP_PROFIL_H,
  DESKTOP_PROFIL_PAD,
  DESKTOP_PROFIL_W,
  DESKTOP_SIDEBAR_CHROME_W,
  DESKTOP_SIDEBAR_INNER_W,
  DESKTOP_SIDEBAR_PAD,
  DESKTOP_SIDEBAR_RAIL_W,
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
    expect(DESKTOP_SIDEBAR_CHROME_W).toBe(275);
    expect(DESKTOP_SIDEBAR_RAIL_W).toBe(114);
    expect(DESKTOP_SIDEBAR_W - DESKTOP_SIDEBAR_CHROME_W).toBe(DESKTOP_SIDEBAR_RAIL_W);
    expect(DESKTOP_SIDEBAR_PAD).toBe(8);
    expect(DESKTOP_SIDEBAR_INNER_W).toBe(259);
    expect(DESKTOP_SIDEBAR_PAD + DESKTOP_SIDEBAR_INNER_W + DESKTOP_SIDEBAR_PAD).toBe(
      DESKTOP_SIDEBAR_CHROME_W,
    );
    expect(DESKTOP_BOX2_W).toBe(598);
    expect(DESKTOP_BOX3_W).toBe(452);
    expect(DESKTOP_AXIS_W).toBe(1050);
    expect(DESKTOP_BOX2_W + DESKTOP_BOX3_W).toBe(DESKTOP_AXIS_W);
    expect(DESKTOP_TOPBAR_H).toBe(53);
    expect(DESKTOP_NAV_IKON).toBe(26);
    expect(DESKTOP_NAV_BTN_W).toBe(259);
    expect(DESKTOP_NAV_BTN_H).toBe(50);
    expect(DESKTOP_NAV_BTN_PAD).toBe(12);
    expect(DESKTOP_NAV_LABEL_H).toBe(26);
    expect(DESKTOP_NAV_LABEL_SIZE).toBe(21);
    expect(DESKTOP_PROFIL_W).toBe(259);
    expect(DESKTOP_PROFIL_H).toBe(65);
    expect(DESKTOP_PROFIL_PAD).toBe(12);
    expect(DESKTOP_ENTERPRISE_W).toBe(233);
    expect(DESKTOP_ENTERPRISE_H).toBe(52);
    expect(DESKTOP_ENTERPRISE_PX).toBe(32);
    expect(DESKTOP_LOGO_H).toBe(30);
    expect(DESKTOP_KORT_W).toBe(348);
    expect(DESKTOP_KORT_H).toBe(160);
    expect(DESKTOP_KORT_PX).toBe(16);
    expect(DESKTOP_KORT_PY).toBe(20);
    expect(DESKTOP_PEOPLE_W).toBe(182);
    expect(DESKTOP_PEOPLE_H).toBe(40);
    expect(DESKTOP_PEOPLE_IKON_W).toBe(20);
    expect(DESKTOP_PEOPLE_IKON_H).toBe(19);
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

  it('sidebar desktop: 389 / chrome 275 flush-right / nav 259×50 pad 12 / enterprise 233×52 / ingen Handlinger eller toggle', () => {
    const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
    const header = utenKommentarer(les('../app/(app)/_shell/sidebar-header.tsx'));
    const rad = utenKommentarer(les('../app/(app)/_shell/bruker-rad.tsx'));
    const pille = utenKommentarer(les('../app/(app)/_shell/oppgrader-pille.tsx'));
    expect(sidebar).toMatch(/data-shell-box="1"/);
    expect(sidebar).toMatch(/md:w-\[389px\]/);
    expect(sidebar).toMatch(/md:w-\[275px\]/);
    expect(sidebar).toMatch(/md:ml-auto/);
    expect(sidebar).toMatch(/md:px-2/);
    expect(sidebar).toMatch(/md:w-\[259px\]/);
    expect(sidebar).not.toMatch(/md:ml-\[26px\]/);
    expect(sidebar).toMatch(/md:h-\[50px\]/);
    expect(sidebar).not.toMatch(/md:w-\[141px\]/);
    expect(sidebar).toMatch(/md:px-3/);
    expect(sidebar).toMatch(/md:justify-between/);
    expect(sidebar).toMatch(/md:text-right/);
    expect(sidebar).toMatch(/md:text-\[21px\]/);
    expect(sidebar).toMatch(/md:leading-\[26px\]/);
    expect(sidebar).toMatch(/md:h-\[26px\]/);
    expect(sidebar).toMatch(/md:gap-0/);
    expect(sidebar).toMatch(/\[&_img\]:h-\[30px\]/);
    expect(sidebar).toMatch(/IKON_DESKTOP = 26/);
    expect(sidebar).toMatch(/const IKON = 16/);
    expect(sidebar).not.toMatch(/Handlinger/);
    expect(sidebar).not.toMatch(/QUICK_ACTIONS/);
    expect(header).not.toMatch(/PanelLeftClose|PanelLeftOpen|SHELL_TOGGLE_PX/);
    expect(rad).toMatch(/md:h-\[65px\]/);
    expect(rad).toMatch(/md:w-\[259px\]/);
    expect(rad).toMatch(/md:p-3/);
    expect(pille).toMatch(/data-shell-enterprise/);
    expect(pille).toMatch(/md:h-\[52px\]/);
    expect(pille).toMatch(/md:w-\[233px\]/);
    expect(pille).toMatch(/md:px-8/);
  });

  it('hjem-kort 348×160 py-20 px-16; people-showcase 182×40 ikon 20×19', () => {
    const kort = utenKommentarer(les('../app/(app)/_shell/phone-kort.tsx'));
    const people = utenKommentarer(les('../app/(app)/_shell/people-showcase.tsx'));
    const hjem = utenKommentarer(les('../app/(app)/_shell/phone-home-dealer.tsx'));
    expect(kort).toMatch(/md:h-\[160px\]/);
    expect(kort).toMatch(/md:w-\[348px\]/);
    expect(kort).toMatch(/md:px-4/);
    expect(kort).toMatch(/md:py-5/);
    expect(people).toMatch(/data-people-showcase/);
    expect(people).toMatch(/h-10/);
    expect(people).toMatch(/w-\[182px\]/);
    expect(people).toMatch(/h-\[19px\]/);
    expect(people).toMatch(/w-5/);
    expect(people).toMatch(/hidden[\s\S]*md:flex/);
    expect(hjem).toMatch(/<PeopleShowcase/);
    expect(hjem).not.toMatch(/AnsattePaJobb/);
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
