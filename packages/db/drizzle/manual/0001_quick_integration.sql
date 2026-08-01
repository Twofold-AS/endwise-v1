-- ============================================================================
-- F8-01 / F1-07 — Quick-integrasjon: DB-endringer (REFERANSE / MANUELL)
-- ============================================================================
-- MERK: Denne fila er IKKE en drizzle-kit-sporet migrasjon (den står utenfor
-- drizzle/meta/_journal.json med vilje). Den ble håndskrevet fordi drizzle-kit
-- ikke kunne kjøres i byggemiljøet (esbuild-binæren var installert for feil OS).
--
-- KANONISK VEI (gjør dette i ditt eget miljø):
--   pnpm --filter @endwise/db db:generate   # produserer den ekte 0001_*-migrasjonen + snapshot
--   pnpm --filter @endwise/db db:migrate     # (eller db:setup) — kjører den
--
-- DDL-en under speiler nøyaktig hva schema-endringene i src/schema/ innebærer,
-- og kan kjøres manuelt mot en lokal base for rask testing. Idempotens-vennlig.
-- ----------------------------------------------------------------------------

-- 1) customers: kildespor + Quick-GUID (externalRef) + idempotent unik nøkkel
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'endwise' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "quick_guid" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customers_tenant_quick_guid_uidx" ON "customers" USING btree ("tenant_id","quick_guid");--> statement-breakpoint

-- 2) integration_config: per-tenant integrasjonskonfig (Quick først)
CREATE TABLE IF NOT EXISTS "integration_config" (
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"base_url" text,
	"token_cipher" text,
	"last_synced_at" timestamp with time zone,
	"last_sync_status" text,
	"last_sync_detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_config_tenant_id_provider_pk" PRIMARY KEY("tenant_id","provider")
);--> statement-breakpoint
ALTER TABLE "integration_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "integration_config" ADD CONSTRAINT "integration_config_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE POLICY "integration_config_tenant_isolation" ON "integration_config" AS PERMISSIVE FOR ALL TO "authenticated" USING ("integration_config"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("integration_config"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint

-- 3) Tre-veis fletting: merge-base på customers + konflikt-kø
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "quick_baseline" jsonb;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"field" text NOT NULL,
	"base_value" text,
	"our_value" text,
	"their_value" text,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"push_intent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "sync_conflicts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_conflicts_tenant_status_idx" ON "sync_conflicts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sync_conflicts_open_uidx" ON "sync_conflicts" USING btree ("tenant_id","provider","entity","entity_id","field") WHERE "sync_conflicts"."status" = 'open';--> statement-breakpoint
CREATE POLICY "sync_conflicts_tenant_isolation" ON "sync_conflicts" AS PERMISSIVE FOR ALL TO "authenticated" USING ("sync_conflicts"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("sync_conflicts"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
