/*
 * 0048 — White label F3: lookup skjuler utkast. Ingen tenant-id.
 */
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
  vis_levert_av boolean,
  publisert boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host text := lower(btrim(coalesce(p_host, '')));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
BEGIN
  -- lookup_tenant_by_host_rev=0048
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
      CASE
        WHEN b.publisert_at IS NOT NULL THEN coalesce(nullif(b.visningsnavn, ''), t.name)
        ELSE t.name
      END AS visningsnavn,
      CASE WHEN b.publisert_at IS NOT NULL THEN b.logo_url END,
      CASE WHEN b.publisert_at IS NOT NULL THEN b.aksentfarge END,
      CASE WHEN b.publisert_at IS NOT NULL THEN b.aksent_tekstfarge END,
      p.phone,
      p.email,
      p.city,
      CASE
        WHEN b.publisert_at IS NOT NULL THEN coalesce(b.vis_levert_av, true)
        ELSE true
      END,
      (b.publisert_at IS NOT NULL) AS publisert
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
