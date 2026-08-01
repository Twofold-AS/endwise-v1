import { sql } from 'drizzle-orm';
import { pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { currentTenantId } from '../rls.ts';
import { authenticatedRole } from '../roles.ts';

/**
 * Tenant = forhandler. Rot-tabellen i multi-tenant-modellen.
 * `id` er den samme UUID-en som Better-Auths `organization.id` (ADR-002).
 *
 * RLS: en tenant ser kun SEG SELV. Policyen er «id = gjeldende tenant»,
 * ikke «tenant_id = …», fordi raden ER tenanten.
 */
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    pgPolicy('tenants_self_isolation', {
      as: 'permissive',
      for: 'all',
      to: authenticatedRole,
      using: sql`${t.id} = ${currentTenantId}`,
      withCheck: sql`${t.id} = ${currentTenantId}`,
    }),
  ],
).enableRLS();

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
