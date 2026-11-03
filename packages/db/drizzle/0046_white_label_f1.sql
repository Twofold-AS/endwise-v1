/*
 * 0046 — White label F1: subdomene-regler.
 * tenant_slug_history, slug_reservations, lower(slug)-unikhet,
 * slug_ledig() og reserver_slug() (SECURITY DEFINER).
 * Ingen atferd på eksisterende tenants.create (2–48 tegn) før flagget er på.
 */
CREATE TABLE IF NOT EXISTS "tenant_slug_history" (
  "slug" text PRIMARY KEY NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "tatt_i_bruk" timestamp with time zone DEFAULT now() NOT NULL,
  "frigitt_at" timestamp with time zone,
  "omdirigerer_til_slug" text
);-- > statement-breakpoint
ALTER TABLE "tenant_slug_history" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
ALTER TABLE "tenant_slug_history" FORCE ROW LEVEL SECURITY;-- > statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "tenant_slug_history" TO authenticated;-- > statement-breakpoint
DROP POLICY IF EXISTS "tenant_slug_history_tenant_isolation" ON "tenant_slug_history";-- > statement-breakpoint
CREATE POLICY "tenant_slug_history_tenant_isolation" ON "tenant_slug_history" AS PERMISSIVE FOR ALL TO "authenticated"
  USING ("tenant_slug_history"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_slug_history"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
DROP POLICY IF EXISTS "tenant_slug_history_platform_inspect_read" ON "tenant_slug_history";-- > statement-breakpoint
CREATE POLICY "tenant_slug_history_platform_inspect_read" ON "tenant_slug_history" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);-- > statement-breakpoint

CREATE TABLE IF NOT EXISTS "slug_reservations" (
  "slug" text PRIMARY KEY NOT NULL,
  "holder" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "slug_reservations_slug_lower" CHECK ("slug" = lower("slug"))
);-- > statement-breakpoint
ALTER TABLE "slug_reservations" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
ALTER TABLE "slug_reservations" FORCE ROW LEVEL SECURITY;-- > statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "slug_reservations" TO authenticated;-- > statement-breakpoint
DROP POLICY IF EXISTS "slug_reservations_ingen_direkte" ON "slug_reservations";-- > statement-breakpoint
CREATE POLICY "slug_reservations_ingen_direkte" ON "slug_reservations" AS PERMISSIVE FOR ALL TO "authenticated"
  USING (false)
  WITH CHECK (false);-- > statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_lower_uidx" ON "tenants" (lower("slug"));-- > statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_slug_lower_uidx" ON "organization" (lower("slug"));-- > statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_slug_history_slug_lower_uidx" ON "tenant_slug_history" (lower("slug"));-- > statement-breakpoint

DROP POLICY IF EXISTS "reserverte_slugs_slug_oppslag" ON "reserverte_slugs";-- > statement-breakpoint
CREATE POLICY "reserverte_slugs_slug_oppslag" ON "reserverte_slugs" AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    current_user IS DISTINCT FROM 'authenticated'
    AND current_user IS DISTINCT FROM 'endwise_app'
    AND lower(slug) = nullif(current_setting('app.slug_sjekk', true), '')
  );-- > statement-breakpoint
DROP POLICY IF EXISTS "tenants_slug_oppslag" ON "tenants";-- > statement-breakpoint
CREATE POLICY "tenants_slug_oppslag" ON "tenants" AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    current_user IS DISTINCT FROM 'authenticated'
    AND current_user IS DISTINCT FROM 'endwise_app'
    AND lower(slug) = nullif(current_setting('app.slug_sjekk', true), '')
  );-- > statement-breakpoint
DROP POLICY IF EXISTS "tenant_slug_history_slug_oppslag" ON "tenant_slug_history";-- > statement-breakpoint
CREATE POLICY "tenant_slug_history_slug_oppslag" ON "tenant_slug_history" AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    current_user IS DISTINCT FROM 'authenticated'
    AND current_user IS DISTINCT FROM 'endwise_app'
    AND lower(slug) = nullif(current_setting('app.slug_sjekk', true), '')
  );-- > statement-breakpoint
