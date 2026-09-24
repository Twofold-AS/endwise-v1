/**
 * Claude §4.9 alfa-rail: `#` + A–Å (mangler Q/W/X/Z/Ø).
 * Ingen ny pakke — shadcn har ingen norsk indeks-skinne.
 */

export const KUNDER_ALFA = [
  '#',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'R',
  'S',
  'T',
  'U',
  'V',
  'Y',
  'Å',
] as const;

export type KunderAlfa = (typeof KUNDER_ALFA)[number];

/** Claude CPER = 25. Klient-slice av allerede hentet `customers.list` — ingen ny API. */
export const KUNDER_SIDE_STORRELSE = 25;

export function erKunderAlfa(v: string): v is KunderAlfa {
  return (KUNDER_ALFA as readonly string[]).includes(v);
}

export function kundeAlfaBokstav(navn: string): string {
  const t = navn.trim();
  if (!t) return '#';
  return t.charAt(0).toLocaleUpperCase('nb-NO');
}

export function filtrerKunderAlfa<T extends { name: string }>(
  liste: readonly T[],
  bokstav: string,
): T[] {
  if (bokstav === '#' || bokstav === 'Alle') return [...liste];
  return liste.filter((k) => kundeAlfaBokstav(k.name) === bokstav);
}

export function kunderSider(antall: number, per = KUNDER_SIDE_STORRELSE): number {
  return Math.max(1, Math.ceil(Math.max(0, antall) / per));
}

export function kunderSide<T>(liste: readonly T[], side: number, per = KUNDER_SIDE_STORRELSE): T[] {
  const sider = kunderSider(liste.length, per);
  const indeks = Math.min(Math.max(0, side), sider - 1);
  const start = indeks * per;
  return liste.slice(start, start + per);
}

export function kunderSideEtikett(
  antall: number,
  side: number,
  per = KUNDER_SIDE_STORRELSE,
): string {
  if (antall <= 0) return 'Viser 0–0 av 0';
  const sider = kunderSider(antall, per);
  const indeks = Math.min(Math.max(0, side), sider - 1);
  const fra = indeks * per + 1;
  const til = Math.min(antall, (indeks + 1) * per);
  return `Viser ${fra}–${til} av ${antall}`;
}
