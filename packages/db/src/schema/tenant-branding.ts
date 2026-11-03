import { sql } from 'drizzle-orm';
import { boolean, check, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { inspectSelectPolicy, tenantPolicy } from '../rls.ts';
import { tenants } from './tenants.ts';

/**
 * F16 / white label F0 — forhandlerens merke (utkast).
 * Offentlig lesing skjer senere via lookup_tenant_by_host (bare navn, logo,
 * farger, kontakt). Ingen SVG. Skriving: tenantPolicy, dealer_admin i F3.
 */
export const LOGO_MIME_TILLATT = ['image/png', 'image/webp'] as const;

export const tenantBranding = pgTable(
  'tenant_branding',
  {
    tenantId: uuid('tenant_id')
      .primaryKey()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    visningsnavn: text('visningsnavn').notNull(),
    logoUrl: text('logo_url'),
    logoMorkUrl: text('logo_mork_url'),
    faviconUrl: text('favicon_url'),
    /** Bare PNG/WebP. SVG er forbudt (XSS). */
    logoMime: text('logo_mime'),
    aksentfarge: text('aksentfarge'),
    aksentTekstfarge: text('aksent_tekstfarge'),
    avsendernavn: text('avsendernavn'),
    svarTilEpost: text('svar_til_epost'),
    visLevertAv: boolean('vis_levert_av').notNull().default(true),
    utkast: jsonb('utkast').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    publisertAt: timestamp('publisert_at', { withTimezone: true }),
    oppdatertAt: timestamp('oppdatert_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    tenantPolicy('tenant_branding', t.tenantId),
    inspectSelectPolicy('tenant_branding', t.tenantId),
    check(
      'tenant_branding_logo_mime',
      sql`${t.logoMime} is null or ${t.logoMime} in ('image/png', 'image/webp')`,
    ),
    check(
      'tenant_branding_aksentfarge',
      sql`${t.aksentfarge} is null or ${t.aksentfarge} ~ '^#[0-9a-fA-F]{6}$'`,
    ),
  ],
).enableRLS();

export type TenantBranding = typeof tenantBranding.$inferSelect;
export type NewTenantBranding = typeof tenantBranding.$inferInsert;
