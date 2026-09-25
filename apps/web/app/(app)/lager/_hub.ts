/**
 * Claude BIT 6 — Lager-hub-regler. Ingen vakt-/ordre-/salgs-API.
 * belowMin: stock − res + ordered < min. ordered = 0 til bestillings-API finnes.
 */

export const LAGER_STAT_LABELS = [
  'På lager',
  'Tilgjengelig',
  'Reservert',
  'Under minimum',
] as const;

export const LAGER_HUB_SEKSJONER = [
  { id: 'deler', label: 'Deler', href: '/lager/deler', sub: 'Liste og beholdning' },
  { id: 'logg', label: 'Inn- og utlogg', href: '/lager/bevegelser', sub: 'Siste bevegelser' },
  { id: 'bestill', label: 'Bestill deler', href: '/lager/bestill', sub: 'Under min · på vei' },
  { id: 'kjoretoy', label: 'Kjøretøy til salgs', href: '/lager/kjoretoy', sub: 'Ingen salgs-API' },
] as const;

export const SALG_KANALER = ['Finn.no', 'Butikk', 'Reservert'] as const;

export const INGEN_API = 'ingen API';

export function belowMin(input: {
  onHand: number;
  reserved: number;
  minStock: number | null | undefined;
  ordered?: number;
}): boolean {
  if (input.minStock == null) return false;
  return input.onHand - input.reserved + (input.ordered ?? 0) < input.minStock;
}

export function lagerPageSub(antallDeler: number): string {
  return `${antallDeler} delenummer`;
}

export function butikkPageSub(varer: number, kjoretoy: number): string {
  return `${varer} varer · ${kjoretoy} kjøretøy`;
}
