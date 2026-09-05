import { sql } from 'drizzle-orm';
import { boolean, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

/**
 * Entitlements (plan -> modul), DB-styrt. Erstatter Unleash.
 * Skillet som må holdes rent (techstack §2):
 * entitlements = hva en tenant har betalt for -> denne tabellen
 * release-toggles = hva vi har rullet ut -> Vercel Flags SDK + Edge Config
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
    /**
     * Hvem som tildelte nøkkelen.
     * included — Endwise-admin-pakke, på før eieren kommer
     * optional — admin lot eieren velge i veiviseren (av til hen slår på)
     * dealer — eieren slo på et optional-tillegg
     * stripe — webhook (F5-32)
     */
    source: text('source', { enum: ['included', 'optional', 'dealer', 'stripe'] })
      .notNull()
      .default('included'),
    /** Planen som ga tilgangen (audit-spor mot Stripe). */
    plan: text('plan'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.moduleKey] }),
    tenantPolicy('tenant_modules', t.tenantId),
    // Eier-INSERT (`tenant_modules_platform_admin_insert_owner`) i grants.sql
    // — createTenant skriver pakke-rader som eier under FORCE RLS.
    // Eier-SELECT (`tenant_modules_tenant_select_owner`) — session.me /
    // onboarding / moduleProcedure leser via withTenant.
    // Eier-UPDATE (`tenant_modules_tenant_update_owner`, 0041) — fullfor
    // slår på optional; setModules/Stripe skriver enabled/source/plan.
  ],
).enableRLS();

export type TenantModule = typeof tenantModules.$inferSelect;
export type NewTenantModule = typeof tenantModules.$inferInsert;
