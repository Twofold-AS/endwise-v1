/*
 * 0028 — F3-09 / P3: flere tjenester på én jobb.
 * 0027 er helpdesk-kategori (#49). Denne fila er booking_services.
 * `bookings.service_version_id` står (første/primære tjeneste).
 * `booking_services` er linjene. Eksisterende jobber backfilles 1:1.
 * Slot-lengde er fortsatt starts_at/ends_at — manuell varighet rører ikke
 * katalogprisen. Ingen butikkkatalog. Ingen billing-endring.
 * RLS + inspect som bookings. grants.sql force-er nye tabeller automatisk.
 * On DELETE cascade mot bookings — slett_forhandler trenger ikke ny rev.
 */
CREATE TABLE IF NOT EXISTS "booking_services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "booking_id" uuid NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "service_version_id" uuid NOT NULL REFERENCES "service_versions"("id") ON DELETE RESTRICT,
  "duration_minutes" integer NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);-- > statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "booking_services_booking_version_uidx"
  ON "booking_services" USING btree ("booking_id","service_version_id");-- > statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_services_booking_idx"
  ON "booking_services" USING btree ("booking_id","sort_order");-- > statement-breakpoint
ALTER TABLE "booking_services" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
DROP POLICY IF EXISTS "booking_services_tenant_isolation" ON "booking_services";-- > statement-breakpoint
CREATE POLICY "booking_services_tenant_isolation" ON "booking_services" AS PERMISSIVE FOR ALL TO "authenticated"
  USING ("booking_services"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("booking_services"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
DROP POLICY IF EXISTS "booking_services_platform_inspect_read" ON "booking_services";-- > statement-breakpoint
CREATE POLICY "booking_services_platform_inspect_read" ON "booking_services" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);-- > statement-breakpoint

INSERT INTO "booking_services" ("tenant_id", "booking_id", "service_version_id", "duration_minutes", "sort_order")
SELECT
  b."tenant_id",
  b."id",
  b."service_version_id",
  COALESCE(sv."duration_minutes", GREATEST(1, ROUND(EXTRACT(EPOCH FROM (b."ends_at" - b."starts_at")) / 60)::integer)),
  0
FROM "bookings" b
LEFT JOIN "service_versions" sv ON sv."id" = b."service_version_id"
WHERE NOT EXISTS (
  SELECT 1 FROM "booking_services" bs WHERE bs."booking_id" = b."id"
);
