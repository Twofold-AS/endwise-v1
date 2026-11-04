/*
 * 0050 — White label F6a: tillatelsesmodell.
 * Unik (bruker, org). Maks én dealer_admin per org (trigger).
 * tildel_tillatelse: FOR UPDATE, bare daglig leder / Endwise, ikke egne.
 * Rapport for eksisterende org med flere dealer_admin — ingen degradering.
 */
CREATE UNIQUE INDEX IF NOT EXISTS "member_user_org_uidx"
  ON "member" ("user_id", "organization_id");-- > statement-breakpoint

CREATE OR REPLACE FUNCTION sjekk_en_dealer_admin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- sjekk_en_dealer_admin_rev=0050
  IF NEW.role IS DISTINCT FROM 'dealer_admin' THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM member
    WHERE organization_id = NEW.organization_id
      AND role = 'dealer_admin'
      AND id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'en_dealer_admin';
  END IF;
  RETURN NEW;
END;
$$;-- > statement-breakpoint
DROP TRIGGER IF EXISTS member_en_dealer_admin ON member;-- > statement-breakpoint
CREATE TRIGGER member_en_dealer_admin
  BEFORE INSERT OR UPDATE OF role ON member
  FOR EACH ROW
  EXECUTE FUNCTION sjekk_en_dealer_admin();-- > statement-breakpoint

CREATE OR REPLACE FUNCTION tildel_tillatelse(
  p_tenant_id uuid,
  p_aktor text,
  p_mal text,
  p_omrade text,
  p_niva text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean := false;
BEGIN
  -- tildel_tillatelse_rev=0050
  IF p_aktor IS NULL OR p_mal IS NULL OR p_aktor = p_mal THEN
    RAISE EXCEPTION 'Ikke tillatt';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM member
     WHERE user_id = p_aktor
       AND role = 'endwise_admin'
  ) OR EXISTS (
    SELECT 1 FROM member
     WHERE user_id = p_aktor
       AND organization_id = p_tenant_id::text
       AND role = 'dealer_admin'
     FOR UPDATE
  ) INTO v_ok;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'Ikke tillatt';
  END IF;
  PERFORM 1 FROM member
    WHERE organization_id = p_tenant_id::text
      AND user_id = p_mal
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ikke tillatt';
  END IF;
  PERFORM set_config('app.tenant_id', p_tenant_id::text, true);
  IF p_niva IS NULL THEN
    DELETE FROM member_permissions
     WHERE tenant_id = p_tenant_id
       AND user_id = p_mal
       AND omrade = p_omrade;
    RETURN;
  END IF;
  INSERT INTO member_permissions (tenant_id, user_id, omrade, niva, gitt_av)
  VALUES (p_tenant_id, p_mal, p_omrade, p_niva, p_aktor)
  ON CONFLICT (tenant_id, user_id, omrade)
  DO UPDATE SET niva = excluded.niva, gitt_av = excluded.gitt_av, gitt_at = now();
END;
$$;-- > statement-breakpoint
REVOKE ALL ON FUNCTION tildel_tillatelse(uuid, text, text, text, text) FROM PUBLIC;-- > statement-breakpoint
GRANT EXECUTE ON FUNCTION tildel_tillatelse(uuid, text, text, text, text) TO PUBLIC;-- > statement-breakpoint

CREATE OR REPLACE FUNCTION rapport_flere_dealer_admin()
RETURNS TABLE (organization_id text, antall integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- rapport_flere_dealer_admin_rev=0050
  SELECT m.organization_id, count(*)::int
    FROM member m
   WHERE m.role = 'dealer_admin'
   GROUP BY m.organization_id
  HAVING count(*) > 1;
$$;-- > statement-breakpoint
REVOKE ALL ON FUNCTION rapport_flere_dealer_admin() FROM PUBLIC;-- > statement-breakpoint
GRANT EXECUTE ON FUNCTION rapport_flere_dealer_admin() TO PUBLIC;
