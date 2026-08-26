/*
 * Mons P0 etter no-go på a840318.
 * Tettere 0019: messages/participants bundet til thread.tenant_id.
 * Inspect-guc app.platform_inspect (UUID) — SELECT-only, ikke customers.
 * 0020-reparasjon: DROP lookup_open_invitation før CREATE (RETURNS).
 * db:migrate DROPper funksjonen før drizzle-kit, så 0020 ikke dør
 * på CREATE OR replace (Scaleway: 0020 sannsynligvis ikke i journal).
 * check platform_level role.
 * invitations_open_by_hash er SELECT + UPDATE, ikke for all.
 * Trigger mot demote/slett av første endwise_admin på org slug=endwise.
 * Idempotent: DROP IF exists / IF NOT exists. 0019 og 0020 røres ikke.
 */
DROP POLICY IF EXISTS threads_platform_admin_support_read ON "threads";-- > statement-breakpoint
DROP POLICY IF EXISTS thread_participants_platform_admin_support_read ON "thread_participants";-- > statement-breakpoint
DROP POLICY IF EXISTS messages_platform_admin_support_read ON "messages";-- > statement-breakpoint
CREATE POLICY "threads_platform_admin_support_read" ON "threads" AS PERMISSIVE FOR SELECT TO "authenticated" USING (current_setting('app.platform_admin', true) = 'on' AND "kind" = 'dealer_admin');-- > statement-breakpoint
CREATE POLICY "thread_participants_platform_admin_support_read" ON "thread_participants" AS PERMISSIVE FOR SELECT TO "authenticated" USING (current_setting('app.platform_admin', true) = 'on' AND EXISTS (
  SELECT 1 FROM threads th WHERE th.id = "thread_id" AND th.kind = 'dealer_admin' AND th.tenant_id = thread_participants.tenant_id
));-- > statement-breakpoint
CREATE POLICY "messages_platform_admin_support_read" ON "messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (current_setting('app.platform_admin', true) = 'on' AND EXISTS (
  SELECT 1 FROM threads th WHERE th.id = "thread_id" AND th.kind = 'dealer_admin' AND th.tenant_id = messages.tenant_id
));-- > statement-breakpoint

DROP POLICY IF EXISTS "bookings_platform_inspect_read" ON "bookings";-- > statement-breakpoint
DROP POLICY IF EXISTS "mechanics_platform_inspect_read" ON "mechanics";-- > statement-breakpoint
DROP POLICY IF EXISTS "services_platform_inspect_read" ON "services";-- > statement-breakpoint
DROP POLICY IF EXISTS "service_versions_platform_inspect_read" ON "service_versions";-- > statement-breakpoint
DROP POLICY IF EXISTS "vehicles_platform_inspect_read" ON "vehicles";-- > statement-breakpoint
DROP POLICY IF EXISTS "threads_platform_inspect_read" ON "threads";-- > statement-breakpoint
DROP POLICY IF EXISTS "messages_platform_inspect_read" ON "messages";-- > statement-breakpoint
DROP POLICY IF EXISTS "thread_participants_platform_inspect_read" ON "thread_participants";-- > statement-breakpoint
CREATE POLICY "bookings_platform_inspect_read" ON "bookings" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "mechanics_platform_inspect_read" ON "mechanics" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "services_platform_inspect_read" ON "services" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "service_versions_platform_inspect_read" ON "service_versions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "vehicles_platform_inspect_read" ON "vehicles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "threads_platform_inspect_read" ON "threads" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid AND "kind" = 'dealer_admin');-- > statement-breakpoint
CREATE POLICY "messages_platform_inspect_read" ON "messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid AND EXISTS (
  SELECT 1 FROM threads th WHERE th.id = "thread_id" AND th.kind = 'dealer_admin' AND th.tenant_id = messages.tenant_id
));-- > statement-breakpoint
CREATE POLICY "thread_participants_platform_inspect_read" ON "thread_participants" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid AND EXISTS (
  SELECT 1 FROM threads th WHERE th.id = "thread_id" AND th.kind = 'dealer_admin' AND th.tenant_id = thread_participants.tenant_id
));-- > statement-breakpoint

ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "platform_level" text;-- > statement-breakpoint
DROP FUNCTION IF EXISTS lookup_open_invitation(text);-- > statement-breakpoint
CREATE FUNCTION lookup_open_invitation(p_token_hash text)
RETURNS TABLE (
  id             uuid,
  tenant_id      uuid,
  email          text,
  job_function   text,
  role           text,
  kind           text,
  platform_level text,
  expires_at     timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.invitation_hash', p_token_hash, true);
  RETURN QUERY
    SELECT i.id, i.tenant_id, i.email, i.job_function::text, i.role, i.kind, i.platform_level, i.expires_at
      FROM invitations i
     WHERE i.token_hash = p_token_hash
       AND i.accepted_at IS NULL
       AND i.revoked_at  IS NULL
       AND i.expires_at  > now()
     LIMIT 1;
END;
$$;-- > statement-breakpoint
REVOKE ALL ON FUNCTION lookup_open_invitation(text) FROM PUBLIC;-- > statement-breakpoint
GRANT EXECUTE ON FUNCTION lookup_open_invitation(text) TO authenticated;-- > statement-breakpoint

ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_platform_level_role";-- > statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_platform_level_role" CHECK (("kind" <> 'platform') OR (("role" = 'endwise_admin' AND "platform_level" = 'administrator') OR ("role" = 'endwise_support' AND "platform_level" = 'support')));-- > statement-breakpoint

DROP POLICY IF EXISTS invitations_open_by_hash ON invitations;-- > statement-breakpoint
DROP POLICY IF EXISTS invitations_open_by_hash_update ON invitations;-- > statement-breakpoint
CREATE POLICY invitations_open_by_hash ON invitations
  AS PERMISSIVE
  FOR SELECT
  TO PUBLIC
  USING (token_hash = nullif(current_setting('app.invitation_hash', true), ''));-- > statement-breakpoint
CREATE POLICY invitations_open_by_hash_update ON invitations
  AS PERMISSIVE
  FOR UPDATE
  TO PUBLIC
  USING (token_hash = nullif(current_setting('app.invitation_hash', true), ''))
  WITH CHECK (token_hash = nullif(current_setting('app.invitation_hash', true), ''));-- > statement-breakpoint

CREATE OR REPLACE FUNCTION nekt_plattform_eier_endring()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_id text;
  v_eier_id text;
BEGIN
  v_org_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.organization_id ELSE COALESCE(NEW.organization_id, OLD.organization_id) END;

  SELECT m.id INTO v_eier_id
    FROM member m
    JOIN organization o ON o.id = m.organization_id
   WHERE o.slug = 'endwise'
     AND m.role = 'endwise_admin'
     AND m.organization_id = v_org_id
   ORDER BY m.created_at ASC
   LIMIT 1;

  IF v_eier_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.id = v_eier_id THEN
    RAISE EXCEPTION 'Kan ikke fjerne plattform-eieren';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.id = v_eier_id AND NEW.role IS DISTINCT FROM 'endwise_admin' THEN
    RAISE EXCEPTION 'Kan ikke degradere plattform-eieren';
  END IF;

  RETURN NEW;
END;
$$;-- > statement-breakpoint
DROP TRIGGER IF EXISTS eier_las_member ON member;-- > statement-breakpoint
CREATE TRIGGER eier_las_member
  BEFORE UPDATE OR DELETE ON member
  FOR EACH ROW
  EXECUTE FUNCTION nekt_plattform_eier_endring();
