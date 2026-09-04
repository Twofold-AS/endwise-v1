import { sql } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { inspectSelectPolicy, tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

/**
 * Forhandler-butikk (ikke personen). Firmanavn bor på tenants.name /
 * organization.name. Slug bor der også og skrives aldri herfra.
 * Resten av butikkfeltene + leftover Quick client/info ligger her.
 */
export const dealerProfiles = pgTable(
  'dealer_profiles',
  {
    tenantId: uuid('tenant_id')
      .primaryKey()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    orgnr: text('orgnr'),
    address: text('address'),
    postalCode: text('postal_code'),
    city: text('city'),
    phone: text('phone'),
    email: text('email'),
    website: text('website'),
    /** Leftover client/info-nøkler uten egen kolonne. */
    quickClient: jsonb('quick_client')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    tenantPolicy('dealer_profiles', t.tenantId),
    inspectSelectPolicy('dealer_profiles', t.tenantId),
    // Eier-SELECT (`dealer_profiles_tenant_select_owner`) i grants.sql —
    // forhandler.kort leser som eier under FORCE RLS via withTenant.
  ],
).enableRLS();

export type DealerProfile = typeof dealerProfiles.$inferSelect;
export type NewDealerProfile = typeof dealerProfiles.$inferInsert;
