/**
 * Claude `jobSlots()` — åpningstid · vakt · kvalifikasjon · ledig · 30-min.
 * Ren funksjon: ingen DB. API-et henter mekanikere, ferdigheter og jobber.
 *
 * Åpningstid (mandag=0): hverdag 08–19, lørdag 10–15, søndag stengt.
 * Tom liste når ingen kvalifisert/ledig er tilsiktet.
 */

export const JOB_SLOT_STEP_MIN = 30;
export const JOB_SLOT_WEEKDAY: readonly [number, number] = [8 * 60, 19 * 60];
export const JOB_SLOT_SATURDAY: readonly [number, number] = [10 * 60, 15 * 60];

export type JobSlotBusy = {
  mechanicId: string;
  startMin: number;
  endMin: number;
};

export type JobSlotMechanic = {
  id: string;
  name: string;
  active: boolean;
  skillKeys: readonly string[];
  expiredSkillKeys?: readonly string[];
};

export type JobSlotInput = {
  weekdayMon0: number;
  durationMinutes: number;
  requiredSkills: readonly string[];
  mechanics: readonly JobSlotMechanic[];
  busy: readonly JobSlotBusy[];
  /** Når satt, kun disse IDene teller som på vakt. Uten = alle aktive. */
  onShiftIds?: readonly string[];
};

export type JobSlot = {
  startMin: number;
  endMin: number;
  label: string;
  endLabel: string;
  mechanicIds: string[];
  mechanicNames: string[];
};

export function openingHoursMinutes(weekdayMon0: number): readonly [number, number] | null {
  if (weekdayMon0 === 6) return null;
  if (weekdayMon0 === 5) return JOB_SLOT_SATURDAY;
  if (weekdayMon0 >= 0 && weekdayMon0 <= 4) return JOB_SLOT_WEEKDAY;
  return null;
}

export function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function overlaps(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1;
}

export function mechanicQualified(
  mech: JobSlotMechanic,
  requiredSkills: readonly string[],
): boolean {
  if (!mech.active) return false;
  const held = new Set(mech.skillKeys);
  const expired = new Set(mech.expiredSkillKeys ?? []);
  return requiredSkills.every((key) => held.has(key) && !expired.has(key));
}

export function computeJobSlots(input: JobSlotInput): JobSlot[] {
  const open = openingHoursMinutes(input.weekdayMon0);
  const dur = Math.round(input.durationMinutes);
  if (!open || !Number.isFinite(dur) || dur <= 0) return [];

  const onShift = new Set(
    input.onShiftIds ?? input.mechanics.filter((m) => m.active).map((m) => m.id),
  );
  const cands = input.mechanics.filter(
    (m) => onShift.has(m.id) && mechanicQualified(m, input.requiredSkills),
  );
  if (cands.length === 0) return [];

  const busyByMech = new Map<string, JobSlotBusy[]>();
  for (const b of input.busy) {
    const list = busyByMech.get(b.mechanicId) ?? [];
    list.push(b);
    busyByMech.set(b.mechanicId, list);
  }

  const out: JobSlot[] = [];
  for (let t = open[0]; t + dur <= open[1]; t += JOB_SLOT_STEP_MIN) {
    const free = cands.filter((m) => {
      const blocks = busyByMech.get(m.id) ?? [];
      return !blocks.some((b) => overlaps(t, t + dur, b.startMin, b.endMin));
    });
    if (free.length === 0) continue;
    out.push({
      startMin: t,
      endMin: t + dur,
      label: minutesToLabel(t),
      endLabel: minutesToLabel(t + dur),
      mechanicIds: free.map((m) => m.id),
      mechanicNames: free.map((m) => m.name),
    });
  }
  return out;
}
