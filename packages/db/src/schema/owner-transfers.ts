import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { currentTenantId, inspectSelectPolicy } from '../rls.ts';
import { authenticatedRole } from '../roles.ts';
import { tenants } from './tenants.ts';

/**
 * F29 / white label F8c — overføring av daglig leder.
 * Frivillig: TOTP + atomisk bytte. Nød: to Endwise-admin og 7 dagers varsel.
 */
export const OWNER_TRANSFER_KIND = ['frivillig', 'nod'] as const;
export const OWNER_TRANSFER_STATUS = [
  'venter',
  'godkjent',
  'utfort',
  'avvist',
  'trukket',
] as const;

export const ownerTransfers = pgTable(
  'owner_transfers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    status: text('status').notNull(),
    fraUserId: text('fra_user_id').notNull(),
    tilUserId: text('til_user_id').notNull(),
    tillatelser: jsonb('tillatelser').$type<Record<string, 'se' | 'endre'>>(),
    begrunnelse: text('begrunnelse'),
    soktAv: text('sokt_av').notNull(),
    godkjenner1: text('godkjenner_1'),
    godkjenner2: text('godkjenner_2'),
    varsletAt: timestamp('varslet_at', { withTimezone: true }),
    utforEtter: timestamp('utfor_etter', { withTimezone: true }),
    utfortAt: timestamp('utfort_at', { withTimezone: true }),
    opprettetAt: timestamp('opprettet_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('owner_transfers_tenant_status_idx').on(t.tenantId, t.status),
    inspectSelectPolicy('owner_transfers', t.tenantId),
    pgPolicy('owner_transfers_tenant_read', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.tenantId} = ${currentTenantId}`,
    }),
    pgPolicy('owner_transfers_tenant_write', {
      as: 'permissive',
      for: 'all',
      to: authenticatedRole,
      using: sql`${t.tenantId} = ${currentTenantId}`,
      withCheck: sql`${t.tenantId} = ${currentTenantId}`,
    }),
    pgPolicy('owner_transfers_platform_admin', {
      as: 'permissive',
      for: 'all',
      to: authenticatedRole,
      using: sql`current_setting('app.platform_admin', true) = 'on'`,
      withCheck: sql`current_setting('app.platform_admin', true) = 'on'`,
    }),
    check('owner_transfers_kind', sql`${t.kind} in ('frivillig','nod')`),
    check(
      'owner_transfers_status',
      sql`${t.status} in ('venter','godkjent','utfort','avvist','trukket')`,
    ),
  ],
).enableRLS();

export type OwnerTransfer = typeof ownerTransfers.$inferSelect;
export type NewOwnerTransfer = typeof ownerTransfers.$inferInsert;
