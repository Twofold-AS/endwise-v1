/*
 * 0045 — White label F0 (ADR-005): utkast for branding, domener,
 * reserverte slugs, invitasjonskoder og tillatelser per område.
 *
 * Ingen atferd. Eksisterende invitations-rader urørt (triggeren der
 * låser alle felt unntatt revoked_at / accepted_at).
 *
 * RLS-skisse (håndheves i F2/F6a/F7, ikke på eksisterende tabeller her):
 *   lookup_tenant_by_host(host) SECURITY DEFINER
 *     → bare offentlige felt (navn, logo PNG/WebP, farger, kontakt).
 *     Aldri tenant-id eller utkast i delt cache.
 *   app.actor = 'customer' | 'staff' — RESTRICTIVE policyer feiler lukket.
 *   member_permissions skrives via funksjon med FOR UPDATE, bare daglig
 *     leder eller Endwise-admin. Ingen kan endre egne tillatelser.
 *   Logo: MIME-sjekk + re-encode i F3. Ingen SVG.
 */
CREATE TABLE IF NOT EXISTS "tenant_branding" (
  "tenant_id" uuid PRIMARY KEY NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "visningsnavn" text NOT NULL,
  "logo_url" text,
  "logo_mork_url" text,
  "favicon_url" text,
  "logo_mime" text,
  "aksentfarge" text,
  "aksent_tekstfarge" text,
  "avsendernavn" text,
  "svar_til_epost" text,
  "vis_levert_av" boolean DEFAULT true NOT NULL,
  "utkast" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "publisert_at" timestamp with time zone,
  "oppdatert_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_branding_logo_mime" CHECK (
    "logo_mime" is null or "logo_mime" in ('image/png', 'image/webp')
  ),
  CONSTRAINT "tenant_branding_aksentfarge" CHECK (
    "aksentfarge" is null or "aksentfarge" ~ '^#[0-9a-fA-F]{6}$'
  )
);-- > statement-breakpoint
ALTER TABLE "tenant_branding" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
ALTER TABLE "tenant_branding" FORCE ROW LEVEL SECURITY;-- > statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "tenant_branding" TO authenticated;-- > statement-breakpoint
DROP POLICY IF EXISTS "tenant_branding_tenant_isolation" ON "tenant_branding";-- > statement-breakpoint
CREATE POLICY "tenant_branding_tenant_isolation" ON "tenant_branding" AS PERMISSIVE FOR ALL TO "authenticated"
  USING ("tenant_branding"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_branding"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
DROP POLICY IF EXISTS "tenant_branding_platform_inspect_read" ON "tenant_branding";-- > statement-breakpoint
CREATE POLICY "tenant_branding_platform_inspect_read" ON "tenant_branding" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);-- > statement-breakpoint

CREATE TABLE IF NOT EXISTS "tenant_domains" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "vert" text NOT NULL,
  "type" text DEFAULT 'subdomene' NOT NULL,
  "primar" boolean DEFAULT true NOT NULL,
  "status" text DEFAULT 'ventende' NOT NULL,
  "verifisert_at" timestamp with time zone,
  "opprettet_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "tenant_domains_vert_lower" CHECK ("vert" = lower("vert"))
);-- > statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_domains_vert_uidx" ON "tenant_domains" ("vert");-- > statement-breakpoint
ALTER TABLE "tenant_domains" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
ALTER TABLE "tenant_domains" FORCE ROW LEVEL SECURITY;-- > statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "tenant_domains" TO authenticated;-- > statement-breakpoint
DROP POLICY IF EXISTS "tenant_domains_tenant_isolation" ON "tenant_domains";-- > statement-breakpoint
CREATE POLICY "tenant_domains_tenant_isolation" ON "tenant_domains" AS PERMISSIVE FOR ALL TO "authenticated"
  USING ("tenant_domains"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_domains"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
DROP POLICY IF EXISTS "tenant_domains_platform_inspect_read" ON "tenant_domains";-- > statement-breakpoint
CREATE POLICY "tenant_domains_platform_inspect_read" ON "tenant_domains" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);-- > statement-breakpoint

