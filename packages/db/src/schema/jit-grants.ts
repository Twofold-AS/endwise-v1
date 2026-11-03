import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { currentTenantId, inspectSelectPolicy } from '../rls.ts';
import { authenticatedRole } from '../roles.ts';
import { tenants } from './tenants.ts';

/**
 * F22 / white label F5b — just-in-time skrive-tilgang for Endwise-team.
 * Impersonering = inspect-skriving på platform, aldri sesjon på forhandlervert.
 * Fire øyne: to endwise_admin, ingen selvgodkjenning. RLS: tenant-les +
 * platform_admin skriver. Append-only historikk bor i audit_log.
 */
export const JIT_OMFANG = ['skriv'] as const;
export const JIT_STATUS = ['venter', 'godkjent', 'avvist', 'utlopt', 'trukket'] as const;

export const jitGrants = pgTable(
  'jit_grants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    soktAv: text('sokt_av').notNull(),
    begrunnelse: text('begrunnelse').notNull(),
    omfang: text('omfang').notNull(),
    varighetMinutter: integer('varighet_minutter').notNull(),
    status: text('status').notNull(),
    godkjenner1: text('godkjenner_1'),
    godkjenner2: text('godkjenner_2'),
    godkjentAt: timestamp('godkjent_at', { withTimezone: true }),
    utloperAt: timestamp('utloper_at', { withTimezone: true }),
    trukketAv: text('trukket_av'),
    trukketAt: timestamp('trukket_at', { withTimezone: true }),
    avvistAv: text('avvist_av'),
    avvistAt: timestamp('avvist_at', { withTimezone: true }),
    varsletAt: timestamp('varslet_at', { withTimezone: true }),
    opprettetAt: timestamp('opprettet_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('jit_grants_tenant_status_idx').on(t.tenantId, t.status),
    index('jit_grants_sokt_status_idx').on(t.soktAv, t.status),
    uniqueIndex('jit_grants_apen_uidx')
      .on(t.tenantId, t.soktAv, t.omfang)
      .where(sql`${t.status} in ('venter','godkjent')`),
    pgPolicy('jit_grants_tenant_read', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.tenantId} = ${currentTenantId}`,
    }),
    inspectSelectPolicy('jit_grants', t.tenantId),
    pgPolicy('jit_grants_platform_admin', {
      as: 'permissive',
      for: 'all',
      to: authenticatedRole,
      using: sql`current_setting('app.platform_admin', true) = 'on'`,
      withCheck: sql`current_setting('app.platform_admin', true) = 'on'`,
    }),
    check('jit_grants_omfang', sql`${t.omfang} in ('skriv')`),
    check(
      'jit_grants_status',
      sql`${t.status} in ('venter','godkjent','avvist','utlopt','trukket')`,
    ),
    check('jit_grants_varighet', sql`${t.varighetMinutter} between 15 and 240`),
  ],
).enableRLS();

export type JitGrant = typeof jitGrants.$inferSelect;
export type NewJitGrant = typeof jitGrants.$inferInsert;
