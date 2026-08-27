/*
 * 0031 — dealer_profiles: idempotent tabell + GRANT + force RLS.
 * 0030 kan være i journal uten at tabellen finnes (prod 500 på forhandler.get),
 * eller tabellen finnes uten GRANT hvis db:grants ikke ble kjørt.
 * leftover i quick_client. Ingen nye prisfelt.
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
ALTER TABLE "dealer_profiles" FORCE ROW LEVEL SECURITY;-- > statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "dealer_profiles" TO authenticated;-- > statement-breakpoint
DROP POLICY IF EXISTS "dealer_profiles_tenant_isolation" ON "dealer_profiles";-- > statement-breakpoint
CREATE POLICY "dealer_profiles_tenant_isolation" ON "dealer_profiles" AS PERMISSIVE FOR ALL TO "authenticated"
  USING ("dealer_profiles"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("dealer_profiles"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
DROP POLICY IF EXISTS "dealer_profiles_platform_inspect_read" ON "dealer_profiles";-- > statement-breakpoint
CREATE POLICY "dealer_profiles_platform_inspect_read" ON "dealer_profiles" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);
