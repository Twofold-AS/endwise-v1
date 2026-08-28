import { describe, expect, it } from 'vitest';
import {
  endSpacerPx,
  laasAktivMotStart,
  PHONE_H_SCROLL,
  PHONE_LOGO_KOLONNE,
  scrollAktivTilStart,
} from '../app/(app)/_shell/phone-chrome.ts';

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

    laasAktivMotStart(
      scroller as unknown as HTMLElement,
      spacer as unknown as HTMLElement,
      true,
    );

    expect(spacer.style.width).toBe('210px');
    expect(sett.left).toBe(240);
    expect(sett.top).toBe(0);
  });
});
