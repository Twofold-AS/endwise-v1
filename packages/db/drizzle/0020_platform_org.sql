/*
 * Endwise som plattform-org (ikke et verksted) + plattform-team.
 * tenants.kind får 'platform'. slug=endwise merkes.
 * invitations: kind=platform, job_function NULL, platform_level.
 * lookup_open_invitation returnerer platform_level.
 * Produksjon: `pnpm db:setup` mot sesjonens DATABASE_URL (ikke Docker).
 */
ALTER TABLE "tenants" DROP CONSTRAINT IF EXISTS "tenants_kind_check";-- > statement-breakpoint
UPDATE "tenants" SET "kind" = 'platform', "plan" = NULL, "name" = 'Endwise' WHERE "slug" = 'endwise';-- > statement-breakpoint
DELETE FROM "tenant_modules" WHERE "tenant_id" IN (SELECT "id" FROM "tenants" WHERE "slug" = 'endwise' OR "kind" = 'platform');-- > statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_kind_check" CHECK ("kind" IN ('live', 'demo', 'platform'));-- > statement-breakpoint

ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "platform_level" text;-- > statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "job_function" DROP NOT NULL;-- > statement-breakpoint
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_role_by_kind";-- > statement-breakpoint
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_function_by_kind";-- > statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_by_kind" CHECK (("kind" = 'staff' AND "role" = 'dealer_staff') OR ("kind" = 'owner' AND "role" = 'dealer_admin') OR ("kind" = 'platform' AND "role" IN ('endwise_admin', 'endwise_support')));-- > statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_function_by_kind" CHECK (("kind" = 'staff' AND "job_function" IN ('selger', 'support', 'mekaniker')) OR ("kind" = 'owner' AND "job_function" = 'leder') OR ("kind" = 'platform' AND "job_function" IS NULL AND "platform_level" IN ('administrator', 'support')));-- > statement-breakpoint

CREATE OR REPLACE FUNCTION lookup_open_invitation(p_token_hash text)
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
GRANT EXECUTE ON FUNCTION lookup_open_invitation(text) TO authenticated;
