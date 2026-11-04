/*
 * 0053 — White label F8c: overføring av daglig leder.
 */
ALTER TABLE "member_profiles" ADD COLUMN IF NOT EXISTS "stedfortreder" boolean NOT NULL DEFAULT false;-- > statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "member_profiles_stedfortreder_uidx"
  ON "member_profiles" ("tenant_id") WHERE "stedfortreder" = true;-- > statement-breakpoint

CREATE TABLE IF NOT EXISTS "owner_transfers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "status" text NOT NULL,
  "fra_user_id" text NOT NULL,
  "til_user_id" text NOT NULL,
  "tillatelser" jsonb,
  "begrunnelse" text,
  "sokt_av" text NOT NULL,
  "godkjenner_1" text,
  "godkjenner_2" text,
  "varslet_at" timestamp with time zone,
  "utfor_etter" timestamp with time zone,
  "utfort_at" timestamp with time zone,
  "opprettet_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "owner_transfers_kind" CHECK ("kind" in ('frivillig','nod')),
  CONSTRAINT "owner_transfers_status" CHECK ("status" in ('venter','godkjent','utfort','avvist','trukket'))
);-- > statement-breakpoint
CREATE INDEX IF NOT EXISTS "owner_transfers_tenant_status_idx" ON "owner_transfers" ("tenant_id", "status");-- > statement-breakpoint
ALTER TABLE "owner_transfers" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
ALTER TABLE "owner_transfers" FORCE ROW LEVEL SECURITY;-- > statement-breakpoint
DROP POLICY IF EXISTS "owner_transfers_platform_inspect_read" ON "owner_transfers";-- > statement-breakpoint
CREATE POLICY "owner_transfers_platform_inspect_read" ON "owner_transfers" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ("owner_transfers"."tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);-- > statement-breakpoint
DROP POLICY IF EXISTS "owner_transfers_tenant_read" ON "owner_transfers";-- > statement-breakpoint
CREATE POLICY "owner_transfers_tenant_read" ON "owner_transfers" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ("owner_transfers"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
DROP POLICY IF EXISTS "owner_transfers_tenant_write" ON "owner_transfers";-- > statement-breakpoint
CREATE POLICY "owner_transfers_tenant_write" ON "owner_transfers" AS PERMISSIVE FOR ALL TO "authenticated"
  USING ("owner_transfers"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("owner_transfers"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
DROP POLICY IF EXISTS "owner_transfers_platform_admin" ON "owner_transfers";-- > statement-breakpoint
CREATE POLICY "owner_transfers_platform_admin" ON "owner_transfers" AS PERMISSIVE FOR ALL TO "authenticated"
  USING (current_setting('app.platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.platform_admin', true) = 'on');-- > statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "owner_transfers" TO authenticated;-- > statement-breakpoint

CREATE OR REPLACE FUNCTION overfor_daglig_leder(
  p_tenant_id uuid,
  p_fra text,
  p_til text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- overfor_daglig_leder_rev=0053
  IF p_fra IS NULL OR p_til IS NULL OR p_fra = p_til THEN
    RAISE EXCEPTION 'Ikke tillatt';
  END IF;
  PERFORM 1 FROM member
    WHERE organization_id = p_tenant_id::text
      AND user_id = p_fra
      AND role = 'dealer_admin'
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ikke tillatt';
  END IF;
  PERFORM 1 FROM member
    WHERE organization_id = p_tenant_id::text
      AND user_id = p_til
      AND role = 'dealer_staff'
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ikke tillatt';
  END IF;
  UPDATE member
     SET role = 'dealer_staff'
   WHERE organization_id = p_tenant_id::text AND user_id = p_fra;
  UPDATE member
     SET role = 'dealer_admin'
   WHERE organization_id = p_tenant_id::text AND user_id = p_til;
  DELETE FROM session WHERE user_id = p_fra;
  PERFORM set_config('app.tenant_id', p_tenant_id::text, true);
END;
$$;-- > statement-breakpoint
REVOKE ALL ON FUNCTION overfor_daglig_leder(uuid, text, text) FROM PUBLIC;-- > statement-breakpoint
GRANT EXECUTE ON FUNCTION overfor_daglig_leder(uuid, text, text) TO PUBLIC;
