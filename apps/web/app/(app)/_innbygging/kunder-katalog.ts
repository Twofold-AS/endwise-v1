/**
 * Claude Kunder-katalog — liste, alfa, pager og angre.
 * Chrome (top-bar 1+2) eies ikke her.
 */

export const KUNDE_SIDE_STORRELSE = 20;

export const KUNDE_ALFA = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'Æ', 'Ø', 'Å'] as const;

export type KundeAlfaBokstav = (typeof KUNDE_ALFA)[number];

export const KUNDE_ANGRE_NOKKEL = 'endwise.kunde.angre';

export type KundeAngreSnapshot = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
};

export function kundeInitialer(navn: string): string {
  const deler = navn.trim().split(/\s+/).filter(Boolean);
  if (deler.length === 0) return '#';
  const forste = deler[0] ?? '';
  if (deler.length === 1) return forste.slice(0, 2).toLocaleUpperCase('nb-NO');
  const andre = deler[1] ?? '';
  return `${forste.slice(0, 1)}${andre.slice(0, 1)}`.toLocaleUpperCase('nb-NO');
}

export function kundeAlfaNokkel(navn: string): KundeAlfaBokstav {
  const tegn = navn.trim().normalize('NFC').slice(0, 1).toLocaleUpperCase('nb-NO');
  if (tegn === 'Æ' || tegn === 'Ø' || tegn === 'Å') return tegn;
  if (tegn >= 'A' && tegn <= 'Z') return tegn as KundeAlfaBokstav;
  return '#';
}

export function grupperKunderAlfa<T extends { name: string }>(
  kunder: readonly T[],
): { bokstav: KundeAlfaBokstav; kunder: T[] }[] {
  const map = new Map<KundeAlfaBokstav, T[]>();
  for (const k of kunder) {
    const nokkel = kundeAlfaNokkel(k.name);
    const liste = map.get(nokkel) ?? [];
    liste.push(k);
    map.set(nokkel, liste);
  }
  return KUNDE_ALFA.filter((bokstav) => map.has(bokstav)).map((bokstav) => ({
    bokstav,
    kunder: map.get(bokstav) ?? [],
  }));
}

export function kunderPageSub(antall: number): string {
  return `${antall} registrerte kunder`;
}

export function kunderPagerTekst(offset: number, vist: number, total: number): string {
  if (total === 0 || vist === 0) return 'Viser 0–0 av 0';
  return `Viser ${offset + 1}–${offset + vist} av ${total}`;
}

export function kunderTomTekst(harSok: boolean): string {
  return harSok ? 'Ingen kunder matcher søket.' : 'Ingen kunder ennå';
}

export function kunderAngreTekst(navn: string): string {
  return `${navn} er slettet`;
}

export function jobbRadUndertekst(
  startsAt: Date | string | null | undefined,
  mekaniker?: string | null,
): string {
  if (!startsAt) return mekaniker?.trim() ? `Uten tid · ${mekaniker.trim()}` : 'Uten tid';
  const d = new Date(startsAt);
  const dato = d.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit' });
  const tid = d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  const mek = mekaniker?.trim();
  return mek ? `${dato} kl. ${tid} · ${mek}` : `${dato} kl. ${tid}`;
}

export function meldingTraadStatus(deltakere: number): string {
  return deltakere > 2 ? 'Gruppesamtale' : 'Åpen samtale';
}

export function lagreKundeAngre(snapshot: KundeAngreSnapshot) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(KUNDE_ANGRE_NOKKEL, JSON.stringify(snapshot));
}

export function lesKundeAngre(): KundeAngreSnapshot | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KUNDE_ANGRE_NOKKEL);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KundeAngreSnapshot;
    if (!parsed?.id || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function toemKundeAngre() {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(KUNDE_ANGRE_NOKKEL);
}
