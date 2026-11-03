import { osloKalenderdag } from '../tid.ts';
import type { EndringOnske } from './changes.ts';
import { endringSlotOk, type JobSlotJobb, type JobSlotMekaniker, jobSlots } from './job-slots.ts';

export type BookingEndringSnapshot = {
  startsAt: string;
  endsAt: string;
  mechanicId: string;
  notes: string | null;
};

export type BookingEndringMal = {
  startsAt: Date;
  endsAt: Date;
  mechanicId: string;
};

export class EndringSlotError extends Error {
  readonly code = 'ENDRING_SLOT';
}

export function snapshotFraBooking(b: {
  startsAt: Date | string;
  endsAt: Date | string;
  mechanicId: string;
  notes: string | null;
}): BookingEndringSnapshot {
  return {
    startsAt: new Date(b.startsAt).toISOString(),
    endsAt: new Date(b.endsAt).toISOString(),
    mechanicId: b.mechanicId,
    notes: b.notes,
  };
}

/** Ny tid beholdt varighet. Tomt ønske = ingen feltendring. */
export function malFraOnske(
  naa: { startsAt: Date | string; endsAt: Date | string; mechanicId: string },
  onske: EndringOnske | null,
): BookingEndringMal {
  const startsAt = naa.startsAt instanceof Date ? naa.startsAt : new Date(naa.startsAt);
  const endsAt = naa.endsAt instanceof Date ? naa.endsAt : new Date(naa.endsAt);
  const varighetMs = Math.max(0, endsAt.getTime() - startsAt.getTime());
  const nyStart = onske?.startsAt ? new Date(onske.startsAt) : startsAt;
  if (Number.isNaN(nyStart.getTime())) {
    throw new EndringSlotError('Ugyldig tid i endringen.');
  }
  return {
    startsAt: nyStart,
    endsAt: new Date(nyStart.getTime() + varighetMs),
    mechanicId: onske?.mechanicId ?? naa.mechanicId,
  };
}

export function harFeltEndring(
  naa: { startsAt: Date | string; endsAt: Date | string; mechanicId: string },
  mal: BookingEndringMal,
): boolean {
  return (
    new Date(naa.startsAt).getTime() !== mal.startsAt.getTime() ||
    new Date(naa.endsAt).getTime() !== mal.endsAt.getTime() ||
    naa.mechanicId !== mal.mechanicId
  );
}

export function assertEndringJobSlot(input: {
  mal: BookingEndringMal;
  mekanikere: readonly JobSlotMekaniker[];
  jobber: readonly JobSlotJobb[];
  requiredSkills?: readonly string[];
}): void {
  const varighetMin = Math.round(
    (input.mal.endsAt.getTime() - input.mal.startsAt.getTime()) / 60_000,
  );
  if (varighetMin <= 0) {
    throw new EndringSlotError('Varigheten på jobben er ugyldig.');
  }
  const ymd = osloKalenderdag(input.mal.startsAt);
  const slots = jobSlots({
    ymd,
    varighetMin,
    mekanikere: input.mekanikere,
    jobber: input.jobber,
    requiredSkills: input.requiredSkills,
  });
  if (!endringSlotOk(slots, input.mal.startsAt, input.mal.mechanicId)) {
    throw new EndringSlotError(
      'Tiden eller mekanikeren er opptatt, utenfor åpningstid, eller mangler kompetanse.',
    );
  }
}
