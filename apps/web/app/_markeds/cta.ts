/**
 * Mikael/Jonas 05.09.2026 (etter #129): offentlig landing CTA er Action Blue.
 * `bg-primary` → `--ew-accent` #0066cc. Hover `bg-accent-strong` → #0071e3.
 * Ikke produkt-#111, ikke `bg-accent` (shadcn-hover / parchment), ikke logogrønn.
 * `h-control` + `rounded-pill` er eierens knappe-tokens.
 */
export const CTA_PRIMAR =
  'inline-flex h-control items-center justify-center rounded-pill bg-primary px-5 text-label text-primary-foreground transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export const CTA_SEKUNDAR =
  'inline-flex h-control items-center justify-center rounded-pill px-5 text-label text-fg transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
