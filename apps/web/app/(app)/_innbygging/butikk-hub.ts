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
