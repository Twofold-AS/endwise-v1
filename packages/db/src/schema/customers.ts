import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

/** F2-06 — Kunderegister. Sluttkunden hos en forhandler. */
export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Better-Auth-bruker, hvis kunden har logget inn på «Min side» (F6). Ellers null. */
    userId: text('user_id'),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    /**
     * F8-01 — Hvor kunden kom fra: 'endwise' (opprettet her) eller 'quick'
     * (speilet fra forhandlerens Quick). Default 'endwise'. Plain text (som
     * bookings.source), ikke enum — kilder kan komme til (Lime CRM, Finn …).
     */
    source: text('source').notNull().default('endwise'),
    /**
     * F8-01 — Quick sin entitets-GUID (externalRef). Bærer identiteten på tvers
     * av synk-kjøringer, så upsert blir idempotent. Null for kunder født i Endwise.
     */
    quickGuid: text('quick_guid'),
    /**
     * F8-01 — Merge-base for tre-veis fletting: verdiene vi SIST hentet fra Quick
     * for de Quick-eide feltene ({name, email, phone}). Lar oss skille «Quick
     * endret» fra «vi endret» per felt. Null før første pull / for lokale kunder.
     * Lokale redigeringer skal IKKE røre denne — kun pull/konflikt-løsning gjør.
     */
    quickBaseline: jsonb('quick_baseline').$type<Record<string, string | null>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('customers_tenant_name_idx').on(t.tenantId, t.name),
    /**
     * Idempotent Quick-synk: (tenant, quickGuid) er unik. Postgres teller NULL-er
     * som distinkte, så Endwise-fødte kunder (quickGuid = null) rammes ikke.
     * Brukes som konflikt-mål i upsert (onConflictDoUpdate).
     */
    uniqueIndex('customers_tenant_quick_guid_uidx').on(t.tenantId, t.quickGuid),
    tenantPolicy('customers', t.tenantId),
  ],
).enableRLS();

/** F2-06 — Notater. Egen tabell, ikke en tekstkolonne: notater har forfatter og tid. */
export const customerNotes = pgTable(
  'customer_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    authorId: text('author_id').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('customer_notes_customer_idx').on(t.customerId, t.createdAt),
    tenantPolicy('customer_notes', t.tenantId),
  ],
).enableRLS();

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type CustomerNote = typeof customerNotes.$inferSelect;
export type NewCustomerNote = typeof customerNotes.$inferInsert;
