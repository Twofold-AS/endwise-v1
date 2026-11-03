/*
 * 0047 — White label F2: lookup_tenant_by_host.
 * Bare offentlige felt. Ingen tenant-id, ingen utkast. SECURITY DEFINER.
 */
DROP POLICY IF EXISTS "tenants_host_oppslag" ON "tenants";-- > statement-breakpoint
CREATE POLICY "tenants_host_oppslag" ON "tenants" AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    current_user IS DISTINCT FROM 'authenticated'
    AND current_user IS DISTINCT FROM 'endwise_app'
    AND lower(slug) = nullif(current_setting('app.slug_sjekk', true), '')
  );-- > statement-breakpoint
DROP POLICY IF EXISTS "tenant_branding_host_oppslag" ON "tenant_branding";-- > statement-breakpoint
CREATE POLICY "tenant_branding_host_oppslag" ON "tenant_branding" AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    current_user IS DISTINCT FROM 'authenticated'
    AND current_user IS DISTINCT FROM 'endwise_app'
    AND tenant_id IN (
      SELECT id FROM tenants WHERE lower(slug) = nullif(current_setting('app.slug_sjekk', true), '')
    )
  );-- > statement-breakpoint
DROP POLICY IF EXISTS "dealer_profiles_host_oppslag" ON "dealer_profiles";-- > statement-breakpoint
CREATE POLICY "dealer_profiles_host_oppslag" ON "dealer_profiles" AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    current_user IS DISTINCT FROM 'authenticated'
    AND current_user IS DISTINCT FROM 'endwise_app'
    AND tenant_id IN (
      SELECT id FROM tenants WHERE lower(slug) = nullif(current_setting('app.slug_sjekk', true), '')
    )
  );-- > statement-breakpoint
DROP POLICY IF EXISTS "tenant_domains_host_oppslag" ON "tenant_domains";-- > statement-breakpoint
CREATE POLICY "tenant_domains_host_oppslag" ON "tenant_domains" AS PERMISSIVE FOR SELECT TO PUBLIC
  USING (
    current_user IS DISTINCT FROM 'authenticated'
    AND current_user IS DISTINCT FROM 'endwise_app'
    AND vert = nullif(current_setting('app.host_oppslag', true), '')
  );-- > statement-breakpoint

DROP FUNCTION IF EXISTS lookup_tenant_by_host(text, text);-- > statement-breakpoint
CREATE FUNCTION lookup_tenant_by_host(p_host text, p_slug text DEFAULT NULL)
RETURNS TABLE (
  slug text,
  visningsnavn text,
  logo_url text,
  aksentfarge text,
  aksent_tekstfarge text,
  telefon text,
  epost text,
  sted text,
  vis_levert_av boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host text := lower(btrim(coalesce(p_host, '')));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
BEGIN
  -- lookup_tenant_by_host_rev=0047
  -- Eget CNAME (tenant_domains) fylles i F3. F2 slår opp på slug fra Host.
  IF v_host <> '' THEN
    PERFORM set_config('app.host_oppslag', v_host, true);
  END IF;

  IF v_slug = '' AND v_host LIKE '%.endwise.no' THEN
    v_slug := split_part(v_host, '.', 1);
  END IF;
  IF v_slug = '' AND v_host LIKE '%.localhost' THEN
    v_slug := split_part(v_host, '.', 1);
  END IF;
  IF v_slug IN ('www', 'platform', 'endwise', '') THEN
    v_slug := '';
  END IF;

  IF v_slug = '' THEN
    RETURN;
  END IF;

  PERFORM set_config('app.slug_sjekk', v_slug, true);

  RETURN QUERY
    SELECT
      t.slug,
      coalesce(nullif(b.visningsnavn, ''), t.name) AS visningsnavn,
      b.logo_url,
      b.aksentfarge,
      b.aksent_tekstfarge,
      p.phone,
      p.email,
      p.city,
      coalesce(b.vis_levert_av, true)
    FROM tenants t
    LEFT JOIN tenant_branding b ON b.tenant_id = t.id
    LEFT JOIN dealer_profiles p ON p.tenant_id = t.id
    WHERE lower(t.slug) = v_slug
      AND t.kind IS DISTINCT FROM 'platform'
    LIMIT 1;
END;
$$;-- > statement-breakpoint
REVOKE ALL ON FUNCTION lookup_tenant_by_host(text, text) FROM PUBLIC;-- > statement-breakpoint
GRANT EXECUTE ON FUNCTION lookup_tenant_by_host(text, text) TO PUBLIC;
