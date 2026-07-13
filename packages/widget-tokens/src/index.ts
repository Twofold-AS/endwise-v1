/**
 * F0-11 — Token-kontrakten i TS (navnene er kanoniske, verdiene bor i tokens.css).
 * Plassholderverdier til prototypen er tilgjengelig — se tokens.css.
 */
export const tokenNames = [
  'ew-bg',
  'ew-surface',
  'ew-border',
  'ew-fg',
  'ew-fg-muted',
  'ew-accent',
  'ew-accent-fg',
  'ew-radius-sm',
  'ew-radius-md',
  'ew-radius-lg',
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
