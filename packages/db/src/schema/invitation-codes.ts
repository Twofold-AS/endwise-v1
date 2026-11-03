import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { inspectSelectPolicy, tenantPolicy } from '../rls.ts';
import { invitations } from './invitations.ts';
import { tenants } from './tenants.ts';

/**
 * F16 / white label F0 — kort e-postkode til invitasjon.
 * Egen tabell: invitations-triggeren låser alle felt unntatt
 * revoked_at / accepted_at, så kode-forsøk kan ikke bo der.
 * Hash = HMAC-SHA-256(pepper, salt:kode). Aldri klartekst.
 */
export const invitationCodes = pgTable(
  'invitation_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invitationId: uuid('invitation_id')
      .notNull()
      .references(() => invitations.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    codeSalt: text('code_salt').notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    sendCount: integer('send_count').notNull().default(0),
    windowStartedAt: timestamp('window_started_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex('invitation_codes_invitation_uidx').on(t.invitationId),
    tenantPolicy('invitation_codes', t.tenantId),
    inspectSelectPolicy('invitation_codes', t.tenantId),
    check('invitation_codes_attempts', sql`${t.attempts} >= 0`),
  ],
).enableRLS();

export type InvitationCode = typeof invitationCodes.$inferSelect;
export type NewInvitationCode = typeof invitationCodes.$inferInsert;
