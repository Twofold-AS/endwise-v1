/**
 * Claude BIT 7 — Tjenester på eksisterende `/prisliste`.
 * Ingen ny chrome-pille. Ny går til `?fane=opprett`.
 */

import { flertallTilbys } from '@endwise/ui';

export function tjenesterPageSub(antall: number): string {
  return flertallTilbys(antall, 'tjeneste', 'tjenester');
}

export function trefferTjenesteSok(
  t: { name: string; description?: string | null; vehicleType?: string | null },
  sok: string,
): boolean {
  const q = sok.trim().toLowerCase();
  if (!q) return true;
  return (
    t.name.toLowerCase().includes(q) ||
    (t.description ?? '').toLowerCase().includes(q) ||
    (t.vehicleType ?? '').toLowerCase().includes(q)
  );
}
