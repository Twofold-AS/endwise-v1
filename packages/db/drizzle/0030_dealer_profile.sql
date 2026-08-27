/*
 * 0030 — Forhandler-butikk (Organisasjon › Forhandleren).
 * Firmanavn forblir tenants.name / organization.name.
 * Slug skrives aldri herfra. leftover Quick client/info i quick_client.
 * grants.sql force-er nye RLS-tabeller automatisk.
 */
CREATE TABLE IF NOT EXISTS "dealer_profiles" (
  "tenant_id" uuid PRIMARY KEY NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "orgnr" text,
  "address" text,
  "postal_code" text,
  "city" text,
  "phone" text,
  "email" text,
  "website" text,
  "quick_client" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);-- > statement-breakpoint
ALTER TABLE "dealer_profiles" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
DROP POLICY IF EXISTS "dealer_profiles_tenant_isolation" ON "dealer_profiles";-- > statement-breakpoint
CREATE POLICY "dealer_profiles_tenant_isolation" ON "dealer_profiles" AS PERMISSIVE FOR ALL TO "authenticated"
  USING ("dealer_profiles"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("dealer_profiles"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
DROP POLICY IF EXISTS "dealer_profiles_platform_inspect_read" ON "dealer_profiles";-- > statement-breakpoint
CREATE POLICY "dealer_profiles_platform_inspect_read" ON "dealer_profiles" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);
