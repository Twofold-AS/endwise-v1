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
/** Widget-vinduet er verkstedets veggklokke, ikke serverens lokale sone. */
export const WIDGET_TIME_ZONE = 'Europe/Oslo';

export interface AssignedBusyInterval extends BusyInterval {
  mechanicId: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

interface OsloWall {
  y: number;
  m: number;
  d: number;
  h: number;
  min: number;
  sec: number;
}

function osloWall(instant: Date): OsloWall {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: WIDGET_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
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

/**
 * Veggklokke i Europe/Oslo → UTC-instant. Uavhengig av process-tidssone.
 * Oslo er UTC+1/UTC+2; vi justerer mot Intl til veggklokken matcher.
 */
export function widgetWallTime(ymd: string, hour: number, minute = 0): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    throw new Error(`Ugyldig dato for widget-veggklokke: ${ymd}`);
  }
  const [y, mo, d] = ymd.split('-').map(Number);
  let utcMs = Date.UTC(y, mo - 1, d, hour - 1, minute, 0);
  for (let i = 0; i < 4; i++) {
    const got = osloWall(new Date(utcMs));
    const gotMs = Date.UTC(got.y, got.m - 1, got.d, got.h, got.min, got.sec);
    const wantMs = Date.UTC(y, mo - 1, d, hour, minute, 0);
    const delta = wantMs - gotMs;
    if (delta === 0) return new Date(utcMs);
    utcMs += delta;
  }
  return new Date(utcMs);
}

/** Kalenderdato i Europe/Oslo, eller slipp gjennom en allerede gyldig `YYYY-MM-DD`. */
export function widgetDayKey(from: Date | string): string {
  if (typeof from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(from)) return from;
  const d = from instanceof Date ? from : new Date(from);
  const w = osloWall(d);
  return `${w.y}-${pad2(w.m)}-${pad2(w.d)}`;
}

/** Arbeidsdag 08–16 Europe/Oslo — samme parser som widget-ruten. */
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
