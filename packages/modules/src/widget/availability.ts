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

/** F4-07/F4-20 — samme arbeidsdag og rutenett som `/widget/availability`. */
export const WIDGET_DAY_OPEN_HOUR = 8;
export const WIDGET_DAY_CLOSE_HOUR = 16;
export const WIDGET_SLOT_STEP_MINUTES = 30;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Lokal `YYYY-MM-DD` for en Date, eller slipp gjennom en allerede gyldig datostreng. */
export function widgetDayKey(from: Date | string): string {
  if (typeof from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(from)) return from;
  const d = from instanceof Date ? from : new Date(from);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Arbeidsdag 08–16 lokal tid — samme parser som widget-ruten. */
export function widgetWorkingDay(from: Date | string): { dayStart: Date; dayEnd: Date } {
  const key = widgetDayKey(from);
  return {
    dayStart: new Date(`${key}T${pad2(WIDGET_DAY_OPEN_HOUR)}:00:00`),
    dayEnd: new Date(`${key}T${pad2(WIDGET_DAY_CLOSE_HOUR)}:00:00`),
  };
}

/** Om `startsAt` er et av de tilbudte tidspunktene (samme millisekund). */
export function isOfferedSlot(startsAt: Date, slots: readonly Date[]): boolean {
  const t = startsAt.getTime();
  if (Number.isNaN(t)) return false;
  return slots.some((s) => s.getTime() === t);
}

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
