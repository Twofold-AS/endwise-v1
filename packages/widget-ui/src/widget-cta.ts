import { WIDGET_FALLBACK } from './widget-fallbacks.ts';

/** Samme forbud som `@endwise/modules/branding`. Aldri CTA. */
export const FORBUDT_CTA = '#0066ff';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function widgetCtaFarger(
  aksent: string | null | undefined,
  tekst: string | null | undefined,
): { fill: string; fg: string } {
  const fill = aksent?.trim().toLowerCase() ?? '';
  if (!HEX_RE.test(fill) || erForbudtCta(fill)) {
    return { fill: WIDGET_FALLBACK.accent, fg: WIDGET_FALLBACK.accentFg };
  }
  const fg = tekst?.trim().toLowerCase() ?? '';
  if (HEX_RE.test(fg) && !erForbudtCta(fg)) {
    return { fill, fg };
  }
  return { fill, fg: WIDGET_FALLBACK.accentFg };
}

function erForbudtCta(hex: string): boolean {
  if (hex === FORBUDT_CTA) return true;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return Math.abs(r - 0) <= 24 && Math.abs(g - 0x66) <= 24 && Math.abs(b - 0xff) <= 24;
}
