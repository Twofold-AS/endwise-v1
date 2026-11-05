/**
 * Bencho step-player slot-matte — MIT.
 * Kilde: https://bencho.dev/?c=step-player&theme=light (P(n, at) i bencho-katalogen).
 * 8px prikk, 36px aktiv pill, 8px gap.
 */
export const SPL_DOT = 8;
export const SPL_AKTIV = 36;
export const SPL_GAP = 8;

/** Benchos P(n, at): akkumulerte slot-posisjoner, aktiv slot er 36px. */
export function splSlots(antall: number, aktiv: number): { x: number; w: number }[] {
  const ut: { x: number; w: number }[] = [];
  let x = 0;
  for (let i = 0; i < antall; i++) {
    const w = i === aktiv ? SPL_AKTIV : SPL_DOT;
    ut.push({ x, w });
    x += w + SPL_GAP;
  }
  return ut;
}

export function splBredde(antall: number, aktiv: number): number {
  const slots = splSlots(antall, aktiv);
  const siste = slots[slots.length - 1];
  return siste ? siste.x + siste.w : 0;
}
