import { osloKalenderdag, osloUkedagMandag0, osloVeggklokke, osloVeggtid } from '../_lib/oslo-dag';

/**
 * Claude `jobSlots()` — ledig tid for ny jobb.
 * 1. Åpningstid (man–fre 08–19, lør 10–15, søn stengt)
 * 2. Hvem er på vakt
 * 3. Hvem er kvalifisert
 * 4. Hvem er ledig (overlap)
 * 5. 30-minutters steg
 */

export const JOB_SLOT_STEP_MIN = 30;
export const JOB_SLOT_WEEKDAY: readonly [number, number] = [8 * 60, 19 * 60];
export const JOB_SLOT_SATURDAY: readonly [number, number] = [10 * 60, 15 * 60];

export type JobSlotMekaniker = {
  id: string;
  name: string;
  role?: string | null;
  quals?: readonly string[];
  onDuty?: boolean;
};

export type JobSlotJobb = {
  mechanicId?: string | null;
  startsAt: Date | string;
  endsAt?: Date | string | null;
  status?: string | null;
};

export type JobSlot = {
  t: number;
  label: string;
  end: string;
  mechanicIds: string[];
  mechanicNames: string[];
};

export function openingHours(ymd: string): readonly [number, number] | null {
  const wd = osloUkedagMandag0(osloVeggklokke(osloKalenderdag(ymd), 12, 0));
  if (wd === 6) return null;
  if (wd === 5) return JOB_SLOT_SATURDAY;
  return JOB_SLOT_WEEKDAY;
}

export function toMinLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function overlapper(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && a1 > b0;
}

function jobbMinutter(j: JobSlotJobb, ymd: string): [number, number] | null {
  if (j.status === 'cancelled' || j.status === 'Flyttet') return null;
  if (osloKalenderdag(j.startsAt) !== osloKalenderdag(ymd)) return null;
  const start = osloVeggtid(j.startsAt);
  const a0 = start.hour * 60 + start.minute;
  if (j.endsAt) {
    const slutt = osloVeggtid(j.endsAt);
    const a1 = slutt.hour * 60 + slutt.minute;
    return [a0, Math.max(a0 + JOB_SLOT_STEP_MIN, a1)];
  }
  return [a0, a0 + 60];
}

export function jobSlots(input: {
  ymd: string;
  durationMin: number;
  requiredQuals?: readonly string[];
  mekanikere: readonly JobSlotMekaniker[];
  jobber: readonly JobSlotJobb[];
}): JobSlot[] {
  const dur = Math.max(JOB_SLOT_STEP_MIN, Math.round(input.durationMin));
  const open = openingHours(input.ymd);
  if (!open || dur <= 0) return [];

  const need = (input.requiredQuals ?? []).filter(Boolean);
  const cands = input.mekanikere.filter((e) => {
    if (e.onDuty === false) return false;
    const rolle = (e.role ?? '').toLowerCase();
    if (rolle && rolle !== 'mekaniker' && rolle !== 'mechanic') return false;
    if (need.length === 0) return true;
    const q = e.quals ?? [];
    return need.every((n) => q.includes(n));
  });
  if (cands.length === 0) return [];

  const busy = new Map<string, [number, number][]>();
  for (const j of input.jobber) {
    if (!j.mechanicId) continue;
    const span = jobbMinutter(j, input.ymd);
    if (!span) continue;
    const list = busy.get(j.mechanicId) ?? [];
    list.push(span);
    busy.set(j.mechanicId, list);
  }

  const out: JobSlot[] = [];
  for (let t = open[0]; t + dur <= open[1]; t += JOB_SLOT_STEP_MIN) {
    const free = cands.filter((e) => {
      const blokker = busy.get(e.id) ?? [];
      return !blokker.some(([b0, b1]) => overlapper(t, t + dur, b0, b1));
    });
    if (free.length === 0) continue;
    out.push({
      t,
      label: toMinLabel(t),
      end: toMinLabel(t + dur),
      mechanicIds: free.map((e) => e.id),
      mechanicNames: free.map((e) => e.name),
    });
  }
  return out;
}
