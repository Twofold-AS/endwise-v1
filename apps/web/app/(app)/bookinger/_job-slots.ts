import { osloUkedagMandag0, osloVeggklokke } from '../_lib/oslo-dag';

/** Claude OPENH. Minutter fra midnatt. Søndag stengt. */
export const JOB_SLOT_STEG = 30;
export const JOB_SLOT_HVERDAG: readonly [number, number] = [480, 1140];
export const JOB_SLOT_LORDAG: readonly [number, number] = [600, 900];

export type JobSlotJobb = {
  mechanicId: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  status?: string;
};

export type JobSlotMekaniker = {
  id: string;
  active: boolean;
  skillKeys?: readonly string[];
};

export type JobSlot = {
  startMin: number;
  startsAt: string;
  mechanicIds: string[];
};

const BLOKKERER = new Set(['draft', 'confirmed', 'in_progress']);

/** 0 = mandag … 6 = søndag. */
export function apningForUkedag(wdMandag0: number): readonly [number, number] | null {
  if (wdMandag0 === 6) return null;
  if (wdMandag0 === 5) return JOB_SLOT_LORDAG;
  return JOB_SLOT_HVERDAG;
}

export function slotStarter(
  apning: readonly [number, number],
  varighetMin: number,
  steg = JOB_SLOT_STEG,
): number[] {
  if (varighetMin <= 0) return [];
  const [open, close] = apning;
  const ut: number[] = [];
  for (let t = open; t + varighetMin <= close; t += steg) ut.push(t);
  return ut;
}

export function tiderOverlapper(aFra: number, aTil: number, bFra: number, bTil: number): boolean {
  return aFra < bTil && bFra < aTil;
}

export function harKvalifikasjoner(
  skillKeys: readonly string[] | undefined,
  required: readonly string[],
): boolean {
  if (required.length === 0) return true;
  const har = new Set(skillKeys ?? []);
  return required.every((k) => har.has(k));
}

function jobblokk(j: JobSlotJobb): boolean {
  if (!j.status) return true;
  return BLOKKERER.has(j.status);
}

export function jobSlots(input: {
  ymd: string;
  varighetMin: number;
  mekanikere: readonly JobSlotMekaniker[];
  jobber: readonly JobSlotJobb[];
  requiredSkills?: readonly string[];
}): JobSlot[] {
  const middag = osloVeggklokke(input.ymd, 12, 0);
  const apning = apningForUkedag(osloUkedagMandag0(middag));
  if (!apning) return [];
  const required = input.requiredSkills ?? [];
  const kval = input.mekanikere.filter(
    (m) => m.active && harKvalifikasjoner(m.skillKeys, required),
  );
  if (kval.length === 0) return [];

  const starter = slotStarter(apning, input.varighetMin);
  const ut: JobSlot[] = [];
  for (const startMin of starter) {
    const from = osloVeggklokke(input.ymd, Math.floor(startMin / 60), startMin % 60);
    const toMs = from.getTime() + input.varighetMin * 60_000;
    const fromMs = from.getTime();
    const mechs = kval.filter((m) => {
      return !input.jobber.some((j) => {
        if (j.mechanicId !== m.id || !jobblokk(j)) return false;
        return tiderOverlapper(
          fromMs,
          toMs,
          new Date(j.startsAt).getTime(),
          new Date(j.endsAt).getTime(),
        );
      });
    });
    if (mechs.length === 0) continue;
    ut.push({
      startMin,
      startsAt: from.toISOString(),
      mechanicIds: mechs.map((m) => m.id),
    });
  }
  return ut;
}

export function dagHarJobSlot(input: {
  ymd: string;
  varighetMin: number;
  mekanikere: readonly JobSlotMekaniker[];
  jobber: readonly JobSlotJobb[];
  requiredSkills?: readonly string[];
}): boolean {
  return jobSlots(input).length > 0;
}
