import { sql } from 'drizzle-orm';
import { index, jsonb, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { currentTenantId } from '../rls.ts';
import { authenticatedRole } from '../roles.ts';
import { tenants } from './tenants.ts';

/**
 * Audit-grunnlag: append-only logg av kritiske operasjoner.
 * Append-only håndheves i databasen, ikke i koden: policyene under gir
 * INSERT og SELECT — ingen UPDATE, ingen DELETE. En kompromittert app-rolle
 * kan altså skrive historie, men ikke skrive om den.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    /** Hvem: bruker-ID, 'system', eller 'agent:<navn>'. */
    actor: text('actor').notNull(),
    /** Hva: 'tenant.created', 'entitlement.changed', 'booking.cancelled' … */
    action: text('action').notNull(),
    /** På hva: tabell/entitet + ID. */
    subjectType: text('subject_type').notNull(),
    subjectId: text('subject_id'),
    /** Kontekst. Ingen hemmeligheter her — det logges aldri OTP, tokens eller nøkler. */
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    ipAddress: text('ip_address'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('audit_log_tenant_occurred_idx').on(t.tenantId, t.occurredAt),
    pgPolicy('audit_log_tenant_read', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.tenantId} = ${currentTenantId}`,
    }),
    pgPolicy('audit_log_tenant_insert', {
      as: 'permissive',
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${t.tenantId} = ${currentTenantId}`,
    }),
    // Ingen UPDATE- eller DELETE-policy for authenticated. Det er
    // append-only-garantien. `slett_forhandler` redigerer via to public-
    // policyer i sql/grants.sql (guc + ikke-authenticated), aldri her.
  ],
).enableRLS();

export type AuditEntry = typeof auditLog.$inferSelect;
export type NewAuditEntry = typeof auditLog.$inferInsert;
