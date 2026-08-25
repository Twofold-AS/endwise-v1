/**
 * F3-05 — hvem som er på jobb i Verkstedet i dag.
 *
 * Ingen vaktplan-tabell her (Timeplan under Ansatte eies av en annen flate).
 * «På jobb» = aktiv mekaniker (ikke `fri`). Statusen kommer fra
 * `mechanics.oversikt` (F6-19). Denne fila filtrerer stripen og finner
 * hvilken sak som vises når raden utvides.
 */

export type PaJobbStatus = 'ledig' | 'på_jobb' | 'opptatt' | 'fri';

export type PaJobbMekaniker = {
  id: string;
  name: string;
  status: PaJobbStatus | string;
};

export type PaJobbBooking = {
  id: string;
  mechanicId: string | null;
  status: string;
  startsAt: Date | string;
  endsAt: Date | string;
  serviceName?: string | null;
  regNumber?: string | null;
};

export function sammeKalenderdag(a: Date | string, b: Date): boolean {
  return new Date(a).toDateString() === b.toDateString();
}

/** Inaktiv (`fri`) holdes utenfor stripen. Ledig/på jobb/opptatt er på gulvet. */
export function ansattePaJobb<T extends PaJobbMekaniker>(mekanikere: T[]): T[] {
  return mekanikere
    .filter((m) => m.status !== 'fri')
    .sort((a, b) => a.name.localeCompare(b.name, 'nb'));
}

const LEVENDE = new Set(['draft', 'confirmed', 'in_progress']);

/** Jobben som pågår nå, ellers neste levende i dag. */
export function aktivJobb<T extends PaJobbBooking>(
  jobber: T[],
  mechanicId: string,
  naa: Date,
): T | null {
  const dagens = jobber
    .filter((j) => j.mechanicId === mechanicId && sammeKalenderdag(j.startsAt, naa))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const paagaar = dagens.find((j) => {
    const start = new Date(j.startsAt).getTime();
    const slutt = new Date(j.endsAt).getTime();
    const overlapper = start <= naa.getTime() && slutt > naa.getTime();
    return j.status === 'in_progress' || (overlapper && LEVENDE.has(j.status));
  });
  if (paagaar) return paagaar;

  return (
    dagens.find((j) => LEVENDE.has(j.status) && new Date(j.startsAt).getTime() >= naa.getTime()) ??
    dagens.find((j) => LEVENDE.has(j.status)) ??
    null
  );
}

export function dagensJobber<T extends PaJobbBooking>(
  jobber: T[],
  mechanicId: string,
  dag: Date,
): T[] {
  return jobber
    .filter((j) => j.mechanicId === mechanicId && sammeKalenderdag(j.startsAt, dag))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}
