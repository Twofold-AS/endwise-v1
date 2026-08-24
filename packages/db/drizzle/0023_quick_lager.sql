/*
 * 0023 — F1-07 / F8-01: Quick-GUID på lager (parts + stock_locations).
 *
 * Idempotent: ADD COLUMN IF NOT EXISTS + CREATE UNIQUE INDEX IF NOT EXISTS.
 * Ingen nye tabeller — shop leser lager, ingen egen butikkkatalog.
 * Etter merge: `pnpm db:setup` (migrate + grants). RLS ligger allerede på
 * parts/stock_locations (0005); grants.sql FORCE-er nye tabeller automatisk.
 */
ALTER TABLE "parts" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'endwise' NOT NULL;--> statement-breakpoint
ALTER TABLE "parts" ADD COLUMN IF NOT EXISTS "quick_guid" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "parts_tenant_quick_guid_uidx" ON "parts" USING btree ("tenant_id","quick_guid");--> statement-breakpoint
ALTER TABLE "stock_locations" ADD COLUMN IF NOT EXISTS "quick_guid" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stock_locations_tenant_quick_guid_uidx" ON "stock_locations" USING btree ("tenant_id","quick_guid");
