/**
 * Fallback når `--ew-*` ikke er lastet (embed uten tokens.css).
 * Produktstandarden: lyst tema, svart aksent #111. Ikke mørk TheFold-flate,
 * ikke logogrønn som knapp, ikke roadmap-rød #EE2924.
 */
export const WIDGET_FALLBACK = {
  bg: '#ffffff',
  surface: '#ffffff',
  border: '#e5e5e5',
  fg: '#333333',
  fgMuted: '#777777',
  accent: '#111111',
  accentFg: '#ffffff',
} as const;
