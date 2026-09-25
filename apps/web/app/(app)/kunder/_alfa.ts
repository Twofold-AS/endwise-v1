/**
 * Claude §4.9 / Fix A: Apple Contacts-indeks.
 * Full norsk A–Å (`#` + Q/W/X/Z/Æ/Ø). Tomme bokstaver dimmes.
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
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  'Æ',
  'Ø',
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

/** Ukjent førstebokstav (tall, symbol, annet) → `#`. */
export function kundeAlfaSeksjon(navn: string): KunderAlfa {
  const b = kundeAlfaBokstav(navn);
  if (b !== '#' && erKunderAlfa(b)) return b;
  return '#';
}

export function filtrerKunderAlfa<T extends { name: string }>(
  liste: readonly T[],
  bokstav: string,
): T[] {
  if (bokstav === '#' || bokstav === 'Alle') return [...liste];
  return liste.filter((k) => kundeAlfaBokstav(k.name) === bokstav);
}

export function grupperKunderAlfa<T extends { name: string }>(
  liste: readonly T[],
): { bokstav: KunderAlfa; kunder: T[] }[] {
  const spann = new Map<KunderAlfa, T[]>();
  for (const k of liste) {
    const b = kundeAlfaSeksjon(k.name);
    const rad = spann.get(b);
    if (rad) rad.push(k);
    else spann.set(b, [k]);
  }
  return KUNDER_ALFA.filter((b) => spann.has(b)).map((bokstav) => ({
    bokstav,
    kunder: spann.get(bokstav) ?? [],
  }));
}

/** `#` er aldri tom — den hopper alltid til toppen. */
export function kunderAlfaTomme<T extends { name: string }>(liste: readonly T[]): Set<KunderAlfa> {
  const har = new Set(liste.map((k) => kundeAlfaSeksjon(k.name)));
  return new Set(KUNDER_ALFA.filter((b) => b !== '#' && !har.has(b)));
}

export function kunderAlfaScrollmaal(
  rot: { getBoundingClientRect: () => { top: number }; scrollTop: number },
  seksjon: { getBoundingClientRect: () => { top: number } } | null,
): number {
  if (!seksjon) return 0;
  return seksjon.getBoundingClientRect().top - rot.getBoundingClientRect().top + rot.scrollTop;
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
