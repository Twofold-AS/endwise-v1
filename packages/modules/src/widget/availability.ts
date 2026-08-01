/**
 * F4-07 — Ledige tider, ren beregning.
 *
 * VIKTIG for personvern (offentlig flate): denne returnerer KUN ledige
 * start-tidspunkter — aldri hvem som er opptatt, hvilke kunder eller bookinger
 * som finnes. Opptatt-intervallene kommer inn som anonyme {start,end}-par og
 * forlater aldri serveren. En anonym kunde kan altså se når det er ledig, men
 * ikke enumerere andres bookinger.
 */

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface FreeSlotQuery {
  /** Arbeidsdagens start/slutt (åpningstid). */
  dayStart: Date;
  dayEnd: Date;
  /** Tjenestens varighet i minutter (slot-lengden). */
  durationMinutes: number;
  /** Rutenett-steg mellom kandidat-starttider (f.eks. 30 min). */
  stepMinutes: number;
  /** Opptatte intervaller (for den valgte mekanikeren/ressursen). */
  busy: readonly BusyInterval[];
  /** Ikke tilby tider før dette (f.eks. «nå» + varsel). Valgfri. */
  notBefore?: Date;
  /**
   * Verkstedets kapasitet = antall mekanikere som kan jobbe samtidig. Et slot er
   * ledig hvis FÆRRE enn `capacity` opptatt-intervaller overlapper. Default 1.
   * Dette lar oss tilby ledighet på verksted-nivå uten å enumerere mekanikere.
   */
  capacity?: number;
  /** Hardt tak på antall slots returnert (DoS-vern). Default 200. */
  maxSlots?: number;
}

const MS_PER_MIN = 60_000;

function overlaps(s: number, e: number, b: BusyInterval): boolean {
  // Halvåpne intervaller: [s,e) mot [b.start,b.end).
  return s < b.end.getTime() && e > b.start.getTime();
}

/** Beregn ledige start-tidspunkter som et slot av `durationMinutes` får plass i. */
export function computeFreeSlots(q: FreeSlotQuery): Date[] {
  const step = Math.max(1, q.stepMinutes) * MS_PER_MIN;
  const dur = Math.max(1, q.durationMinutes) * MS_PER_MIN;
  const dayStart = q.dayStart.getTime();
  const dayEnd = q.dayEnd.getTime();
  const floor = q.notBefore ? Math.max(dayStart, q.notBefore.getTime()) : dayStart;
  const capacity = Math.max(1, q.capacity ?? 1);
  const maxSlots = q.maxSlots ?? 200;

  const out: Date[] = [];
  // Start på første steg-grense >= floor (relativt til dayStart).
  let s = dayStart;
  if (s < floor) {
    const stepsOver = Math.ceil((floor - dayStart) / step);
    s = dayStart + stepsOver * step;
  }
  for (; s + dur <= dayEnd; s += step) {
    const e = s + dur;
    let busyCount = 0;
    for (const b of q.busy) {
      if (overlaps(s, e, b)) busyCount += 1;
    }
    if (busyCount < capacity) {
      out.push(new Date(s));
      if (out.length >= maxSlots) break;
    }
  }
  return out;
}
