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

describe('Mikael telefon-chrome — samme sidebar som desktop (01.09.2026)', () => {
  const sidebar = utenKommentarer(les('../app/(app)/_shell/sidebar.tsx'));
  const state = utenKommentarer(les('../app/(app)/_shell/sidebar-state.tsx'));
  const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
  const header = utenKommentarer(les('../app/(app)/_shell/sidebar-header.tsx'));
  const chrome = utenKommentarer(les('../app/(app)/_shell/phone-chrome.ts'));
  const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
  const workshop = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
  const rad = utenKommentarer(les('../app/(app)/_shell/bruker-rad.tsx'));

  it('telefon-toppbar er fast, logo til venstre, åpne-ikon rett ved logoen', () => {
    expect(shell).toMatch(/data-phone-top-bar/);
    expect(shell).toMatch(/sticky top-0/);
    expect(shell).not.toMatch(/md:hidden/);
    expect(shell).toMatch(/data-phone-sidebar-open/);
    expect(shell).toMatch(/PanelLeftOpen/);
    expect(shell).toMatch(/TilbakePil|data-shell-tilbake/);
    expect(shell).not.toMatch(/ml-auto/);
    expect(shell).not.toMatch(/PhoneBevel|BEVEL/);
    expect(layout).toMatch(/PhoneShell/);
    expect(layout).not.toMatch(/PhoneBevel/);
    expect(chrome).toMatch(/PHONE_LOGO_PX = 18/);
    expect(chrome).toMatch(/SHELL_HEADER_RAD/);
    expect(chrome).toMatch(/flex h-row items-center gap-2 px-3/);
    expect(header).toMatch(/LOGO = 18/);
    expect(header).toMatch(/SHELL_LOGO_WRAP/);
    expect(header).not.toMatch(/justify-between px-1/);
    expect(shell).toMatch(/PHONE_LOGO_PX/);
    expect(shell).toMatch(/SHELL_HEADER_RAD/);
    expect(shell).toMatch(/data-shell-logo/);
    expect(sidebar).toMatch(/SHELL_HEADER_RAD/);
    expect(sidebar).toMatch(/data-shell-header/);
    expect(sidebar).not.toMatch(/min-h-10 shrink-0 items-center py-2/);
  });

  it('sidebar er lukket som default på telefon og dekker hele viewport når åpen', () => {
    expect(state).toMatch(/useState\(false\)/);
    expect(state).toMatch(/phoneOpen/);
    expect(state).toMatch(/openPhone/);
    expect(state).toMatch(/closePhone/);
    expect(sidebar).toMatch(/data-phone-sidebar=\{phoneOpen \? 'open' : 'closed'\}/);
    expect(sidebar).toMatch(/fixed inset-0 z-50 flex w-full/);
    expect(sidebar).toMatch(/phoneOpen[\s\S]*hidden/);
    expect(sidebar).not.toMatch(/md:flex/);
    expect(sidebar).not.toMatch(/md:static/);
    expect(sidebar).not.toMatch(/md:w-\[248px\]/);
    expect(sidebar).toMatch(/bg-\[#ffffff\]/);
    expect(sidebar).toMatch(/OppgraderPille/);
    expect(sidebar).not.toMatch(/<TipCard/);
    expect(sidebar).not.toMatch(/hidden md:block/);
    expect(sidebar).toMatch(/smal = collapsed && !phoneOpen/);
  });

  it('ingen mer-ark, bunnfane, hamburger-drawer eller kort-som-meny', () => {
    expect(layout).not.toMatch(/PhoneNav|PhoneBevel|Mer-ark|bottom-tab|PhoneTab/);
    expect(shell).not.toMatch(/hamburger|\bMenu\b|Sheet|visningsvelger/i);
    expect(sidebar).toMatch(/FORHANDLER_NAV|navForShell/);
  });

  it('Grainient-stripe vises under toppbaren, høyere på telefon, ikke som FAB', () => {
    expect(layout).toMatch(/PhoneShell/);
    expect(layout).toMatch(/WorkshopBloub/);
    expect(workshop).toMatch(/data-workshop-strip/);
    expect(workshop).toMatch(/Grainient/);
    expect(workshop).toMatch(/h-11 max-h-\[44px\]/);
    expect(workshop).toMatch(/md:h-control md:max-h-\[32px\]/);
    expect(workshop).toMatch(/La KI-Ronny ta styringen/);
    expect(workshop).not.toMatch(/hidden h-14/);
    expect(workshop).not.toMatch(/md:block/);
    expect(workshop).toMatch(/fixed inset-x-0 bottom-0/);
    expect(workshop).not.toMatch(/ShaderGradient/);
  });

  it('profil og logg ut er flat sidebar-rad uten avatar', () => {
    expect(rad).not.toMatch(/Avatar|BEVEL|variant === 'phone'/);
    expect(rad).toMatch(/LogOut/);
    expect(rad).toMatch(/Settings/);
    expect(sidebar).toMatch(/<BrukerRad/);
  });
});
