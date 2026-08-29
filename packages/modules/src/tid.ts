/**
 * Produkt-tidssone for kalenderdager. Samme klasse som #89 (passord-utløp):
 * Vercel-prosessen er UTC; forhandleren lever i Europe/Oslo.
 * #89 kan fortsatt være åpen — denne fila eier kalenderdagen, ikke klokkevisning
 * av reset-token, og avhenger ikke av `packages/auth/src/tid.ts`.
 */

export const PRODUKT_TIDSSONE = 'Europe/Oslo';

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export type OsloVegg = {
  y: number;
  m: number;
  d: number;
  h: number;
  min: number;
  sec: number;
};

function somDato(from: Date | string): Date {
  return from instanceof Date ? from : new Date(from);
}

export function osloVegg(instant: Date | string): OsloVegg {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: PRODUKT_TIDSSONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(somDato(instant));
  const n = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    y: n('year'),
    m: n('month'),
    d: n('day'),
    h: n('hour'),
    min: n('minute'),
    sec: n('second'),
  };
}

/** Kalenderdato i Europe/Oslo. Allerede gyldig `YYYY-MM-DD` slippes gjennom. */
export function osloKalenderdag(from: Date | string): string {
  if (typeof from === 'string' && YMD.test(from)) return from;
  const w = osloVegg(from);
  return `${w.y}-${pad2(w.m)}-${pad2(w.d)}`;
}

/**
 * Veggklokke i Europe/Oslo → UTC-instant. Uavhengig av process-tidssone.
 * Oslo er UTC+1/UTC+2; vi justerer mot Intl til veggklokken matcher.
 */
export function osloVeggklokke(ymd: string, hour: number, minute = 0): Date {
  if (!YMD.test(ymd)) {
    throw new Error(`Ugyldig Oslo-kalenderdato: ${ymd}`);
  }
  const [y, mo, d] = ymd.split('-').map(Number);
  let utcMs = Date.UTC(y, mo - 1, d, hour - 1, minute, 0);
  for (let i = 0; i < 4; i++) {
    const got = osloVegg(new Date(utcMs));
    const gotMs = Date.UTC(got.y, got.m - 1, got.d, got.h, got.min, got.sec);
    const wantMs = Date.UTC(y, mo - 1, d, hour, minute, 0);
    const delta = wantMs - gotMs;
    if (delta === 0) return new Date(utcMs);
    utcMs += delta;
  }
  return new Date(utcMs);
}

/** Neste kalenderdag i Oslo (DST-trygg via middag + 24 t). */
export function osloPlusDager(ymd: string, dager: number): string {
  const middag = osloVeggklokke(osloKalenderdag(ymd), 12, 0);
  return osloKalenderdag(new Date(middag.getTime() + dager * 86_400_000));
}

/** Halvåpent døgn [midnatt, neste midnatt) i Europe/Oslo. */
export function osloDagsvindu(from: Date | string): { from: Date; to: Date } {
  const key = osloKalenderdag(from);
  return {
    from: osloVeggklokke(key, 0, 0),
    to: osloVeggklokke(osloPlusDager(key, 1), 0, 0),
  };
}

export function sammeOsloDag(a: Date | string, b: Date | string): boolean {
  return osloKalenderdag(a) === osloKalenderdag(b);
}

export function osloVeggtid(instant: Date | string): { hour: number; minute: number } {
  const w = osloVegg(instant);
  return { hour: w.h, minute: w.min };
}

const UKEDAG_MANDAG_0: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** 0 = mandag … 6 = søndag i Europe/Oslo. */
export function osloUkedagMandag0(instant: Date | string): number {
  const wd = new Intl.DateTimeFormat('en-GB', {
    timeZone: PRODUKT_TIDSSONE,
    weekday: 'short',
  }).format(somDato(instant));
  return UKEDAG_MANDAG_0[wd] ?? 0;
}

export function osloStartAvDag(instant: Date | string): Date {
  return osloVeggklokke(osloKalenderdag(instant), 0, 0);
}

export function osloStartAvUke(instant: Date | string): Date {
  const start = osloStartAvDag(instant);
  return osloVeggklokke(osloPlusDager(osloKalenderdag(start), -osloUkedagMandag0(start)), 0, 0);
}
