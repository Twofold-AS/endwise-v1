import { sql } from 'drizzle-orm';
import { boolean, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

/**
 * F0-04 — Entitlements (plan -> modul), DB-styrt. Erstatter Unleash.
 *
 * Skillet som må holdes rent (techstack §2):
 *   - entitlements  = HVA en tenant har betalt for  -> denne tabellen
 *   - release-toggles = HVA vi har rullet ut        -> Vercel Flags SDK + Edge Config
 *
 * Stripe-abonnement (F8) skriver hit; ingen kode leser Stripe direkte.
 */
export const tenantModules = pgTable(
  'tenant_modules',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Modulnøkkel, f.eks. 'booking', 'messages', 'ai-diagnose'. */
    moduleKey: text('module_key').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    /** Planen som ga tilgangen (audit-spor mot Stripe). */
    plan: text('plan'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.moduleKey] }),
    tenantPolicy('tenant_modules', t.tenantId),
  ],
).enableRLS();

export type TenantModule = typeof tenantModules.$inferSelect;
export type NewTenantModule = typeof tenantModules.$inferInsert;
