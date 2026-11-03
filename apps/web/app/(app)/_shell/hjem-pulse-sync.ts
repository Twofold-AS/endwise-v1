import type { trpc } from '@/lib/trpc';

/**
 * Query-nøkler forhandler-hjem (F3-05) leser.
 * `bookings.list` med uke-vindu — ikke calendar, ikke byId.
 * `mechanics.list` er nevneren for «På jobb» (aktive mekanikere).
 * Ingen stempling-API — telleren er 0 inntil clock-in finnes.
 */
export const HJEM_PULSE_QUERY_KEYS = [
  'bookings.list',
  'mechanics.list',
  'mechanics.oversikt',
  'messages.listThreads',
  'inventory.listParts',
] as const;

export const HJEM_PULSE_REFETCH = {
  refetchOnMount: 'always' as const,
  refetchOnWindowFocus: true,
  staleTime: 0,
};

export const BOOKING_LAGRET_EVENT = 'endwise:booking-lagret';

type Utils = ReturnType<typeof trpc.useUtils>;

/** Oppfrisk hjem-pulse etter ny jobb / statusbytte. */
export function invalidateHjemPulse(utils: Utils) {
  void utils.bookings.list.invalidate();
  void utils.bookings.calendar.invalidate();
  void utils.mechanics.list.invalidate();
  void utils.mechanics.oversikt.invalidate();
}

export function meldingBookingLagret() {
  if (typeof globalThis.dispatchEvent !== 'function') return;
  globalThis.dispatchEvent(new Event(BOOKING_LAGRET_EVENT));
}
