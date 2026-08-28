import { describe, expect, it } from 'vitest';
import {
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
});
