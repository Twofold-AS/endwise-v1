import type { LosTema } from '../_lib/tema';

/**
 * Chrome-Ronny: tema-farger, ikke hvit og ikke CSS-invert.
 * Invert (`brightness(0) invert(1)`) jevnet kropp og øyne til samme farge.
 * Lyst: ink-kropp, canvas-soft øyne. Mørkt: canvas-soft-kropp, ink-øyne.
 * `#f3f3f3` er Mobbin canvas-soft — ikke hvit, ikke svart på mørk flate.
 */
export const RONNY_KROPP_LYS = '#141414';
export const RONNY_OYE_LYS = '#f3f3f3';
export const RONNY_KROPP_MORK = '#f3f3f3';
export const RONNY_OYE_MORK = '#141414';

/** Les resolved tema fra DOM — `useTema().los` starter som light før hydrate. */
export function lesDomLos(): LosTema {
  if (typeof document === 'undefined') return 'light';
  const rot = document.documentElement;
  if (rot.classList.contains('dark') || rot.dataset.theme === 'dark') return 'dark';
  return 'light';
}

export function ronnyTemaFarger(los: LosTema): { kropp: string; oye: string } {
  return los === 'dark'
    ? { kropp: RONNY_KROPP_MORK, oye: RONNY_OYE_MORK }
    : { kropp: RONNY_KROPP_LYS, oye: RONNY_OYE_LYS };
}
