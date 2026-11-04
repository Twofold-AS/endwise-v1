/*
 * 0056 — White label F13: datadeling-modell. Ingen UI. F14-07 blokkerer UI.
 */
DO $$ BEGIN
  CREATE TYPE "shared_asset_art" AS ENUM ('kjoretoybilde', 'delebilde');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;-- > statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "shared_kontroll_status" AS ENUM ('venter', 'ren', 'avvist');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;-- > statement-breakpoint

CREATE TABLE IF NOT EXISTS "tenant_agreements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "kontraktsversjon" text NOT NULL,
  "signert_at" timestamp with time zone,
  "signert_av" text,
  "deling_samtykke" boolean NOT NULL DEFAULT false,
  "deling_omfang" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "trukket_tilbake_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);-- > statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenant_agreements_tenant_idx" ON "tenant_agreements" ("tenant_id");-- > statement-breakpoint
ALTER TABLE "tenant_agreements" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
DROP POLICY IF EXISTS "tenant_agreements_tenant_isolation" ON "tenant_agreements";-- > statement-breakpoint
CREATE POLICY "tenant_agreements_tenant_isolation" ON "tenant_agreements" AS PERMISSIVE FOR ALL TO "authenticated"
  USING ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint

CREATE TABLE IF NOT EXISTS "shared_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "art" "shared_asset_art" NOT NULL,
  "kjoretoy_modell_nokkel" text NOT NULL,
  "lagringsnokkel" text NOT NULL,
  "ai_tagger" jsonb,
  "ai_modell" text,
  "ai_kjoring_id" text,
  "personopplysninger_fjernet" boolean NOT NULL DEFAULT false,
  "kontroll_status" "shared_kontroll_status" NOT NULL DEFAULT 'venter',
  "samtykke_versjon" text NOT NULL,
  "opprettet_at" timestamp with time zone NOT NULL DEFAULT now(),
  "trukket_tilbake_at" timestamp with time zone
);-- > statement-breakpoint
CREATE INDEX IF NOT EXISTS "shared_assets_modell_idx" ON "shared_assets" ("kjoretoy_modell_nokkel");-- > statement-breakpoint
ALTER TABLE "shared_assets" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
DROP POLICY IF EXISTS "shared_assets_les" ON "shared_assets";-- > statement-breakpoint
CREATE POLICY "shared_assets_les" ON "shared_assets" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (
    "trukket_tilbake_at" IS NULL
    AND EXISTS (
      SELECT 1 FROM tenant_agreements a
      WHERE a.tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
        AND a.deling_samtykke = true
        AND a.trukket_tilbake_at IS NULL
        AND a.signert_at IS NOT NULL
    )
  );-- > statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "shared_assets" FROM "authenticated";-- > statement-breakpoint

CREATE TABLE IF NOT EXISTS "shared_asset_origin" (
  "asset_id" uuid PRIMARY KEY REFERENCES "shared_assets"("id") ON DELETE CASCADE,
  "origin_tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "origin_asset_id" text
);-- > statement-breakpoint
ALTER TABLE "shared_asset_origin" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
DROP POLICY IF EXISTS "shared_asset_origin_own" ON "shared_asset_origin";-- > statement-breakpoint
CREATE POLICY "shared_asset_origin_own" ON "shared_asset_origin" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING (
    "origin_tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid
    OR current_setting('app.platform_admin', true) = 'on'
  );-- > statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "shared_asset_origin" FROM "authenticated";-- > statement-breakpoint

CREATE TABLE IF NOT EXISTS "shared_asset_usages" (
  "asset_id" uuid NOT NULL REFERENCES "shared_assets"("id") ON DELETE CASCADE,
  "brukt_av_tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "brukt_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("asset_id", "brukt_av_tenant_id")
);-- > statement-breakpoint
ALTER TABLE "shared_asset_usages" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
DROP POLICY IF EXISTS "shared_asset_usages_tenant_isolation" ON "shared_asset_usages";-- > statement-breakpoint
CREATE POLICY "shared_asset_usages_tenant_isolation" ON "shared_asset_usages" AS PERMISSIVE FOR ALL TO "authenticated"
  USING ("brukt_av_tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("brukt_av_tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint

DROP FUNCTION IF EXISTS publiser_delt_asset(text, text, text, text, text);-- > statement-breakpoint
CREATE FUNCTION publiser_delt_asset(
  p_art text,
  p_modell_nokkel text,
  p_lagringsnokkel text,
  p_samtykke_versjon text,
  p_omfang text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_id uuid;
BEGIN
  -- publiser_delt_asset_rev=0056
  v_tenant := nullif(current_setting('app.tenant_id', true), '')::uuid;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'ingen tenant';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM tenant_agreements a
    WHERE a.tenant_id = v_tenant
      AND a.deling_samtykke = true
      AND a.trukket_tilbake_at IS NULL
      AND a.signert_at IS NOT NULL
      AND a.kontraktsversjon = p_samtykke_versjon
      AND a.deling_omfang ? p_omfang
  ) THEN
    RAISE EXCEPTION 'ikke samtykke';
  END IF;
  IF p_modell_nokkel ~* '(regnr|vin|kunde)' THEN
    RAISE EXCEPTION 'forbudt nokkel';
  END IF;
  INSERT INTO shared_assets (art, kjoretoy_modell_nokkel, lagringsnokkel, samtykke_versjon, personopplysninger_fjernet)
  VALUES (p_art::shared_asset_art, p_modell_nokkel, p_lagringsnokkel, p_samtykke_versjon, true)
  RETURNING id INTO v_id;
  INSERT INTO shared_asset_origin (asset_id, origin_tenant_id)
  VALUES (v_id, v_tenant);
  RETURN v_id;
END;
$$;-- > statement-breakpoint
REVOKE ALL ON FUNCTION publiser_delt_asset(text, text, text, text, text) FROM PUBLIC;-- > statement-breakpoint
GRANT EXECUTE ON FUNCTION publiser_delt_asset(text, text, text, text, text) TO authenticated;-- > statement-breakpoint

DROP FUNCTION IF EXISTS slett_trukket_shared_assets();-- > statement-breakpoint
CREATE FUNCTION slett_trukket_shared_assets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE shared_assets s
  SET trukket_tilbake_at = coalesce(s.trukket_tilbake_at, now())
  FROM shared_asset_origin o
  JOIN tenant_agreements a ON a.tenant_id = o.origin_tenant_id
  WHERE o.asset_id = s.id
    AND a.trukket_tilbake_at IS NOT NULL
    AND s.trukket_tilbake_at IS NULL;
  DELETE FROM shared_assets
  WHERE trukket_tilbake_at IS NOT NULL
    AND trukket_tilbake_at < now() - interval '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;-- > statement-breakpoint
REVOKE ALL ON FUNCTION slett_trukket_shared_assets() FROM PUBLIC;-- > statement-breakpoint
GRANT EXECUTE ON FUNCTION slett_trukket_shared_assets() TO authenticated;
