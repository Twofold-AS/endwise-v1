/** Butikk-hub — Varer / Kjøretøy til salgs (3 + Se alle). */

export const BUTIKK_HUB_TAK = 3;

export function butikkPageSub(varer: number, kjoretoy: number): string {
  return `${varer} varer · ${kjoretoy} kjøretøy`;
}

export function hubForhandsvisning<T>(rader: readonly T[], tak = BUTIKK_HUB_TAK): T[] {
  return rader.slice(0, tak);
}

export function visSeAlle(antall: number, tak = BUTIKK_HUB_TAK): boolean {
  return antall > tak;
}

export function butikkSeAlleVarer(antall: number): string {
  return `Se alle varer (${antall})`;
}

export function butikkSeAlleKjoretoy(antall: number): string {
  return `Se alle kjøretøy (${antall})`;
}

export function butikkVareUndertekst(kategori: string | null | undefined, paLager: number): string {
  const kat = kategori?.trim() || 'Uten kategori';
  return `${kat} · ${paLager} på lager`;
}
