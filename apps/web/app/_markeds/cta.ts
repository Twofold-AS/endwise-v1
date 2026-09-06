/**
 * 06.09.2026 (Mikael Attio-farger): primær CTA er ink via `--ew-ink-utility`
 * (`bg-primary`). Action Blue `#407ff2` er lenker/aktiv, ikke CTA-fyll.
 * Ikke `bg-accent` (ash-panel), ikke logogrønn. `h-control` + `rounded-pill`.
 */
export const CTA_PRIMAR =
  'inline-flex h-control items-center justify-center rounded-pill bg-primary px-5 text-label text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export const CTA_SEKUNDAR =
  'inline-flex h-control items-center justify-center rounded-pill border border-border-strong bg-card px-5 text-label text-fg transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
