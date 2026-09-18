/**
 * Innholdspiller (katalog-mønster) under eksisterende Endwise-chrome.
 * Ink valgt / surface-2 hvile — ikke dest-underline, ikke Claude-chrome.
 */
export function innholdPilleKlasse(valgt: boolean) {
  return `inline-flex h-7 items-center rounded-full px-2.5 text-label ${
    valgt ? 'bg-fg text-bg' : 'bg-surface-2 text-fg'
  }`;
}
