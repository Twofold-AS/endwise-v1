/*
 * 0063 — /oppstart branding + kunde-innlogging.
 *
 * Prod app.endwise.no/oppstart: Drizzle
 *   insert into tenant_branding (…) on conflict (tenant_id)
 * feiler fordi FORCE RLS bare har TO authenticated. APP er eier
 * `endwise` (samme hull som 0043/0044). Idempotent eier-INSERT/
 * SELECT/UPDATE + unik tenant_id + manglende kolonner.
 *
 * session.kontekst (0051) sikres på nytt — prod 42703
 * «column "kontekst" of relation "session" does not exist».
 *
 * Opprydding: sesjoner og bruker-rader uten medlemskap og uten
 * kundekobling (auto-opprettet på fremmed e-post på <sub>).
 */
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "kontekst" text;-- > statement-breakpoint
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "bedrift_verifisert_at" timestamp;-- > statement-breakpoint
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "bedrift_utloper_at" timestamp;-- > statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT IF EXISTS session_kontekst_chk;-- > statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT session_kontekst_chk
  CHECK ("kontekst" IS NULL OR "kontekst" IN ('privat', 'bedrift'));-- > statement-breakpoint

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
  "oppdatert_at" timestamp with time zone DEFAULT now() NOT NULL
);-- > statement-breakpoint
ALTER TABLE "tenant_branding" ADD COLUMN IF NOT EXISTS "visningsnavn" text;-- > statement-breakpoint
ALTER TABLE "tenant_branding" ADD COLUMN IF NOT EXISTS "logo_url" text;-- > statement-breakpoint
ALTER TABLE "tenant_branding" ADD COLUMN IF NOT EXISTS "logo_mork_url" text;-- > statement-breakpoint
ALTER TABLE "tenant_branding" ADD COLUMN IF NOT EXISTS "favicon_url" text;-- > statement-breakpoint
ALTER TABLE "tenant_branding" ADD COLUMN IF NOT EXISTS "logo_mime" text;-- > statement-breakpoint
ALTER TABLE "tenant_branding" ADD COLUMN IF NOT EXISTS "aksentfarge" text;-- > statement-breakpoint
ALTER TABLE "tenant_branding" ADD COLUMN IF NOT EXISTS "aksent_tekstfarge" text;-- > statement-breakpoint
ALTER TABLE "tenant_branding" ADD COLUMN IF NOT EXISTS "avsendernavn" text;-- > statement-breakpoint
ALTER TABLE "tenant_branding" ADD COLUMN IF NOT EXISTS "svar_til_epost" text;-- > statement-breakpoint
ALTER TABLE "tenant_branding" ADD COLUMN IF NOT EXISTS "vis_levert_av" boolean DEFAULT true NOT NULL;-- > statement-breakpoint
ALTER TABLE "tenant_branding" ADD COLUMN IF NOT EXISTS "utkast" jsonb DEFAULT '{}'::jsonb NOT NULL;-- > statement-breakpoint
ALTER TABLE "tenant_branding" ADD COLUMN IF NOT EXISTS "publisert_at" timestamp with time zone;-- > statement-breakpoint
ALTER TABLE "tenant_branding" ADD COLUMN IF NOT EXISTS "oppdatert_at" timestamp with time zone DEFAULT now() NOT NULL;-- > statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_branding_tenant_id_uidx" ON "tenant_branding" ("tenant_id");-- > statement-breakpoint
ALTER TABLE "tenant_branding" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
ALTER TABLE "tenant_branding" FORCE ROW LEVEL SECURITY;-- > statement-breakpoint

