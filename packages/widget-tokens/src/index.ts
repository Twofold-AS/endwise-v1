/**
 * Token-kontrakten i TS (navnene er kanoniske, verdiene bor i tokens.css).
 * Synara 07.09.2026: CTA-fyll er `--ew-ink-utility` (#1c1917 / mørkt #fafaf9).
 * Lenker/pip er varm terracotta `#a43a0a` / `#ffb27f`. Inter er fallback.
 * ⛔ Action Blue. ⛔ acid-lime. Logogrønnen #1ED27D er merkevare i logo.svg.
 */
export const tokenNames = [
  'ew-bg',
  'ew-surface',
  'ew-surface-2',
  'ew-border',
  'ew-border-strong',
  'ew-fg',
  'ew-fg-muted',
  'ew-fg-faint',
  'ew-accent',
  'ew-accent-fg',
  'ew-accent-dim',
  'ew-focus',
  'ew-ink-utility',
  'ew-sidebar-section',
  'ew-accent-pip',
  'ew-divide',
  'ew-warn',
  'ew-danger',
  'ew-success',
  'ew-glass-bg',
  'ew-glass-border',
  'ew-glass-blur',
  'ew-radius-sm',
  'ew-radius-md',
  'ew-radius-lg',
  'ew-radius-xl',
  'ew-radius-pill',
  'ew-space-1',
  'ew-space-2',
  'ew-space-3',
  'ew-space-4',
  'ew-space-6',
  'ew-space-8',
  'ew-font-sans',
  'ew-font-mono',
] as const;

export type TokenName = (typeof tokenNames)[number];

export type Theme = 'light' | 'dark';

export function token(name: TokenName): string {
  return `var(--${name})`;
}
