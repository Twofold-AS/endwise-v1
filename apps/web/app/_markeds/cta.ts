/**
 * Offentlig landing CTA: fylt Apple Blue (`bg-primary` → `--ew-accent-strong` #0071e3).
 * Hover `bg-primary/90`. Outlined/lenke er Link Blue `--ew-accent` #0066cc.
 * Ikke produkt-#111, ikke `bg-accent` (shadcn-hover / Frost), ikke logogrønn.
 * `h-control` + `rounded-pill` (980px) er knappe-tokens.
 */
export const CTA_PRIMAR =
  'inline-flex h-control items-center justify-center rounded-pill bg-primary px-5 text-label text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export const CTA_SEKUNDAR =
  'inline-flex h-control items-center justify-center rounded-pill px-5 text-label text-fg transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
