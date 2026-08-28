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
    expect(PHONE_LOGO_KOLONNE).toContain('22px');
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

  it('tilbake-pil sitter i end-spacer uten hover eller aktiv-tilstand', () => {
    const hscroll = utenKommentarer(les('../app/(app)/_shell/phone-h-scroll.tsx'));
    const phone = utenKommentarer(les('../app/(app)/_shell/phone-nav.tsx'));
    const seksjon = utenKommentarer(les('../app/(app)/_shell/seksjon-bar.tsx'));
    expect(phone).toMatch(/PhoneHScroll/);
    expect(seksjon).toMatch(/PhoneHScroll/);
    expect(hscroll).toMatch(/data-end-spacer/);
    expect(hscroll).toMatch(/data-scroll-tilbake/);
    expect(hscroll).toMatch(/Rull tilbake/);
    expect(hscroll).toMatch(/scrollTilbake/);
    expect(hscroll).toMatch(/ChevronLeft/);
    const knapp = hscroll.slice(hscroll.indexOf('data-scroll-tilbake'));
    expect(knapp).not.toMatch(/hover:/);
    expect(knapp).not.toMatch(/aria-current|aria-pressed|aria-selected/);
    expect(knapp).not.toMatch(/bg-sidebar-active|bg-fg/);
  });
});
