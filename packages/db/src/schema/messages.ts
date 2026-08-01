import { sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

/**
 * F6-01 — Meldingstråder.
 *
 * De tre samtale-kanalene (techstack §3) deler ÉN trådmodell. Forskjellen er
 * bare hvem som står i hver ende:
 *   customer_dealer  — kunde ↔ forhandler (widget)
 *   mechanic_dealer  — mekaniker ↔ forhandler (PWA)
 *   dealer_admin     — forhandler ↔ oss (support)
 */
export const threadKindEnum = pgEnum('thread_kind', [
  'customer_dealer',
  'mechanic_dealer',
  'dealer_admin',
]);

export const threads = pgTable(
  'threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    kind: threadKindEnum('kind').notNull(),
    subject: text('subject'),
    /** Denorm: sorterer innboksen uten å joine mot messages. */
    lastMessageAt: timestamp('last_message_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('threads_tenant_last_idx').on(t.tenantId, t.lastMessageAt),
    tenantPolicy('threads', t.tenantId),
  ],
).enableRLS();

/**
 * Hvem er med i tråden.
 *
 * Dette er tilgangskontrollen på meldingsnivå: RLS holder tenant-grensen, men
 * INNENFOR en tenant skal ikke hvilken som helst ansatt kunne lese hvilken som
 * helst kundesamtale. Deltakelse er kravet.
 */
export const threadParticipants = pgTable(
  'thread_participants',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => threads.id, { onDelete: 'cascade' }),
    /** Better-Auth-bruker-ID, eller 'agent:<navn>' for en AI-førstelinje (F6-13). */
    participantId: text('participant_id').notNull(),
    /** Sist leste melding. Driver uleste-tellingen. */
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.threadId, t.participantId] }),
    index('thread_participants_participant_idx').on(t.tenantId, t.participantId),
    tenantPolicy('thread_participants', t.tenantId),
  ],
).enableRLS();

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => threads.id, { onDelete: 'cascade' }),
    /** Bruker-ID, eller 'agent:<navn>'. En agent er bare en deltaker til (F6-05). */
    authorId: text('author_id').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('messages_thread_created_idx').on(t.threadId, t.createdAt),
    tenantPolicy('messages', t.tenantId),
  ],
).enableRLS();

export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
export type ThreadParticipant = typeof threadParticipants.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
