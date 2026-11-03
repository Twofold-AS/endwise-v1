import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { currentTenantId, inspectSelectPolicy, tenantPolicy } from '../rls.ts';
import { authenticatedRole } from '../roles.ts';
import { tenants } from './tenants.ts';

export const sharedAssetArtEnum = pgEnum('shared_asset_art', ['kjoretoybilde', 'delebilde']);
export const sharedKontrollEnum = pgEnum('shared_kontroll_status', ['venter', 'ren', 'avvist']);

/**
 * F36 / white label F13 — samtykke til datadeling.
 * Uten aktivt samtykke: null delte rader.
 */
export const tenantAgreements = pgTable(
  'tenant_agreements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    kontraktsversjon: text('kontraktsversjon').notNull(),
    signertAt: timestamp('signert_at', { withTimezone: true }),
    signertAv: text('signert_av'),
    delingSamtykke: boolean('deling_samtykke').notNull().default(false),
    delingOmfang: jsonb('deling_omfang').$type<string[]>().notNull().default([]),
    trukketTilbakeAt: timestamp('trukket_tilbake_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('tenant_agreements_tenant_idx').on(t.tenantId),
    tenantPolicy('tenant_agreements', t.tenantId),
    inspectSelectPolicy('tenant_agreements', t.tenantId),
  ],
).enableRLS();

/**
 * Avidentifisert delingslag. INGEN customer_id, vehicle_id, regnr eller VIN.
 */
export const sharedAssets = pgTable(
  'shared_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    art: sharedAssetArtEnum('art').notNull(),
    kjoretoyModellNokkel: text('kjoretoy_modell_nokkel').notNull(),
    lagringsnokkel: text('lagringsnokkel').notNull(),
    aiTagger: jsonb('ai_tagger').$type<Record<string, unknown>>(),
    aiModell: text('ai_modell'),
    aiKjoringId: text('ai_kjoring_id'),
    personopplysningerFjernet: boolean('personopplysninger_fjernet').notNull().default(false),
    kontrollStatus: sharedKontrollEnum('kontroll_status').notNull().default('venter'),
    samtykkeVersjon: text('samtykke_versjon').notNull(),
    opprettetAt: timestamp('opprettet_at', { withTimezone: true }).notNull().default(sql`now()`),
    trukketTilbakeAt: timestamp('trukket_tilbake_at', { withTimezone: true }),
  },
  (t) => [
    index('shared_assets_modell_idx').on(t.kjoretoyModellNokkel),
    pgPolicy('shared_assets_les', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.trukketTilbakeAt} is null
        and exists (
          select 1 from tenant_agreements a
          where a.tenant_id = ${currentTenantId}
            and a.deling_samtykke = true
            and a.trukket_tilbake_at is null
            and a.signert_at is not null
        )`,
    }),
  ],
).enableRLS();

/** Opprinnelse — kun synlig for origin-tenant og Endwise-admin. */
export const sharedAssetOrigin = pgTable(
  'shared_asset_origin',
  {
    assetId: uuid('asset_id')
      .primaryKey()
      .references(() => sharedAssets.id, { onDelete: 'cascade' }),
    originTenantId: uuid('origin_tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    originAssetId: text('origin_asset_id'),
  },
  (t) => [
    pgPolicy('shared_asset_origin_own', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.originTenantId} = ${currentTenantId}
        or current_setting('app.platform_admin', true) = 'on'`,
    }),
  ],
).enableRLS();

export const sharedAssetUsages = pgTable(
  'shared_asset_usages',
  {
    assetId: uuid('asset_id')
      .notNull()
      .references(() => sharedAssets.id, { onDelete: 'cascade' }),
    bruktAvTenantId: uuid('brukt_av_tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    bruktAt: timestamp('brukt_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.assetId, t.bruktAvTenantId] }),
    tenantPolicy('shared_asset_usages', t.bruktAvTenantId),
  ],
).enableRLS();

export type TenantAgreement = typeof tenantAgreements.$inferSelect;
export type SharedAsset = typeof sharedAssets.$inferSelect;
