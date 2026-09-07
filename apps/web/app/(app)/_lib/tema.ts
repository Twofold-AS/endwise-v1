/**
 * Dual theme (Mobbin, lys først): light | dark | system.
 * System er default. Eksplisitt valg skrives til localStorage.
 * På html: både `data-theme` (eksisterende CSS) og klasse `.dark`.
 */

export type Tema = 'light' | 'dark' | 'system';
export type LosTema = 'light' | 'dark';

export const TEMA_NOKKEL = 'endwise:tema';

export const TEMA_SKRIPT = `(function(){try{var k=${JSON.stringify(TEMA_NOKKEL)};var t=localStorage.getItem(k);var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.dataset.theme=d?'dark':'light';r.classList.toggle('dark',d);}catch(e){document.documentElement.dataset.theme='light';}})();`;

export function lesTema(): Tema {
  if (typeof window === 'undefined') return 'system';
  try {
    const v = localStorage.getItem(TEMA_NOKKEL);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* privat modus */
  }
  return 'system';
}

export function losTema(valg: Tema): LosTema {
  if (valg === 'light' || valg === 'dark') return valg;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function skrivTemaPaRot(los: LosTema): void {
  if (typeof document === 'undefined') return;
  const rot = document.documentElement;
  rot.dataset.theme = los;
  rot.classList.toggle('dark', los === 'dark');
}

export function settTema(valg: Tema): void {
  skrivTemaPaRot(losTema(valg));
  try {
    localStorage.setItem(TEMA_NOKKEL, valg);
  } catch {
    /* privat modus */
  }
}
