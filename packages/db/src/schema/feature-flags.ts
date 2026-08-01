import { sql } from 'drizzle-orm';
import { boolean, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

/**
 * F0-04 — Release-toggles (feature flags), DB-styrt. ERSTATTER Vercel Edge
 * Config (betalt lagring, brukergodkjent 16.07.2026). Selve `flags`-SDK-en var
 * gratis/OSS; det var Edge Config-LAGRINGEN som kostet. Nå bor sannheten i
 * Postgres og styres fra admin — gratis og full kontroll.
 *
 * Skillet mot entitlements (tenant_modules) står (techstack §2):
 *   - entitlement    = «har forhandleren KJØPT modulen?»   (tenant_modules)
 *   - release-toggle = «har VI RULLET UT funksjonen?»       (denne)
 * Begge må si ja.
 */

/** Globalt av/på per flagg (system-vidt). Skrives kun av endwise_admin. */
export const featureFlags = pgTable('feature_flags', {
  key: text('key').primaryKey(),
  description: text('description'),
  enabled: boolean('enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

/** Per-tenant overstyring av et globalt flagg. Tenant-skopet via RLS. */
export const featureFlagOverrides = pgTable(
  'feature_flag_overrides',
  {
    flagKey: text('flag_key').notNull(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    enabled: boolean('enabled').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.flagKey, t.tenantId] }),
    tenantPolicy('feature_flag_overrides', t.tenantId),
  ],
).enableRLS();

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;
export type FeatureFlagOverride = typeof featureFlagOverrides.$inferSelect;