DROP POLICY IF EXISTS "slug_reservations_definer" ON "slug_reservations";-- > statement-breakpoint
CREATE POLICY "slug_reservations_definer" ON "slug_reservations" AS PERMISSIVE FOR ALL TO PUBLIC
  USING (
    current_user IS DISTINCT FROM 'authenticated'
    AND current_user IS DISTINCT FROM 'endwise_app'
    AND slug = nullif(current_setting('app.slug_sjekk', true), '')
  )
  WITH CHECK (
    current_user IS DISTINCT FROM 'authenticated'
    AND current_user IS DISTINCT FROM 'endwise_app'
    AND slug = nullif(current_setting('app.slug_sjekk', true), '')
  );-- > statement-breakpoint

DROP FUNCTION IF EXISTS slug_ledig(text, text);-- > statement-breakpoint
CREATE FUNCTION slug_ledig(p_slug text, p_holder text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text := lower(btrim(p_slug));
BEGIN
  -- slug_ledig_rev=0046
  IF v_slug IS NULL OR v_slug = '' THEN
    RETURN false;
  END IF;
  PERFORM set_config('app.slug_sjekk', v_slug, true);
  PERFORM set_config('app.slug_holder', coalesce(p_holder, ''), true);
  IF exists (select 1 from reserverte_slugs where lower(slug) = v_slug) THEN
    RETURN false;
  END IF;
  IF v_slug = 'endwise' OR v_slug like 'endwise-%' THEN
    RETURN false;
  END IF;
  IF exists (select 1 from tenants where lower(slug) = v_slug) THEN
    RETURN false;
  END IF;
  IF exists (select 1 from organization where lower(slug) = v_slug) THEN
    RETURN false;
  END IF;
  IF exists (
    select 1 from tenant_slug_history
     where lower(slug) = v_slug
       and (frigitt_at is null or frigitt_at > now() - interval '12 months')
  ) THEN
    RETURN false;
  END IF;
  IF exists (
    select 1 from slug_reservations
     where slug = v_slug
       and expires_at > now()
       and (p_holder is null or holder is distinct from p_holder)
  ) THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;-- > statement-breakpoint
REVOKE ALL ON FUNCTION slug_ledig(text, text) FROM PUBLIC;-- > statement-breakpoint
GRANT EXECUTE ON FUNCTION slug_ledig(text, text) TO authenticated;-- > statement-breakpoint

DROP FUNCTION IF EXISTS reserver_slug(text, text, integer);-- > statement-breakpoint
CREATE FUNCTION reserver_slug(p_slug text, p_holder text, p_minutter integer DEFAULT 30)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text := lower(btrim(p_slug));
  v_min integer := greatest(coalesce(p_minutter, 30), 1);
BEGIN
  -- reserver_slug_rev=0046
  IF v_slug IS NULL OR v_slug = '' OR p_holder IS NULL OR btrim(p_holder) = '' THEN
    RETURN false;
  END IF;
  PERFORM set_config('app.slug_sjekk', v_slug, true);
  PERFORM set_config('app.slug_holder', p_holder, true);
  DELETE FROM slug_reservations WHERE slug = v_slug AND expires_at <= now();
  IF NOT slug_ledig(v_slug, p_holder) THEN
    RETURN false;
  END IF;
  INSERT INTO slug_reservations (slug, holder, expires_at)
  VALUES (v_slug, p_holder, now() + (v_min || ' minutes')::interval)
  ON CONFLICT (slug) DO UPDATE
    SET holder = excluded.holder,
        expires_at = excluded.expires_at
    WHERE slug_reservations.holder = excluded.holder
       OR slug_reservations.expires_at <= now();
  RETURN exists (
    select 1 from slug_reservations
     where slug = v_slug and holder = p_holder and expires_at > now()
  );
END;
$$;-- > statement-breakpoint
REVOKE ALL ON FUNCTION reserver_slug(text, text, integer) FROM PUBLIC;-- > statement-breakpoint
GRANT EXECUTE ON FUNCTION reserver_slug(text, text, integer) TO authenticated;
