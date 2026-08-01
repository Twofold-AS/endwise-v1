import { sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { customers } from './customers.ts';
import { mechanics } from './mechanics.ts';
import { serviceVersions } from './services.ts';
import { tenants } from './tenants.ts';
import { vehicles } from './vehicles.ts';

/** F3-01 — Livsløpet. Én vei framover; `cancelled` er den eneste sidedøra. */
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
     * Peker på en VERSJON av tjenesten, ikke på tjenesten (F2-04).
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
  ],
).enableRLS();

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
