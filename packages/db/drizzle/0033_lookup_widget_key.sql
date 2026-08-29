/*
 * 0033 — lookup_widget_key for /widget/init under FORCE RLS.
 * Unscopet select mot widget_keys gir 0 rader (ingen app.tenant_id).
 * Samme klasse som lookup_open_invitation (0020/0021).
 */
DROP FUNCTION IF EXISTS lookup_widget_key(text);-- > statement-breakpoint
CREATE FUNCTION lookup_widget_key(p_publishable_key text)
RETURNS TABLE (
  tenant_id       uuid,
  allowed_origins text[],
  active          boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.widget_publishable_key', p_publishable_key, true);
  RETURN QUERY
    SELECT k.tenant_id, k.allowed_origins, k.active
      FROM widget_keys k
     WHERE k.publishable_key = p_publishable_key
       AND k.active = true
     LIMIT 1;
END;
$$;-- > statement-breakpoint
REVOKE ALL ON FUNCTION lookup_widget_key(text) FROM PUBLIC;-- > statement-breakpoint
GRANT EXECUTE ON FUNCTION lookup_widget_key(text) TO authenticated;-- > statement-breakpoint
DROP POLICY IF EXISTS widget_keys_lookup_by_pk ON widget_keys;-- > statement-breakpoint
CREATE POLICY widget_keys_lookup_by_pk ON widget_keys
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (
    publishable_key = nullif(current_setting('app.widget_publishable_key', true), '')
  );
