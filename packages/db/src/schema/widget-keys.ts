import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

/**
 * Publishable widget-nøkkel per forhandler.
 * Dette er en offentlig nøkkel (trygg å legge i en publisert Framer-side, à la
 * Stripes `pk_...`). Den er ikke en hemmelighet — den identifiserer bare hvilken
 * tenant en anonym kunde snakker på vegne av, og hvilke origins embed-en får
 * kjøre fra. Secret-nøkler skal aldri i Framer (CWE-798/522).
 * Sikkerhetsmodell: nøkkelen alene gir kun det en anonym kunde skal kunne — se
 * tjenester/ledige tider og opprette en booking-forespørsel. All faktisk data-
 * tilgang er RLS-scopet til `tenantId`. `allowedOrigins` begrenser hvilke
 * nettsteder som kan veksle nøkkelen inn i et kortlevd token (CORS/origin-vern).
 * RLS: forvaltnings-/skrivestien (dealer_admin) er tenant-isolert. Selve
 * nøkkel→tenant-oppslaget (før vi har tenant-kontekst) går via
 * `lookup_widget_key` (SECURITY DEFINER + `app.widget_publishable_key`).
 * Unscopet select gir 0 rader under FORCE RLS. Nøkkelen er offentlig.
 */
export const widgetKeys = pgTable(
  'widget_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Offentlig nøkkel, f.eks. `pk_live_<32 hex>`. Unik på tvers av alle tenants. */
    publishableKey: text('publishable_key').notNull(),
    /**
     * Tillatte origins (skjema + host, uten sti), f.eks. `https://verksted.no`.
     * Kun disse kan veksle nøkkelen inn i et token. Tom = ingen (feiler lukket).
     */
    allowedOrigins: text('allowed_origins').array().notNull().default(sql`'{}'::text[]`),
    /** Menneskelig etikett («Hovednettside»). */
    label: text('label'),
    /** Deaktivert nøkkel avvises umiddelbart (rotasjon/tilbaketrekking). */
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex('widget_keys_publishable_key_uidx').on(t.publishableKey),
    index('widget_keys_tenant_idx').on(t.tenantId),
    tenantPolicy('widget_keys', t.tenantId),
  ],
).enableRLS();

export type WidgetKey = typeof widgetKeys.$inferSelect;
export type NewWidgetKey = typeof widgetKeys.$inferInsert;
