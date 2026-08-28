/**
 * Telefon-chrome delt mellom hovedmeny og top-bar 2.
 * Logo-kolonnen er pinnest (ikke i scroll), så Oversikt/Timeplan
 * starter under valgt hovedpunkt — samme venstre-innfelt.
 * 22px = samme logo.svg-mål som sidebar-header.
 */
export const PHONE_LOGO_PX = 22;

/** pl-3 + 22px logo + gap-2. */
export const PHONE_LOGO_KOLONNE =
  'flex h-full w-[calc(0.75rem+22px+0.5rem)] shrink-0 items-center pl-3';

/** Horisontal scroll uten vertikal wiggle. */
export const PHONE_H_SCROLL =
  'overflow-x-auto overflow-y-hidden overscroll-y-none touch-pan-x';

export function scrollAktivTilStart(scroller: HTMLElement, instant: boolean) {
  const aktiv = scroller.querySelector<HTMLElement>('[aria-current="page"]');
  if (!aktiv) return;
  const left =
    aktiv.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft;
  scroller.scrollTo({ left: Math.max(0, left), top: 0, behavior: instant ? 'instant' : 'smooth' });
}
