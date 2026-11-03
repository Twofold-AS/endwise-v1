/*
 * 0049 — White label F5b: just-in-time skrive-tilgang for Endwise-team.
 * Support er read-only uten aktiv grant. To endwise_admin, begrunnelse,
 * 15–240 min, varsel til daglig leder. Impersonering = inspect-skriv
 * på platform, aldri sesjon på forhandlervert.
 */
CREATE TABLE IF NOT EXISTS "jit_grants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "sokt_av" text NOT NULL,
  "begrunnelse" text NOT NULL,
  "omfang" text NOT NULL,
  "varighet_minutter" integer NOT NULL,
  "status" text NOT NULL,
  "godkjenner_1" text,
  "godkjenner_2" text,
  "godkjent_at" timestamp with time zone,
  "utloper_at" timestamp with time zone,
  "trukket_av" text,
  "trukket_at" timestamp with time zone,
  "avvist_av" text,
  "avvist_at" timestamp with time zone,
  "varslet_at" timestamp with time zone,
  "opprettet_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "jit_grants_omfang" CHECK ("omfang" in ('skriv')),
  CONSTRAINT "jit_grants_status" CHECK (
    "status" in ('venter','godkjent','avvist','utlopt','trukket')
  ),
  CONSTRAINT "jit_grants_varighet" CHECK ("varighet_minutter" between 15 and 240)
);-- > statement-breakpoint
CREATE INDEX IF NOT EXISTS "jit_grants_tenant_status_idx" ON "jit_grants" ("tenant_id", "status");-- > statement-breakpoint
CREATE INDEX IF NOT EXISTS "jit_grants_sokt_status_idx" ON "jit_grants" ("sokt_av", "status");-- > statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "jit_grants_apen_uidx" ON "jit_grants" ("tenant_id", "sokt_av", "omfang")
  WHERE "status" in ('venter','godkjent');-- > statement-breakpoint
ALTER TABLE "jit_grants" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
ALTER TABLE "jit_grants" FORCE ROW LEVEL SECURITY;-- > statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "jit_grants" TO authenticated;-- > statement-breakpoint
DROP POLICY IF EXISTS "jit_grants_tenant_read" ON "jit_grants";-- > statement-breakpoint
CREATE POLICY "jit_grants_tenant_read" ON "jit_grants" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ("jit_grants"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
DROP POLICY IF EXISTS "jit_grants_platform_inspect_read" ON "jit_grants";-- > statement-breakpoint
CREATE POLICY "jit_grants_platform_inspect_read" ON "jit_grants" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);-- > statement-breakpoint
DROP POLICY IF EXISTS "jit_grants_platform_admin" ON "jit_grants";-- > statement-breakpoint
CREATE POLICY "jit_grants_platform_admin" ON "jit_grants" AS PERMISSIVE FOR ALL TO "authenticated"
  USING (current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.platform_admin', true) = 'on');-- > statement-breakpoint
DROP POLICY IF EXISTS "audit_log_platform_admin_insert" ON "audit_log";-- > statement-breakpoint
CREATE POLICY "audit_log_platform_admin_insert" ON "audit_log" AS PERMISSIVE FOR INSERT TO "authenticated"
  WITH CHECK (current_setting('app.platform_admin', true) = 'on');