DROP POLICY IF EXISTS "tenant_branding_tenant_insert_owner" ON "tenant_branding";-- > statement-breakpoint
CREATE POLICY "tenant_branding_tenant_insert_owner" ON "tenant_branding"
  AS PERMISSIVE FOR INSERT TO PUBLIC
  WITH CHECK (
    current_user IS DISTINCT FROM 'authenticated'
    AND current_user IS DISTINCT FROM 'endwise_app'
    AND current_user = (
      SELECT pg_get_userbyid(c.relowner)
        FROM pg_class c
       WHERE c.oid = 'public.tenant_branding'::regclass
    )
    AND nullif(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
DROP POLICY IF EXISTS "tenant_branding_tenant_select_owner" ON "tenant_branding";-- > statement-breakpoint
CREATE POLICY "tenant_branding_tenant_select_owner" ON "tenant_branding"
  AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    current_user IS DISTINCT FROM 'authenticated'
    AND current_user IS DISTINCT FROM 'endwise_app'
    AND current_user = (
      SELECT pg_get_userbyid(c.relowner)
        FROM pg_class c
       WHERE c.oid = 'public.tenant_branding'::regclass
    )
    AND nullif(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint
DROP POLICY IF EXISTS "tenant_branding_tenant_update_owner" ON "tenant_branding";-- > statement-breakpoint
CREATE POLICY "tenant_branding_tenant_update_owner" ON "tenant_branding"
  AS PERMISSIVE FOR UPDATE TO PUBLIC
  USING (
    current_user IS DISTINCT FROM 'authenticated'
    AND current_user IS DISTINCT FROM 'endwise_app'
    AND current_user = (
      SELECT pg_get_userbyid(c.relowner)
        FROM pg_class c
       WHERE c.oid = 'public.tenant_branding'::regclass
    )
    AND nullif(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_user IS DISTINCT FROM 'authenticated'
    AND current_user IS DISTINCT FROM 'endwise_app'
    AND current_user = (
      SELECT pg_get_userbyid(c.relowner)
        FROM pg_class c
       WHERE c.oid = 'public.tenant_branding'::regclass
    )
    AND nullif(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );-- > statement-breakpoint

-- Kort NO FORCE: eier uten BYPASSRLS ser ellers 0 kundrader.
ALTER TABLE "customers" NO FORCE ROW LEVEL SECURITY;-- > statement-breakpoint
ALTER TABLE "invitations" NO FORCE ROW LEVEL SECURITY;-- > statement-breakpoint
DELETE FROM "session" s
 WHERE NOT EXISTS (SELECT 1 FROM "member" m WHERE m.user_id = s.user_id)
   AND NOT EXISTS (SELECT 1 FROM "customers" c WHERE c.user_id = s.user_id);-- > statement-breakpoint
DELETE FROM "account" a
 WHERE EXISTS (
   SELECT 1 FROM "user" u
    WHERE u.id = a.user_id
      AND u.created_at >= TIMESTAMPTZ '2026-11-01'
      AND NOT EXISTS (SELECT 1 FROM "member" m WHERE m.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM "customers" c WHERE c.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM "invitation" i WHERE i.inviter_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM "invitations" inv WHERE inv.invited_by = u.id)
      AND NOT EXISTS (SELECT 1 FROM "customers" c WHERE lower(c.email) = lower(u.email))
      AND NOT EXISTS (
        SELECT 1 FROM "invitations" inv
         WHERE lower(inv.email) = lower(u.email)
           AND inv.accepted_at IS NULL
           AND inv.revoked_at IS NULL
      )
 );-- > statement-breakpoint
DELETE FROM "two_factor" t
 WHERE EXISTS (
   SELECT 1 FROM "user" u
    WHERE u.id = t.user_id
      AND u.created_at >= TIMESTAMPTZ '2026-11-01'
      AND NOT EXISTS (SELECT 1 FROM "member" m WHERE m.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM "customers" c WHERE c.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM "customers" c WHERE lower(c.email) = lower(u.email))
      AND NOT EXISTS (
        SELECT 1 FROM "invitations" inv
         WHERE lower(inv.email) = lower(u.email)
           AND inv.accepted_at IS NULL
           AND inv.revoked_at IS NULL
      )
 );-- > statement-breakpoint
DELETE FROM "user" u
 WHERE u.created_at >= TIMESTAMPTZ '2026-11-01'
   AND NOT EXISTS (SELECT 1 FROM "member" m WHERE m.user_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM "customers" c WHERE c.user_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM "invitation" i WHERE i.inviter_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM "invitations" inv WHERE inv.invited_by = u.id)
   AND NOT EXISTS (SELECT 1 FROM "customers" c WHERE lower(c.email) = lower(u.email))
   AND NOT EXISTS (
     SELECT 1 FROM "invitations" inv
      WHERE lower(inv.email) = lower(u.email)
        AND inv.accepted_at IS NULL
        AND inv.revoked_at IS NULL
   );-- > statement-breakpoint
ALTER TABLE "customers" FORCE ROW LEVEL SECURITY;-- > statement-breakpoint
ALTER TABLE "invitations" FORCE ROW LEVEL SECURITY;-- > statement-breakpoint
