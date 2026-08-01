import { sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'sms']);
export const notificationStatusEnum = pgEnum('notification_status', ['sent', 'failed']);

/**
 * F3-04 — Varslings-logg, og samtidig idempotensvakten.
 *
 * Vercel Workflows RETRYER steg som feiler (F0-13). Uten denne tabellen ville en
 * retry etter en timeout — der SMS-en faktisk gikk ut — sendt den én gang til.
 * Kunden får ikke to påminnelser om samme time fordi nettverket hikstet.
 *
 * Nøkkelen er unik per tenant. Sendingen skjer KUN hvis raden ble skrevet.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    channel: notificationChannelEnum('channel').notNull(),
    /** Mottaker: e-post eller telefonnummer. */
    recipient: text('recipient').notNull(),
    /** Hva dette gjaldt: 'booking.confirmed', 'booking.reminder', 'deviation.alert' … */
    kind: text('kind').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    status: notificationStatusEnum('status').notNull(),
    /** Leverandørens ID (Resend/Twilio), for sporing. */
    providerMessageId: text('provider_message_id'),
    error: text('error'),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex('notifications_tenant_idempotency_uidx').on(t.tenantId, t.idempotencyKey),
    index('notifications_tenant_kind_idx').on(t.tenantId, t.kind, t.sentAt),
    tenantPolicy('notifications', t.tenantId),
  ],
).enableRLS();

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
