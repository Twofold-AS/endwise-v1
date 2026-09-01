import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  endSpacerPx,
  finnAktivIScroll,
  laasAktivMotStart,
  PHONE_H_SCROLL,
  PHONE_LOGO_KOLONNE,
  PHONE_LOGO_PX,
  SHELL_HEADER_RAD,
  SHELL_LOGO_WRAP,
  SHELL_TOGGLE_PX,
  scrollAktivTilStart,
  scrollTilbake,
} from '../app/(app)/_shell/phone-chrome.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function utenKommentarer(kilde: string) {
  return kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('phone-chrome', () => {
  it('låser scroll til horisontal-only og pinner logo-kolonnen', () => {
    expect(PHONE_H_SCROLL).toContain('overflow-x-auto');
    expect(PHONE_H_SCROLL).toContain('overflow-y-hidden');
    expect(PHONE_H_SCROLL).toContain('touch-pan-x');
    expect(PHONE_H_SCROLL).toContain('overscroll-y-none');
    expect(PHONE_LOGO_PX).toBe(18);
    expect(SHELL_HEADER_RAD).toBe('flex h-row items-center gap-2 px-3');
    expect(SHELL_LOGO_WRAP).toBe('flex shrink-0 items-center');
    expect(PHONE_LOGO_KOLONNE).toContain('18px');
    expect(PHONE_LOGO_KOLONNE).toContain('0.75rem');
    expect(PHONE_LOGO_KOLONNE).toContain('0.5rem');
  });

  it('end-spacer er synlig bredde minus aktiv knapp', () => {
    expect(endSpacerPx(320, 88)).toBe(232);
    expect(endSpacerPx(390, 120)).toBe(270);
    expect(endSpacerPx(88, 88)).toBe(0);
    expect(endSpacerPx(80, 96)).toBe(0);
    expect(endSpacerPx(320, 0)).toBe(0);
  });

  it('siste punkt kan nå scroller-start med målt spacer', () => {
    const widths = [118, 96, 92, 104, 108, 86, 132];
    const gap = 8;
    const clientWidth = 320;
    const last = widths.at(-1) ?? 0;
    const spacer = endSpacerPx(clientWidth, last);
    const gaps = gap * Math.max(0, widths.length - 1);
    const content = widths.reduce((sum, w) => sum + w, 0) + gaps + spacer;
    const lastOffset = widths.slice(0, -1).reduce((sum, w) => sum + w, 0) + gaps;
    expect(content - clientWidth).toBeGreaterThanOrEqual(lastOffset);
  });

  it('scroller aktivt punkt til start uten vertikal hopp', () => {
    const aktiv = {
      getBoundingClientRect: () => ({ left: 80, top: 12 }),
    };
    let sett: ScrollToOptions = {};
    const scroller = {
      scrollLeft: 40,
      querySelector: (sel: string) => (sel.includes('aria-current') ? aktiv : null),
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      scrollTo: (opts: ScrollToOptions) => {
        sett = opts;
      },
    };

    scrollAktivTilStart(scroller as unknown as HTMLElement, true);

    expect(sett.left).toBe(120);
    expect(sett.top).toBe(0);
    expect(sett.behavior).toBe('instant');
  });

  it('måler spacer før lock slik siste punkt kan sitte inntil logo', () => {
    const aktiv = {
      offsetWidth: 90,
      getBoundingClientRect: () => ({ left: 240, top: 0 }),
    };
    const spacer = { style: { width: '' } };
    let sett: ScrollToOptions = {};
    const scroller = {
      clientWidth: 300,
      scrollLeft: 0,
      querySelector: (sel: string) => (sel.includes('aria-current') ? aktiv : null),
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      scrollTo: (opts: ScrollToOptions) => {
        sett = opts;
      },
    };

    laasAktivMotStart(scroller as unknown as HTMLElement, spacer as unknown as HTMLElement, true);

    expect(spacer.style.width).toBe('210px');
    expect(sett.left).toBe(240);
    expect(sett.top).toBe(0);
  });

  it('finnAktivIScroll tar aria-current, deretter aria-pressed', () => {
    const pressed = { id: 'filter' };
    const current = { id: 'nav' };
    const begge = {
      querySelector: (sel: string) => {
        if (sel.includes('aria-current')) return current;
        if (sel.includes('aria-pressed')) return pressed;
        return null;
      },
    };
    const bareFilter = {
      querySelector: (sel: string) => (sel.includes('aria-pressed') ? pressed : null),
    };
    expect(finnAktivIScroll(begge as unknown as HTMLElement)).toBe(current);
    expect(finnAktivIScroll(bareFilter as unknown as HTMLElement)).toBe(pressed);
  });

  it('scrollTilbake går mot start uten vertikal hopp', () => {
    let sett: ScrollToOptions = {};
    const scroller = {
      clientWidth: 300,
      scrollLeft: 400,
      scrollTo: (opts: ScrollToOptions) => {
        sett = opts;
      },
    };
    scrollTilbake(scroller as unknown as HTMLElement);
    expect(sett.left).toBe(124);
    expect(sett.top).toBe(0);
    expect(sett.behavior).toBe('smooth');
  });

  it('app-skallet bruker dvh og safe-area, ikke 100vh på sideroten', () => {
    const chrome = utenKommentarer(les('../app/(app)/_shell/phone-chrome.ts'));
    const layout = utenKommentarer(les('../app/(app)/layout.tsx'));
    const mobile = utenKommentarer(les('../app/(app)/_shell/mobile-shell.tsx'));
    const rot = utenKommentarer(les('../app/layout.tsx'));
    const css = les('../app/globals.css');

    expect(chrome).toMatch(/export const APP_SHELL/);
    expect(chrome).toMatch(/h-dvh|100dvh/);
    expect(chrome).toMatch(/safe-area-inset-top/);
    expect(chrome).toMatch(/safe-area-inset-bottom/);
    expect(chrome).not.toMatch(/\bh-screen\b|\b100vh\b/);

    expect(layout).toMatch(/PHONE_SHELL_ROT/);
    expect(layout).toMatch(/PhoneShell/);
    expect(layout).not.toMatch(/PhoneNav/);
    expect(layout).not.toMatch(/\bh-screen\b|\bw-screen\b|\b100vh\b/);

    expect(mobile).toMatch(/APP_SHELL/);
    expect(mobile).not.toMatch(/\bh-screen\b|\bw-screen\b|\b100vh\b/);
    expect(mobile).not.toMatch(/<main[^>]*safe-area-inset-bottom/);

    expect(rot).toMatch(/viewportFit:\s*['"]cover['"]/);
    expect(css).toMatch(/100dvh/);
  });

  it('tilbake i toppbaren er history.back via lokal SVG, ikke PhoneHScroll', () => {
    const shell = utenKommentarer(les('../app/(app)/_shell/phone-shell.tsx'));
    const seksjon = utenKommentarer(les('../app/(app)/_shell/seksjon-bar.tsx'));
    const pil = utenKommentarer(les('../app/(app)/_shell/tilbake-pil.tsx'));
    expect(seksjon).not.toMatch(/PhoneHScroll/);
    expect(seksjon).toMatch(/return null/);
    expect(shell).toMatch(/data-shell-tilbake/);
    expect(shell).toMatch(/router\.back\(\)/);
    expect(shell).toMatch(/TilbakePil/);
    expect(pil).toMatch(/<svg/);
    expect(pil).not.toMatch(/lucide|ChevronLeft/);
    expect(SHELL_TOGGLE_PX).toBe(16);
  });
});
