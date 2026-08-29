import type { BookingStatus } from '@endwise/db';

/**
 * Livsløpet, som en maskin og ikke som en samling if-er.
 * draft ► confirmed ► in_progress ► completed
 * in_progress ► confirmed (stopp uten å fullføre — ingen ny enum)
 * ► cancelled
 * ► no_show
 * `completed` og `cancelled` er endestasjoner. En fullført jobb kan ikke
 * «avbestilles» i etterkant — da er det en kreditnota, ikke en statusendring.
 */
const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['confirmed', 'completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export class InvalidTransitionError extends Error {
  readonly code = 'INVALID_TRANSITION';
  // Eksplisitte felt (ikke TS parameter properties) — Node strip-only-trygt.
  readonly from: BookingStatus;
  readonly to: BookingStatus;
  constructor(from: BookingStatus, to: BookingStatus) {
    super(`Ulovlig statusovergang: ${from} → ${to}`);
    this.from = from;
    this.to = to;
  }
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

/** Statuser som beslaglegger kapasitet. En kansellert booking blokkerer ingen slot. */
export const OCCUPYING_STATUSES: readonly BookingStatus[] = [
  'draft',
  'confirmed',
  'in_progress',
  'completed',
];
