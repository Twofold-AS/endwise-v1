import { schema } from '@endwise/db';

/**
 * Felt-allowlist for det som går til modellen (art. 5(1)(c)).
 * `select()` uten argumenter ville sendt notes, e-post, telefon, idempotensnøkkel
 * og alt som senere legges til tabellen — uten at noen la merke til det.
 */
export const BOOKING_MODELL_FELT = {
  id: schema.bookings.id,
  startsAt: schema.bookings.startsAt,
  endsAt: schema.bookings.endsAt,
  status: schema.bookings.status,
  mechanicId: schema.bookings.mechanicId,
  serviceVersionId: schema.bookings.serviceVersionId,
} as const;

export const CUSTOMER_MODELL_FELT = {
  id: schema.customers.id,
  navn: schema.customers.name,
} as const;

export const MECHANIC_MODELL_FELT = {
  id: schema.mechanics.id,
  navn: schema.mechanics.name,
  kapasitet: schema.mechanics.capacity,
  aktiv: schema.mechanics.active,
} as const;
