import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('Mikael telefon-chrome — to toppbarer, sidebar skjult (07.09.2026)', () => {
  const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
  const state = utenKommentarer(les('../app/(app)/_shell/sidebar-state.tsx'));
  const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
  const header = utenKommentarer(les('../app/(app)/_shell/sidebar-header.tsx'));
  const chrome = utenKommentarer(les('../app/(app)/_shell/phone-chrome.ts'));
  const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
  const workshop = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
  const rad = utenKommentarer(les('../app/(app)/_shell/bruker-rad.tsx'));

  it('telefon-chrome er to faste toppbarer: merke, søk, Ronny, profil + dest-piller', () => {
    expect(shell).toMatch(/data-phone-top-bar/);
    expect(shell).toMatch(/data-phone-top-bar="1"/);
    expect(shell).toMatch(/data-phone-top-bar="2"/);
    expect(shell).toMatch(/data-phone-search/);
    expect(shell).toMatch(/data-phone-profile/);
    expect(shell).toMatch(/data-phone-dest/);
    expect(shell).toMatch(/data-ronny-avatar/);
    expect(shell).toMatch(/fixed inset-x-0 top-0 z-\[60\]/);
    expect(shell).toMatch(/md:hidden/);
    expect(shell).toMatch(/rounded-sm/);
    expect(shell).toMatch(/bg-inset/);
    expect(shell).toMatch(/border-0/);
    expect(shell).toMatch(/rounded-full/);
    expect(shell).toMatch(/bg-sidebar-active/);
    expect(shell).not.toMatch(/border-l-|accent-pip|border-left/);
    expect(shell).not.toMatch(/data-phone-sidebar-open/);
    expect(shell).not.toMatch(/PanelLeftOpen|PanelLeftClose/);
    expect(shell).toMatch(
      /erSettingsSti[\s\S]*data-shell-tilbake|data-shell-tilbake[\s\S]*erSettingsSti/,
    );
    expect(shell).toMatch(/TilbakePil/);
    expect(shell).not.toMatch(/PhoneBevel|BEVEL/);
    expect(layout).toMatch(/PhoneShell/);
    expect(layout).not.toMatch(/PhoneBevel/);
    expect(chrome).toMatch(/SHELL_LOGO_PX = 24/);
    expect(chrome).toMatch(/PHONE_AVATAR_PX = 28/);
    expect(chrome).toMatch(/SHELL_HEADER_RAD/);
    expect(header).toMatch(/SHELL_LOGO_PX/);
    expect(header).toMatch(/SHELL_LOGO_WRAP/);
    expect(shell).toMatch(/PHONE_LOGO_PX|PHONE_AVATAR_PX/);
    expect(shell).toMatch(/h-row/);
    expect(shell).toMatch(/data-shell-logo/);
    expect(shell).not.toMatch(/absolute inset-0/);
    expect(sidebar).toMatch(/SHELL_HEADER_RAD/);
    expect(sidebar).toMatch(/data-shell-header/);
    expect(sidebar).toMatch(/hidden shrink-0 md:flex/);
    expect(shell).toMatch(/data-phone-top-bar-spacer/);
    expect(shell).toMatch(/data-phone-chrome-hairline|h-px bg-border/);
    expect(sidebar).not.toMatch(/min-h-10 shrink-0 items-center py-2/);
  });

  it('sidebar er skjult på telefon og fast skinne på md+', () => {
    expect(state).toMatch(/useState\(false\)/);
    expect(state).toMatch(/phoneOpen/);
    expect(sidebar).toMatch(/data-phone-sidebar="closed"/);
    expect(sidebar).not.toMatch(/fixed inset-x-0 bottom-0 z-50 flex w-full/);
    expect(sidebar).not.toMatch(/top-\[calc\(env\(safe-area-inset-top\)\+var\(--ew-row-h\)\)\]/);
    expect(sidebar).toMatch(/hidden/);
    expect(sidebar).toMatch(/md:flex/);
    expect(sidebar).toMatch(/md:static/);
    expect(sidebar).toMatch(/md:w-\[389px\]/);
    expect(shell).toMatch(/md:hidden/);
    expect(sidebar).toMatch(/bg-sidebar/);
    expect(sidebar).not.toMatch(/bg-\[#ffffff\]/);
    expect(sidebar).toMatch(/OppgraderPille/);
    expect(sidebar).not.toMatch(/<TipCard/);
    expect(sidebar).toMatch(/smal = collapsed/);
    expect(sidebar).not.toMatch(/smal = collapsed && !phoneOpen/);
  });

  it('ingen mer-ark, bunnfane, hamburger-drawer eller kort-som-meny', () => {
    expect(layout).not.toMatch(/PhoneNav|PhoneBevel|Mer-ark|bottom-tab|PhoneTab/);
    expect(shell).not.toMatch(/hamburger|\bMenu\b|visningsvelger/i);
    expect(shell).not.toMatch(/<Sheet|PhoneNav/);
    expect(shell).toMatch(/destinasjonerForShell/);
    expect(shell).toMatch(/isItemActive/);
    expect(sidebar).toMatch(/destinasjonerForShell/);
    expect(shell).toMatch(/destinasjonerForShell/);
  });

  it('Ronny er telefon-sheet, ikke Grainient-stripe eller FAB', () => {
    expect(layout).toMatch(/PhoneShell/);
    expect(layout).toMatch(/WorkshopBloub/);
    expect(workshop).not.toMatch(/data-workshop-strip/);
    expect(workshop).not.toMatch(/<Grainient/);
    expect(workshop).toMatch(/data-ronny-sheet/);
    expect(workshop).toMatch(/md:hidden/);
    expect(workshop).not.toMatch(/Trykk på KI-Ronny/);
    expect(workshop).not.toMatch(/hidden h-14/);
    expect(workshop).toMatch(/hidden md:block/);
    expect(workshop).toMatch(/data-ronny-desktop-panel/);
    expect(workshop).toMatch(/fixed inset-x-0 bottom-0/);
    expect(workshop).toMatch(/data-ronny-composer/);
    expect(workshop).toMatch(/data-ronny-utvid/);
    expect(workshop).not.toMatch(/ShaderGradient/);
  });

  it('profil og logg ut er flat sidebar-rad uten avatar', () => {
    expect(rad).not.toMatch(/Avatar|BEVEL|variant === 'phone'/);
    expect(rad).toMatch(/LogOut/);
    expect(rad).toMatch(/Settings/);
    expect(rad).toMatch(/mx-2/);
    expect(rad).toMatch(/min-w-0 flex-1 truncate/);
    expect(sidebar).toMatch(/<BrukerRad/);
  });
});
