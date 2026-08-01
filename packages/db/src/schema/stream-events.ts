import { sql } from 'drizzle-orm';
import { bigserial, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

/**
 * F6-02 — Event-loggen SSE-strømmen leser fra.
 *
 * Hvorfor en tabell, når vi allerede har LISTEN/NOTIFY:
 *
 * NOTIFY er ILDLEDNING UTEN HUKOMMELSE. Er klienten frakoblet i de to sekundene
 * eventet fyres, er det borte for alltid. En mekaniker som kjører gjennom en
 * tunnel ville mistet jobboppdateringen sin.
 *
 * Derfor: hendelsen SKRIVES her (monotont `id`), og NOTIFY sier bare «det finnes
 * noe nytt». Ved reconnect sender klienten `Last-Event-ID`, og vi spiller av alt
 * med høyere id. NOTIFY er varselklokka; tabellen er sannheten.
 *
 * `id` er bigserial og GLOBALT monotont — ikke per tenant. Det er trygt fordi
 * RLS filtrerer radene: en klient ser bare sine egne id-er, og hopp i
 * nummerrekka lekker ingenting annet enn at andre tenants finnes.
 */
export const streamEvents = pgTable(
  'stream_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Hvem eventet er for: bruker-ID, eller null = hele tenanten. */
    audienceId: text('audience_id'),
    /** 'message.created' · 'booking.updated' · 'agent.token' … */
    type: text('type').notNull(),
    /** Ressursen dette gjelder (tråd-ID, booking-ID …). */
    subjectId: text('subject_id'),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('stream_events_tenant_id_idx').on(t.tenantId, t.id),
    index('stream_events_created_idx').on(t.createdAt),
    tenantPolicy('stream_events', t.tenantId),
  ],
).enableRLS();

export type StreamEvent = typeof streamEvents.$inferSelect;
export type NewStreamEvent = typeof streamEvents.$inferInsert;

/**
 * Kanalen alle NOTIFY-er går på. ÉN kanal, ikke én per tenant:
 * LISTEN-kanaler er globale identifikatorer, og et kanalnavn per tenant ville
 * betydd at stream-tjenesten måtte kjøre LISTEN på nytt hver gang en forhandler
 * opprettes. Tenant-filtreringen skjer i tjenesten OG i RLS — payloaden på
 * NOTIFY inneholder aldri innhold, bare «event <id> for tenant <x> finnes».
 */
export const STREAM_CHANNEL = 'endwise_stream';
