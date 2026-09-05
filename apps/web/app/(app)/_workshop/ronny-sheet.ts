/**
 * Ronny-sheet — kun 80 % og 100 % av synlig høyde.
 * Ingen peek. Høyde følger visualViewport / dvh, ikke rå 100vh alene.
 */

export const RONNY_SHEET_SNAPS = [80, 100] as const;
export type RonnySheetSnap = (typeof RONNY_SHEET_SNAPS)[number];

export const RONNY_SHEET_DRA_TERSKEL_PX = 36;
export const RONNY_SHEET_RADIUS_PX = 16;

export type RonnySheetGest = 'lukk' | 'forstor' | 'behold';

/** Synlig flate: visualViewport først, deretter dvh-fallback. */
export function synligViewportHoyde(
  visual: { height: number } | null | undefined,
  fallbackPx: number,
): number {
  const fraViewport = visual?.height;
  if (typeof fraViewport === 'number' && fraViewport > 0) return fraViewport;
  return fallbackPx > 0 ? fallbackPx : 0;
}

export function ronnySheetHoydePx(snap: RonnySheetSnap, synligPx: number): number {
  if (synligPx <= 0) return 0;
  if (snap === 100) return synligPx;
  return Math.round(synligPx * 0.8);
}

/**
 * Bunn-sheet: swipe ned lukker, swipe opp fullfører til 100 %
 * bare når gesten er tydelig. Kort tap = behold (forstørr-knapp).
 */
export function ronnySheetEtterDra(
  dy: number,
  terskelPx = RONNY_SHEET_DRA_TERSKEL_PX,
): RonnySheetGest {
  if (dy > terskelPx) return 'lukk';
  if (dy < -terskelPx) return 'forstor';
  return 'behold';
}
