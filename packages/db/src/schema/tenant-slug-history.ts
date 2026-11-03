import { sql } from 'drizzle-orm';
import { pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { inspectSelectPolicy, tenantPolicy } from '../rls.ts';
import { authenticatedRole } from '../roles.ts';
import { tenants } from './tenants.ts';

/**
 * F17 / white label F1 — historikk og karantene for slugs.
 * Gammelt navn omdirigeres 90 dager og kan ikke tas av andre på 12 måneder.
 */
export const tenantSlugHistory = pgTable(
  'tenant_slug_history',
  {
    slug: text('slug').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    tattIBruk: timestamp('tatt_i_bruk', { withTimezone: true }).notNull().default(sql`now()`),
    frigittAt: timestamp('frigitt_at', { withTimezone: true }),
    omdirigererTilSlug: text('omdirigerer_til_slug'),
  },
  (t) => [
    tenantPolicy('tenant_slug_history', t.tenantId),
    inspectSelectPolicy('tenant_slug_history', t.tenantId),
  ],
).enableRLS();

/**
 * 30-minutters reservasjon under onboarding. Unik slug er siste dommer.
 * App-rollen skriver ikke direkte — kun via reserver_slug().
 */
export const slugReservations = pgTable(
  'slug_reservations',
  {
    slug: text('slug').primaryKey(),
    holder: text('holder').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  () => [
    pgPolicy('slug_reservations_ingen_direkte', {
      as: 'permissive',
      for: 'all',
      to: authenticatedRole,
      using: sql`false`,
      withCheck: sql`false`,
    }),
  ],
).enableRLS();

export type TenantSlugHistory = typeof tenantSlugHistory.$inferSelect;
export type SlugReservation = typeof slugReservations.$inferSelect;