CREATE TABLE IF NOT EXISTS "reserverte_slugs" (
  "slug" text PRIMARY KEY NOT NULL,
  "grunn" text NOT NULL,
  "opprettet_at" timestamp with time zone DEFAULT now() NOT NULL
);-- > statement-breakpoint
-- Seed FØR FORCE RLS. Policyen er TO authenticated + platform_admin.
-- Eier (endwise) under FORCE treffer ingen policy → 42501
-- ExecWithCheckOptions. Prod-bygg 84ea3b7 feilet her.
INSERT INTO "reserverte_slugs" ("slug", "grunn") VALUES
  ('platform', 'skjult admin'),
  ('admin', 'plattform'),
  ('www', 'marked'),
  ('app', 'historisk'),
  ('api', 'tjeneste'),
  ('mail', 'e-post'),
  ('smtp', 'e-post'),
  ('imap', 'e-post'),
  ('ftp', 'tjeneste'),
  ('status', 'plattform'),
  ('docs', 'plattform'),
  ('help', 'plattform'),
  ('hjelp', 'plattform'),
  ('support', 'plattform'),
  ('kunde', 'plattform'),
  ('login', 'auth'),
  ('logg-inn', 'auth'),
  ('auth', 'auth'),
  ('static', 'tjeneste'),
  ('assets', 'tjeneste'),
  ('cdn', 'tjeneste'),
  ('dev', 'miljø'),
  ('test', 'miljø'),
  ('staging', 'miljø'),
  ('preview', 'miljø'),
  ('demo', 'miljø'),
  ('widget', 'tjeneste'),
  ('cron', 'tjeneste'),
  ('stream', 'tjeneste'),
  ('framer', 'tjeneste'),
  ('noreply', 'e-post'),
  ('no-reply', 'e-post'),
  ('post', 'e-post'),
  ('webmail', 'e-post')
ON CONFLICT ("slug") DO NOTHING;-- > statement-breakpoint
ALTER TABLE "reserverte_slugs" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
ALTER TABLE "reserverte_slugs" FORCE ROW LEVEL SECURITY;-- > statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "reserverte_slugs" TO authenticated;-- > statement-breakpoint
DROP POLICY IF EXISTS "reserverte_slugs_platform_admin" ON "reserverte_slugs";-- > statement-breakpoint
CREATE POLICY "reserverte_slugs_platform_admin" ON "reserverte_slugs" AS PERMISSIVE FOR ALL TO "authenticated"
  USING (current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.platform_admin', true) = 'on');-- > statement-breakpoint

CREATE TABLE IF NOT EXISTS "invitation_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invitation_id" uuid NOT NULL REFERENCES "invitations"("id") ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "code_hash" text NOT NULL,
  "code_salt" text NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "invitation_codes_attempts" CHECK ("attempts" >= 0)
);-- > statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invitation_codes_invitation_uidx" ON "invitation_codes" ("invitation_id");-- > statement-breakpoint
ALTER TABLE "invitation_codes" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
ALTER TABLE "invitation_codes" FORCE ROW LEVEL SECURITY;-- > statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "invitation_codes" TO authenticated;-- > statement-breakpoint
DROP POLICY IF EXISTS "invitation_codes_tenant_isolation" ON "invitation_codes";-- > statement-breakpoint
CREATE POLICY "invitation_codes_tenant_isolation" ON "invitation_codes" AS PERMISSIVE FOR ALL TO "authenticated"
  USING ("invitation_codes"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("invitation_codes"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
DROP POLICY IF EXISTS "invitation_codes_platform_inspect_read" ON "invitation_codes";-- > statement-breakpoint
CREATE POLICY "invitation_codes_platform_inspect_read" ON "invitation_codes" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);-- > statement-breakpoint

CREATE TABLE IF NOT EXISTS "member_permissions" (
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "omrade" text NOT NULL,
  "niva" text NOT NULL,
  "gitt_av" text NOT NULL,
  "gitt_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("tenant_id", "user_id", "omrade"),
  CONSTRAINT "member_permissions_omrade" CHECK (
    "omrade" in (
      'bookinger','kunder','kjoretoy','innboks','timeplan','tjenester',
      'lager','nettbutikk','ansatte','innstillinger','okonomi'
    )
  ),
  CONSTRAINT "member_permissions_niva" CHECK ("niva" in ('se','endre'))
);-- > statement-breakpoint
ALTER TABLE "member_permissions" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
ALTER TABLE "member_permissions" FORCE ROW LEVEL SECURITY;-- > statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "member_permissions" TO authenticated;-- > statement-breakpoint
DROP POLICY IF EXISTS "member_permissions_tenant_isolation" ON "member_permissions";-- > statement-breakpoint
CREATE POLICY "member_permissions_tenant_isolation" ON "member_permissions" AS PERMISSIVE FOR ALL TO "authenticated"
  USING ("member_permissions"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("member_permissions"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
DROP POLICY IF EXISTS "member_permissions_platform_inspect_read" ON "member_permissions";-- > statement-breakpoint
CREATE POLICY "member_permissions_platform_inspect_read" ON "member_permissions" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);
