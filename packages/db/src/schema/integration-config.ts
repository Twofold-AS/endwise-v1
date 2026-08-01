import { sql } from 'drizzle-orm';
import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

/**
 * F8-01 / F1-07 — Per-tenant integrasjonskonfig (først: Quick ERP).
 *
 * Én rad per (tenant, provider). `baseUrl` er IKKE en hemmelighet (per-instans
 * URL, f.eks. https://q3.quick.no/ProdShared008) og lagres i klartekst.
 * `tokenCipher` ER en hemmelighet: forhandlerens Quick API-token, envelope-
 * kryptert (AES-256-GCM, se crypto.ts). Klartekst-token rører ALDRI DB.
 *
 * RLS: tenant-isolert som alt annet — forhandler A når aldri forhandler B sin
 * config eller token, uansett hva som sendes inn (verifisert i angrepstest).
 * Kun dealer_admin/endwise_admin skal SKRIVE hit — det håndheves i API-laget
 * (adminProcedure), ikke av RLS (RLS kjenner ikke roller).
 */
export const integrationConfig = pgTable(
  'integration_config',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Integrasjonsnøkkel, f.eks. 'quick'. Speiler modulnøkkelen (F0-04). */
    provider: text('provider').notNull(),
    /** Per-instans REST-baseUrl. Ikke hemmelig. */
    baseUrl: text('base_url'),
    /** Envelope-kryptert API-token (JSON-envelope fra crypto.ts). Aldri klartekst. */
    tokenCipher: text('token_cipher'),
    /** Delta-synk-markør: siste vellykkede synk (brukes som changedAfterDate). */
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    /** Utfall av siste synk/test: 'ok' | 'error' | null (aldri kjørt). */
    lastSyncStatus: text('last_sync_status'),
    /** Fri tekst-detalj til siste synk/test (feilmelding eller «N kunder»). */
    lastSyncDetail: text('last_sync_detail'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.provider] }),
    tenantPolicy('integration_config', t.tenantId),
  ],
).enableRLS();

export type IntegrationConfig = typeof integrationConfig.$inferSelect;
export type NewIntegrationConfig = typeof integrationConfig.$inferInsert;
