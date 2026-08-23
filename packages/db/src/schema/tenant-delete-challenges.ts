import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Engangskode for GDPR-slett av forhandler.
 *
 * ⛔ Ingen RLS med vilje — samme mønster som Better-Auth-tabellene.
 * Tabellen røres KUN fra `endwiseAdminProcedure`. Radene er
 * admin-bruker + mål-tenant + hash, aldri koden selv.
 */
export const tenantDeleteChallenges = pgTable('tenant_delete_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  requestedBy: text('requested_by').notNull(),
  codeHash: text('code_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});
