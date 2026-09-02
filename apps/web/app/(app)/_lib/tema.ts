/**
 * Produktet er lys-only. Ingen bruker-sti til `[data-theme=dark]`.
 * Nøklene beholdes så gammel localStorage ikke kaster — men lesing
 * og skriving tvinger alltid light.
 */

export type Tema = 'light';

export const TEMA_NOKKEL = 'endwise:tema';

export function lesTema(): Tema {
  return 'light';
}

export function settTema(_t: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = 'light';
  try {
    localStorage.setItem(TEMA_NOKKEL, 'light');
  } catch {
    /* privat modus */
  }
}
