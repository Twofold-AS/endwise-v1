/**
 * Ledige tider, ren beregning.
 * Viktig for personvern (offentlig flate): denne returnerer kun ledige
 * start-tidspunkter — aldri hvem som er opptatt, hvilke kunder eller bookinger
 * som finnes. Opptatt-intervallene kommer inn som anonyme {start,end}-par og
 * forlater aldri serveren. En anonym kunde kan altså se når det er ledig, men
 * ikke enumerere andres bookinger.
 */

import { osloKalenderdag, osloVeggklokke, PRODUKT_TIDSSONE } from '../tid.ts';

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
   * ledig hvis færre enn `capacity` opptatt-intervaller overlapper. Default 1.
   * Dette lar oss tilby ledighet på verksted-nivå uten å enumerere mekanikere.
   */
  capacity?: number;
  /** Hardt tak på antall slots returnert (DoS-vern). Default 200. */
  maxSlots?: number;
}

const MS_PER_MIN = 60_000;

/** F4-07/F4-20 — samme arbeidsdag og rutenett som `/widget/availability`. */
export const WIDGET_DAY_OPEN_HOUR = 8;
export const WIDGET_DAY_CLOSE_HOUR = 20;
export const WIDGET_SLOT_STEP_MINUTES = 30;

/** Widget-vinduet er verkstedets veggklokke, ikke serverens lokale sone. */
export const WIDGET_TIME_ZONE = PRODUKT_TIDSSONE;

export interface AssignedBusyInterval extends BusyInterval {
  mechanicId: string;
}

/** Veggklokke i Europe/Oslo → UTC-instant. Samme kjerne som `osloVeggklokke`. */
export function widgetWallTime(ymd: string, hour: number, minute = 0): Date {
  return osloVeggklokke(ymd, hour, minute);
}

/** Kalenderdato i Europe/Oslo, eller slipp gjennom en allerede gyldig `YYYY-MM-DD`. */
export function widgetDayKey(from: Date | string): string {
  return osloKalenderdag(from);
}

/** Arbeidsdag 08–20 Europe/Oslo — samme vindu som Timeplan. */
export function widgetWorkingDay(from: Date | string): { dayStart: Date; dayEnd: Date } {
  const key = widgetDayKey(from);
  return {
    dayStart: widgetWallTime(key, WIDGET_DAY_OPEN_HOUR),
    dayEnd: widgetWallTime(key, WIDGET_DAY_CLOSE_HOUR),
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

export function intervalsOverlap(start: Date, end: Date, b: BusyInterval): boolean {
  return overlaps(start.getTime(), end.getTime(), b);
}

/**
 * CWE-841 — velg en mekaniker med gjenstående personlig kapasitet i intervallet.
 * Stabil rekkefølge (id) så to samtidige kall ikke hopper på samme rad når
 * shop-låsen allerede serialiserer skrivingen.
 */
export function pickMechanicWithRoom(
  mechanics: readonly { id: string; capacity: number }[],
  busy: readonly AssignedBusyInterval[],
  start: Date,
  end: Date,
): string | null {
  const sorted = [...mechanics].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const m of sorted) {
    const load = busy.filter(
      (b) => b.mechanicId === m.id && intervalsOverlap(start, end, b),
    ).length;
    if (load < Math.max(0, m.capacity)) return m.id;
  }
  return null;
}

/** Beregn ledige start-tidspunkter som et slot av `durationMinutes` får plass i. */
export function computeFreeSlots(q: FreeSlotQuery): Date[] {
  const step = Math.max(1, q.stepMinutes) * MS_PER_MIN;
  const dur = Math.max(1, q.durationMinutes) * MS_PER_MIN;
  const dayStart = q.dayStart.getTime();
  const dayEnd = q.dayEnd.getTime();
  const floor = q.notBefore ? Math.max(dayStart, q.notBefore.getTime()) : dayStart;
  // 0 mekanikere = stengt. Math.max(1, …) ville funnet på kapasitet.
  const capacity = q.capacity ?? 1;
  if (capacity <= 0) return [];
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
