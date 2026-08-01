import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';
import { vehicleTypeEnum } from './vehicles.ts';

/**
 * F2-04 — Tjenestekatalog, VERSJONERT.
 *
 * Hvorfor to tabeller: en booking fra i fjor må vise prisen og varigheten som
 * gjaldt DA, ikke den forhandleren endret til i går. `services` er identiteten
 * («EU-kontroll MC»), `service_versions` er fakta på et tidspunkt. Bookinger
 * peker på en VERSJON (F3), aldri på tjenesten direkte.
 */
export const services = pgTable(
  'services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** Hvilke kjøretøytyper tjenesten gjelder for. */
    vehicleType: vehicleTypeEnum('vehicle_type').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('services_tenant_active_idx').on(t.tenantId, t.active),
    tenantPolicy('services', t.tenantId),
  ],
).enableRLS();

export const serviceVersions = pgTable(
  'service_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
    /** Monotont økende per tjeneste. Versjon 1 er den første. */
    version: integer('version').notNull(),

    /** Ferdighetene en mekaniker må ha. Driver MechanicMatcher (F3-02). */
    skills: text('skills').array().notNull().default(sql`'{}'::text[]`),
    /** Minutter. Driver slot-lengden i booking-motoren (F3-01). */
    durationMinutes: integer('duration_minutes').notNull(),
    /** Øre, ikke kroner. Flyttall og penger hører ikke sammen. */
    priceMinor: integer('price_minor'),
    description: text('description'),

    validFrom: timestamp('valid_from', { withTimezone: true }).notNull().default(sql`now()`),
    /** Null = gjeldende versjon. */
    validTo: timestamp('valid_to', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('service_versions_service_version_uidx').on(t.serviceId, t.version),
    index('service_versions_current_idx').on(t.serviceId, t.validTo),
    tenantPolicy('service_versions', t.tenantId),
  ],
).enableRLS();

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type ServiceVersion = typeof serviceVersions.$inferSelect;
export type NewServiceVersion = typeof serviceVersions.$inferInsert;
