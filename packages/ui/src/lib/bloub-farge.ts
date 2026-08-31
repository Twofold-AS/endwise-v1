import { COLOR_BY_ID, COLORS, type ColorId, DEFAULT_COLOR } from '../vendor/bloub/skins.ts';

/**
 * Produktets ansattpalett. Samme 12 `ColorId` som bloub `skins.ts`.
 * Ikke finn opp en annen. Timeplan, jobbkort og avatar leser herfra.
 */

export type { ColorId };
export { COLOR_BY_ID, COLORS, DEFAULT_COLOR };

export const BLOUB_FARGE_IDER = COLORS.map((c) => c.id);

export const BLOUB_FARGE_LABEL: Record<ColorId, string> = {
  encre: 'Blekk',
  brun: 'Brun',
  rouge: 'Rød',
  orange: 'Oransje',
  ambre: 'Amber',
  vert: 'Grønn',
  turquoise: 'Turkis',
  bleu: 'Blå',
  violet: 'Lilla',
  rose: 'Rosa',
  gris: 'Grå',
  creme: 'Krem',
};

export function erColorId(v: unknown): v is ColorId {
  return typeof v === 'string' && COLOR_BY_ID.has(v);
}

/** Hue leftover (0–359) → palett. Speiler `@endwise/modules/profil` `fargeFraHue`. */
export function fargeFraHue(hue: number): ColorId {
  const stopp: ReadonlyArray<readonly [number, ColorId]> = [
    [20, 'rouge'],
    [60, 'orange'],
    [110, 'ambre'],
    [150, 'vert'],
    [195, 'turquoise'],
    [250, 'bleu'],
    [270, 'violet'],
    [320, 'rose'],
  ];
  let best = stopp[0];
  let dist = 360;
  for (const s of stopp) {
    const d = Math.min(Math.abs(hue - s[0]), 360 - Math.abs(hue - s[0]));
    if (d < dist) {
      dist = d;
      best = s;
    }
  }
  return best[1];
}

export function fargeFraSeed(seed: string): ColorId {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return COLORS[h % COLORS.length]?.id ?? DEFAULT_COLOR;
}

/**
 * Normaliser hva enn `valg.farge` kan være etter overgangen fra hue-grader.
 * Ukjent / tomt faller til seeden, slik at kunder uten lagret farge fortsatt
 * får én av de 12 — ikke en tilfeldig HSL.
 */
export function losFarge(farge: string | number | null | undefined, seed?: string): ColorId {
  if (erColorId(farge)) return farge;
  if (typeof farge === 'number') return fargeFraHue(farge);
  if (seed) return fargeFraSeed(seed);
  return DEFAULT_COLOR;
}

export function hexForFarge(farge: string | number | null | undefined, seed?: string): string {
  return COLOR_BY_ID.get(losFarge(farge, seed))?.hex ?? '#0a0a0c';
}

/**
 * Inline-stil for timeplan-klosser, jobb-kort og chips.
 * Bakgrunn er palettfargen med ~18 % dekkevne; kanten er selve fargen.
 * Tekst settes ikke — 18 % fyll tåler ikke invertert hvit.
 */
export function staffFargeStil(
  farge: string | number | null | undefined,
  seed?: string,
): { backgroundColor: string; borderColor: string } {
  const hex = hexForFarge(farge, seed);
  return {
    backgroundColor: `${hex}2e`,
    borderColor: hex,
  };
}
