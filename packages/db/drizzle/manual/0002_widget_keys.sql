-- ============================================================================
-- F4-02 — Publishable widget-nøkkel per forhandler (REFERANSE / MANUELL)
-- ============================================================================
-- IKKE drizzle-kit-sporet (utenfor _journal.json). Kanonisk vei i ditt miljø:
--   pnpm --filter @endwise/db db:generate && db:migrate
-- Se 0001_quick_integration.sql for hvorfor (drizzle-kit kunne ikke kjøres her).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "widget_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"publishable_key" text NOT NULL,
	"allowed_origins" text[] DEFAULT '{}'::text[] NOT NULL,
	"label" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "widget_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "widget_keys" ADD CONSTRAINT "widget_keys_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "widget_keys_publishable_key_uidx" ON "widget_keys" USING btree ("publishable_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "widget_keys_tenant_idx" ON "widget_keys" USING btree ("tenant_id");--> statement-breakpoint
CREATE POLICY "widget_keys_tenant_isolation" ON "widget_keys" AS PERMISSIVE FOR ALL TO "authenticated" USING ("widget_keys"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("widget_keys"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);
