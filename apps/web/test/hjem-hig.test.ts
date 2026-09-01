import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { erHjemHigFlate } from '../app/(app)/_shell/hjem-hig.ts';
import { PHONE_KORT_FYLL, PHONE_SHELL_ROT } from '../app/(app)/_shell/phone-home.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F5-56 kastbar HIG-preview — isolasjon', () => {
  it('gjelder bare forhandler-/mekaniker-hjem, ikke andre ruter', () => {
    expect(erHjemHigFlate('/dashboard', '', 'forhandler')).toBe(true);
    expect(erHjemHigFlate('/verkstedet', '', 'forhandler')).toBe(true);
    expect(erHjemHigFlate('/dashboard', 'visning=dag', 'forhandler')).toBe(false);
    expect(erHjemHigFlate('/min-dag', '', 'mekaniker')).toBe(true);
    expect(erHjemHigFlate('/min-dag/kompetanse', '', 'mekaniker')).toBe(false);
    expect(erHjemHigFlate('/innboks', '', 'forhandler')).toBe(false);
    expect(erHjemHigFlate('/jobber', '', 'forhandler')).toBe(false);
    expect(erHjemHigFlate('/innstillinger', '', 'forhandler')).toBe(false);
    expect(erHjemHigFlate('/bot', '', 'forhandler')).toBe(false);
    expect(erHjemHigFlate('/endwise', '', 'endwise')).toBe(false);
    expect(erHjemHigFlate('/', '', 'forhandler')).toBe(false);
  });

  it('HIG-attr sitter på hjem-flaten og telefon-chrome, ikke sidebar eller workshop-FAB', () => {
    const dealer = les('../app/(app)/_shell/phone-home-dealer.tsx');
    const mek = les('../app/(app)/_shell/phone-home-mekaniker.tsx');
    const shell = les('../app/(app)/_shell/phone-shell.tsx');
    const layout = les('../app/(app)/layout.tsx');
    const sidebar = les('../app/(app)/_shell/sidebar.tsx');
    expect(dealer).toMatch(/data-hjem-hig/);
    expect(mek).toMatch(/data-hjem-hig/);
    expect(shell).toMatch(/erHjemHigFlate/);
    expect(shell).toMatch(/data-hjem-hig=\{hig/);
    expect(layout).toMatch(/WorkshopBloub/);
    expect(layout).not.toMatch(/data-hjem-hig/);
    expect(sidebar).not.toMatch(/data-hjem-hig|hjem-hig/);
  });

  it('globale tokens forblir #000 mørk / #fff lys — remap er scoped', () => {
    const tokens = les('../../../packages/widget-tokens/src/tokens.css');
    expect(tokens).toMatch(/--ew-bg:\s*#000000/);
    expect(tokens).toMatch(/--ew-bg:\s*#ffffff/);
    const css = les('../app/(app)/_shell/hjem-hig.css');
    expect(css).toMatch(/\[data-hjem-hig\]/);
    expect(css).toMatch(/--hjem-canvas/);
    expect(css).toMatch(/--hjem-grouped/);
    expect(css).toMatch(/\[data-theme=["']dark["']\]\s*\[data-hjem-hig\]/);
    expect(css).not.toMatch(/#007AFF|#007aff|rgb\(\s*0\s*,\s*136\s*,\s*255/);
    expect(css).not.toMatch(/@font-face|font-family:\s*["']SF/);
    expect(PHONE_SHELL_ROT).toMatch(/bg-bg/);
  });

  it('kortflaten er grouped + 44pt, ikke iOS-tabbar og ikke tint-everywhere', () => {
    expect(PHONE_KORT_FYLL).toMatch(/min-h-row-store/);
    expect(PHONE_KORT_FYLL).toMatch(/bg-card/);
    expect(PHONE_KORT_FYLL).not.toMatch(/text-accent-fg/);
    const kort = les('../app/(app)/_shell/phone-kort.tsx');
    expect(kort).toMatch(/min-h-11/);
    const dealer = les('../app/(app)/_shell/phone-home-dealer.tsx');
    expect(dealer).toMatch(/hjem-hig-flate/);
    expect(dealer).not.toMatch(/md:hidden/);
    expect(dealer).not.toMatch(/grid-cols-5|bottom-nav|tab-bar/i);
    const mek = les('../app/(app)/_shell/phone-home-mekaniker.tsx');
    expect(mek).toMatch(/hjem-hig-flate/);
    expect(mek).not.toMatch(/md:hidden/);
    const primaer = les('../app/(app)/dine-jobber/_hjem-kort.tsx');
    expect(primaer).toMatch(/data-hjem-hig-primaer/);
    expect(primaer).toMatch(/min-h-11/);
    expect(primaer).toMatch(/bg-fg text-bg/);
  });

  it('desktop hjem er samme destinasjoner — VerkstedetDesktop rendres ikke', () => {
    const dash = les('../app/(app)/dashboard/page.tsx');
    expect(dash).toMatch(/PhoneHomeDealer/);
    expect(dash).toMatch(/export function VerkstedetDesktop/);
    expect(dash).not.toMatch(/hidden md:block/);
    const minDag = les('../app/(app)/min-dag/page.tsx');
    expect(minDag).toMatch(/PhoneHomeMekaniker/);
    expect(minDag).not.toMatch(/md:flex/);
  });
});
