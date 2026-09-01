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
  const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
  const workshop = utenKommentarer(les('../app/(app)/_workshop/workshop-bloub.tsx'));
  const rad = utenKommentarer(les('../app/(app)/_shell/bruker-rad.tsx'));

  it('telefon-toppbar er fast, logo til venstre, åpne-ikon ytterst til høyre', () => {
    expect(shell).toMatch(/data-phone-top-bar/);
    expect(shell).toMatch(/sticky top-0/);
    expect(shell).toMatch(/md:hidden/);
    expect(shell).toMatch(/data-phone-sidebar-open/);
    expect(shell).toMatch(/PanelLeftOpen/);
    expect(shell).toMatch(/ml-auto[\s\S]*PanelLeftOpen|ml-auto flex size-8/);
    expect(shell).not.toMatch(/PhoneBevel|BEVEL/);
    expect(layout).toMatch(/PhoneShell/);
    expect(layout).not.toMatch(/PhoneBevel/);
  });

  it('sidebar er lukket som default på telefon og dekker hele viewport når åpen', () => {
    expect(state).toMatch(/useState\(false\)/);
    expect(state).toMatch(/phoneOpen/);
    expect(state).toMatch(/openPhone/);
    expect(state).toMatch(/closePhone/);
    expect(sidebar).toMatch(/data-phone-sidebar=\{phoneOpen \? 'open' : 'closed'\}/);
    expect(sidebar).toMatch(/fixed inset-0 z-50 flex w-full/);
    expect(sidebar).toMatch(/phoneOpen[\s\S]*hidden/);
    expect(sidebar).toMatch(/md:flex/);
    expect(sidebar).toMatch(/md:static/);
    expect(sidebar).toMatch(/bg-\[#ffffff\]/);
    expect(sidebar).toMatch(/TipCard/);
    expect(sidebar).not.toMatch(/hidden md:block/);
    expect(sidebar).toMatch(/smal = collapsed && !phoneOpen/);
  });

  it('ingen mer-ark, bunnfane, hamburger-drawer eller kort-som-meny', () => {
    expect(layout).not.toMatch(/PhoneNav|PhoneBevel|Mer-ark|bottom-tab|PhoneTab/);
    expect(shell).not.toMatch(/hamburger|\bMenu\b|Sheet|visningsvelger/i);
    expect(sidebar).toMatch(/FORHANDLER_NAV|navForShell/);
  });

  it('ShaderGradient-stripe vises på telefon under toppbaren, ikke som FAB', () => {
    expect(layout).toMatch(/PhoneShell/);
    expect(layout).toMatch(/WorkshopBloub/);
    expect(workshop).toMatch(/data-workshop-strip/);
    expect(workshop).toMatch(/ShaderGradientBakgrunn/);
    expect(workshop).toMatch(/relative h-14 w-full shrink-0/);
    expect(workshop).not.toMatch(/hidden h-14/);
    expect(workshop).not.toMatch(/md:block/);
    expect(workshop).not.toMatch(/fixed[\s\S]*bottom/);
  });

  it('profil og logg ut er flat sidebar-rad uten avatar', () => {
    expect(rad).not.toMatch(/Avatar|BEVEL|variant === 'phone'/);
    expect(rad).toMatch(/LogOut/);
    expect(rad).toMatch(/Settings/);
    expect(sidebar).toMatch(/<BrukerRad/);
  });
});
