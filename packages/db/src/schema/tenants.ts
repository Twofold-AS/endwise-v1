import { sql } from 'drizzle-orm';
import { pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { currentTenantId } from '../rls.ts';
import { authenticatedRole } from '../roles.ts';

/**
 * Tenant = forhandler. Rot-tabellen i multi-tenant-modellen.
 * `id` er den samme UUID-en som Better-Auths `organization.id` (ADR-002).
 * RLS: en tenant ser kun seg selv. Policyen er «id = gjeldende tenant»,
 * ikke «tenant_id = …», fordi raden er tenanten.
 */
/**
 * Er dette en ekte forhandler, eller en demo-tenant for dev-mode?
 * Feltet er en sikkerhetsbetingelse, ikke en etikett. Det er tredje lag i
 * dev-mode-gaten (F5-28 ①): flagg PÅ **og** rolle `endwise_admin` **og**
 * `kind = 'demo'`. Fail-safe: default er `live`, så en tenant som ikke sier
 * noe, er ekte. `platform` er Endwise selv (slug `endwise`) — aldri en
 * forhandler, aldri pakke, aldri i forhandlerlista.
 */
export const TENANT_KINDS = ['live', 'demo', 'platform'] as const;
export type TenantKind = (typeof TENANT_KINDS)[number];

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    kind: text('kind', { enum: TENANT_KINDS }).notNull().default('live'),
    /**
     * Eier-veiviser. Null = dealer_admin må gjennom /oppstart
     * (visningsnavn, valgfrie tillegg, team). Eksisterende tenants ble
     * tilbakevirkende satt i migrasjon 0017.
     */
    onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
    /**
     * Valgt tiers-nøkkel (start | pro | enterprise). Kilden er
     * `packages/modules/src/billing/plans.ts` — aldri hardkodede nøkler.
     */
    plan: text('plan'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    pgPolicy('tenants_self_isolation', {
      as: 'permissive',
      for: 'all',
      to: authenticatedRole,
      using: sql`${t.id} = ${currentTenantId}`,
      withCheck: sql`${t.id} = ${currentTenantId}`,
    }),

    /**
     * Den ene lovlige kryss-tenant-lesningen. **Kun SELECT.**
     * Endwise-admin må kunne liste alle forhandlere for å kunne opprette og
     * følge opp dem. Policyen over gjør det umulig: uten `app.tenant_id` satt
     * gir `tenants` **null rader, ikke alle rader** — noe som fram til
     * gjorde at Forhandlere-siden var stille tom.
     * Fristelsen er å koble til som eier for akkurat den spørringen. Det ville
     * omgått RLS helt, og gjort den ene lesestien til den ene uten isolasjon.
     * I stedet: en egen, navngitt guc som `withPlatformAdmin` setter
     * transaksjons-lokalt — og den helperen kalles kun fra
     * `endwiseAdminProcedure`. Rollen håndheves i applikasjonen, denne
     * policyen er mekanismen som lar den gjøre det uten å skru av RLS.
     * `for: 'select'` og ingen `withCheck` — med vilje. Den kan lese på
     * tvers, aldri skrive. En skriving på tvers av tenants skal fortsatt være
     * umulig, også for oss.
     */
    pgPolicy('tenants_platform_admin_read', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`current_setting('app.platform_admin', true) = 'on'`,
    }),
    /**
     * GDPR-slett (`slett_forhandler`) kjører som eier under force RLS.
     * Unntakene (`tenants_platform_admin_read_owner`, `tenants_platform_admin_insert_owner`,
     * `tenants_tenant_select_owner`, `tenants_slett_forhandler_select`,
     * `tenants_slett_forhandler`) ligger i `sql/grants.sql` — to public + guc.
     * Ikke her: Drizzle-policyer er to authenticated.
     * `tenants_platform_admin_insert_owner` er INSERT (create dealer).
     * `tenants_tenant_select_owner` er withTenant-SELECT (0039) — eier +
     * `app.tenant_id`, ikke platform_admin. Uten den ser lesTenantNavn 0 rader.
     * `tenants_tenant_update_owner` (0041) er fullfor/setModules/forhandler.update
     * — samme GUC, USING+WITH CHECK, ingen platform_admin. Trigger låser
     * id/created_at/plan/kind. Tillater name/slug/onboarding_completed_at.
     * read_owner er SELECT-only for withPlatformAdmin (alle tenants).
     */
  ],
).enableRLS();

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
