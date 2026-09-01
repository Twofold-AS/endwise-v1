/**
 * Telefon-chrome delt mellom hovedmeny og top-bar 2.
 * Logo-kolonnen er pinnest (ikke i scroll), så Oversikt/Timeplan
 * starter under valgt hovedpunkt — samme venstre-innfelt.
 * 18px = samme logo.svg-mål som sidebar-header (lukket toppbar og overlay).
 */
export const PHONE_LOGO_PX = 18;

/**
 * Samme header-rad i lukket toppbar og åpen overlay — identisk høyde,
 * venstre-innfelt og vertikal sentrering så logoen ikke hopper.
 */
export const SHELL_HEADER_RAD = 'flex h-row items-center gap-2 px-3';
export const SHELL_LOGO_WRAP = 'flex shrink-0 items-center';

/** pl-3 + 18px logo + gap-2. */
export const PHONE_LOGO_KOLONNE =
  'flex h-full w-[calc(0.75rem+18px+0.5rem)] shrink-0 items-center pl-3';

/** Horisontal scroll uten vertikal wiggle. */
export const PHONE_H_SCROLL = 'overflow-x-auto overflow-y-hidden overscroll-y-none touch-pan-x';

/**
 * Viewport-låst app-skall (forhandler + mekaniker).
 * Chrome-mobil: `h-screen`/`100vh` er den store viewporten (adresselinje
 * skjult). Med overflow-hidden klippes topp/bunn mot Chrome-UI, notch og
 * home indicator. `100dvh` følger synlig viewport. Safe-area på selve
 * skallet — ikke på `<main>` og ikke som 40px-gjetning. Desktop: inset er 0.
 */
export const APP_SHELL =
  'h-dvh w-full overflow-hidden bg-bg text-fg overscroll-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]';

/**
 * Trailing space så ethvert valgt punkt kan scrolle flush etter logo.
 * Målt — ikke et magisk px som bare treffer én skjermbredde.
 */
export function endSpacerPx(scrollerWidth: number, aktivWidth: number): number {
  if (aktivWidth <= 0) return 0;
  return Math.max(0, scrollerWidth - aktivWidth);
}

export function finnAktivIScroll(scroller: HTMLElement): HTMLElement | null {
  return (
    scroller.querySelector<HTMLElement>('[aria-current="page"]') ??
    scroller.querySelector<HTMLElement>('[aria-pressed="true"]')
  );
}

export function scrollAktivTilStart(scroller: HTMLElement, instant: boolean) {
  const aktiv = finnAktivIScroll(scroller);
  if (!aktiv) return;
  const left =
    aktiv.getBoundingClientRect().left -
    scroller.getBoundingClientRect().left +
    scroller.scrollLeft;
  scroller.scrollTo({ left: Math.max(0, left), top: 0, behavior: instant ? 'instant' : 'smooth' });
}

/** Sett end-spacer fra aktiv knapp, deretter scroll den inntil logo. */
export function laasAktivMotStart(scroller: HTMLElement, spacer: HTMLElement, instant: boolean) {
  const aktiv = finnAktivIScroll(scroller);
  spacer.style.width = `${endSpacerPx(scroller.clientWidth, aktiv?.offsetWidth ?? 0)}px`;
  scrollAktivTilStart(scroller, instant);
}

/** Ett steg mot starten av den horisontale baren. Ikke en destinasjon. */
export function scrollTilbake(scroller: HTMLElement) {
  const steg = Math.max(64, scroller.clientWidth - 24);
  scroller.scrollTo({
    left: Math.max(0, scroller.scrollLeft - steg),
    top: 0,
    behavior: 'smooth',
  });
}
