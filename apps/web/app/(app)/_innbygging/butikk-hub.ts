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

export function vareKategoriNokkel(kategori: string | null | undefined): string {
  return kategori?.trim() || 'Uten kategori';
}

/** Varer gruppert etter kategori — Claude butikk-katalog. */
export function grupperVarerEtterKategori<T extends { category?: string | null }>(
  varer: readonly T[],
): { kategori: string; varer: T[] }[] {
  const map = new Map<string, T[]>();
  for (const v of varer) {
    const kat = vareKategoriNokkel(v.category);
    const liste = map.get(kat) ?? [];
    liste.push(v);
    map.set(kat, liste);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'nb'))
    .map(([kategori, gruppe]) => ({ kategori, varer: gruppe }));
}

/** Salgskanaler i katalogen. Ingen API — alltid ærlig «ikke registrert». */
export const BUTIKK_SALG_KANALER = ['Finn.no', 'Butikk', 'Reservert'] as const;

export type ButikkSalgStatus = (typeof BUTIKK_SALG_KANALER)[number] | 'ikke_registrert';

export function butikkSalgStatus(_kjoretoy?: { leftover?: unknown }): ButikkSalgStatus {
  return 'ikke_registrert';
}

export function butikkSalgStatusLabel(status: ButikkSalgStatus = 'ikke_registrert'): string {
  return status === 'ikke_registrert' ? 'Ikke registrert · Ingen kanal' : status;
}
