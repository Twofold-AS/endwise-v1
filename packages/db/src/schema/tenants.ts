import { sql } from 'drizzle-orm';
import { pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { currentTenantId } from '../rls.ts';
import { authenticatedRole } from '../roles.ts';

/**
 * Tenant = forhandler. Rot-tabellen i multi-tenant-modellen.
 * `id` er den samme UUID-en som Better-Auths `organization.id` (ADR-002).
 *
 * RLS: en tenant ser kun SEG SELV. Policyen er «id = gjeldende tenant»,
 * ikke «tenant_id = …», fordi raden ER tenanten.
 */
/**
 * F5-27 — Er dette en ekte forhandler, eller en demo-tenant for dev-mode?
 *
 * Feltet er en SIKKERHETSBETINGELSE, ikke en etikett. Det er tredje lag i
 * dev-mode-gaten (F5-28 ①): flagg PÅ **og** rolle `endwise_admin` **og**
 * `kind = 'demo'`. Fail-safe: default er `live`, så en tenant som ikke sier
 * noe, er ekte.
 */
export const TENANT_KINDS = ['live', 'demo'] as const;
export type TenantKind = (typeof TENANT_KINDS)[number];

export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    kind: text('kind', { enum: TENANT_KINDS }).notNull().default('live'),
    /**
     * F5-26 — eier-veiviser. Null = dealer_admin må gjennom /oppstart
     * (visningsnavn, valgfrie tillegg, team). Eksisterende tenants ble
     * tilbakevirkende satt i migrasjon 0017.
     */
    onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
    /**
     * Valgt TIERS-nøkkel (start | pro | enterprise). Kilden er
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
     * F5-26 — DEN ENE LOVLIGE KRYSS-TENANT-LESNINGEN. **Kun SELECT.**
     *
     * Endwise-admin må kunne liste alle forhandlere for å kunne opprette og
     * følge opp dem. Policyen over gjør det umulig: uten `app.tenant_id` satt
     * gir `tenants` **null rader, ikke alle rader** — noe som fram til
     * 07.08.2026 gjorde at Forhandlere-siden var stille tom.
     *
     * Fristelsen er å koble til som eier for akkurat den spørringen. Det ville
     * omgått RLS helt, og gjort den ene lesestien til den ene uten isolasjon.
     *
     * I stedet: en egen, navngitt GUC som `withPlatformAdmin()` setter
     * transaksjons-lokalt — og den helperen kalles KUN fra
     * `endwiseAdminProcedure`. Rollen håndheves i applikasjonen, denne
     * policyen er mekanismen som lar den gjøre det uten å skru av RLS.
     *
     * ⛔ **`for: 'select'` og INGEN `withCheck`** — med vilje. Den kan lese på
     * tvers, aldri skrive. En skriving på tvers av tenants skal fortsatt være
     * umulig, også for oss.
     */
    pgPolicy('tenants_platform_admin_read', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`current_setting('app.platform_admin', true) = 'on'`,
    }),
  ],
).enableRLS();

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
