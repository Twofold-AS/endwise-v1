import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { inspectSelectPolicy, tenantPolicy } from '../rls.ts';
import { customers } from './customers.ts';
import { mechanics } from './mechanics.ts';
import { serviceVersions } from './services.ts';
import { tenants } from './tenants.ts';
import { vehicles } from './vehicles.ts';

/** Livsløpet. Én vei framover; `cancelled` er den eneste sidedøra. */
export const bookingStatusEnum = pgEnum('booking_status', [
  'draft',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]);

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    vehicleId: uuid('vehicle_id').references(() => vehicles.id, { onDelete: 'set null' }),

    /**
     * Peker på en versjon av tjenesten, ikke på tjenesten (F2-04).
     * Endrer forhandleren prisen i morgen, står denne bookingen fortsatt til
     * det som ble avtalt i dag.
     */
    serviceVersionId: uuid('service_version_id')
      .notNull()
      .references(() => serviceVersions.id, { onDelete: 'restrict' }),

    mechanicId: uuid('mechanic_id')
      .notNull()
      .references(() => mechanics.id, { onDelete: 'restrict' }),

    status: bookingStatusEnum('status').notNull().default('draft'),

    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),

    /**
     * Idempotensnøkkel. Widgeten sender den med hver booking-forespørsel:
     * dobbeltklikk, retry og nettverkstimeout skal gi ÉN booking, ikke tre.
     * Unik per tenant — to forhandlere kan tilfeldigvis bruke samme nøkkel.
     */
    idempotencyKey: text('idempotency_key'),

    /** Hvor bookingen kom fra: 'widget' | 'admin' | 'quick' | 'api'. */
    source: text('source').notNull().default('admin'),
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex('bookings_tenant_idempotency_uidx').on(t.tenantId, t.idempotencyKey),
    // Konfliktdeteksjonens arbeidshest: «finnes en overlappende booking for
    // denne mekanikeren?» skal aldri bli en full scan.
    index('bookings_mechanic_window_idx').on(t.mechanicId, t.startsAt, t.endsAt),
    index('bookings_tenant_starts_idx').on(t.tenantId, t.startsAt),
    tenantPolicy('bookings', t.tenantId),
    inspectSelectPolicy('bookings', t.tenantId),
  ],
).enableRLS();

/**
 * F3-09 / P3 — flere tjenester på én jobb.
 * `bookings.service_version_id` er første/primære tjeneste (bakoverkompatibel
 * liste/kalender). Alle valgte tjenester, inkludert den primære, bor her.
 * `duration_minutes` er katalogtid på avtaletidspunktet — slot-lengden eies
 * av `bookings.starts_at`/`ends_at` (manuell varighet).
 */
export const bookingServices = pgTable(
  'booking_services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    serviceVersionId: uuid('service_version_id')
      .notNull()
      .references(() => serviceVersions.id, { onDelete: 'restrict' }),
    durationMinutes: integer('duration_minutes').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    uniqueIndex('booking_services_booking_version_uidx').on(t.bookingId, t.serviceVersionId),
    index('booking_services_booking_idx').on(t.bookingId, t.sortOrder),
    tenantPolicy('booking_services', t.tenantId),
    inspectSelectPolicy('booking_services', t.tenantId),
  ],
).enableRLS();

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type BookingService = typeof bookingServices.$inferSelect;
export type NewBookingService = typeof bookingServices.$inferInsert;
