import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { inspectSelectPolicy, tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

export const TENANT_DOMENE_TYPER = ['subdomene', 'eget'] as const;
export const TENANT_DOMENE_STATUS = ['ventende', 'verifisert', 'feilet'] as const;

/**
 * F16 / white label F0 — vert per tenant.
 * Subdomene (`bergen.endwise.no`) og senere eget CNAME. Unik vert globalt.
 */
export const tenantDomains = pgTable(
  'tenant_domains',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    vert: text('vert').notNull(),
    type: text('type', { enum: TENANT_DOMENE_TYPER }).notNull().default('subdomene'),
    primar: boolean('primar').notNull().default(true),
    status: text('status', { enum: TENANT_DOMENE_STATUS }).notNull().default('ventende'),
    verifisertAt: timestamp('verifisert_at', { withTimezone: true }),
    opprettetAt: timestamp('opprettet_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex('tenant_domains_vert_uidx').on(t.vert),
    tenantPolicy('tenant_domains', t.tenantId),
    inspectSelectPolicy('tenant_domains', t.tenantId),
    check('tenant_domains_vert_lower', sql`${t.vert} = lower(${t.vert})`),
  ],
).enableRLS();

export type TenantDomain = typeof tenantDomains.$inferSelect;
export type NewTenantDomain = typeof tenantDomains.$inferInsert;
