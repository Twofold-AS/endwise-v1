import { sql } from 'drizzle-orm';
import { check, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { inspectSelectPolicy, tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

/**
 * F16 / white label F0 — tillatelser per område.
 * Ingen rollemaler. Bare daglig leder og Endwise skriver (F6a: FOR UPDATE).
 */
export const TILLATELSE_OMRADER = [
  'bookinger',
  'kunder',
  'kjoretoy',
  'innboks',
  'timeplan',
  'tjenester',
  'lager',
  'nettbutikk',
  'ansatte',
  'innstillinger',
  'okonomi',
] as const;

export const TILLATELSE_NIVA = ['se', 'endre'] as const;

export const memberPermissions = pgTable(
  'member_permissions',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Better-Auth user.id (text). */
    userId: text('user_id').notNull(),
    omrade: text('omrade').notNull(),
    niva: text('niva').notNull(),
    gittAv: text('gitt_av').notNull(),
    gittAt: timestamp('gitt_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.userId, t.omrade] }),
    tenantPolicy('member_permissions', t.tenantId),
    inspectSelectPolicy('member_permissions', t.tenantId),
    check(
      'member_permissions_omrade',
      sql`${t.omrade} in ('bookinger','kunder','kjoretoy','innboks','timeplan','tjenester','lager','nettbutikk','ansatte','innstillinger','okonomi')`,
    ),
    check('member_permissions_niva', sql`${t.niva} in ('se','endre')`),
  ],
).enableRLS();

export type MemberPermission = typeof memberPermissions.$inferSelect;
export type NewMemberPermission = typeof memberPermissions.$inferInsert;
