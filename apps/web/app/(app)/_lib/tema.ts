/**
 * `<html>` forblir `data-theme="light"` (Apple-landing / offentlig).
 * Dealer/app-skallet setter `data-theme="dark"` (Linear) på chrome-roten.
 * Ingen bruker-toggle — localStorage tvinger ikke lenger tema.
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
