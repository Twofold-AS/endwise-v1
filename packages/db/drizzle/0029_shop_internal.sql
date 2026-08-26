/*
 * 0029 — F10-03 intern testbutikk (ikke Medusa).
 * `parts.sell_price_minor` — utsalgspris på lagerdelen. Ingen annen katalog.
 * `shop_orders` + `shop_order_lines` — Stripe test-kasse, tenant RLS.
 * `feature_flags.shop` — global default av. Slås på per intern forhandler
 * via flags.setTenantOverride. Ikke en selgbar modul.
 * grants.sql force-er nye RLS-tabeller automatisk.
 * shop_order_lines har on DELETE restrict mot parts — slett_forhandler
 * sletter shop-tabellene først (functions.sql), deretter lager.
 */
ALTER TABLE "parts" ADD COLUMN IF NOT EXISTS "sell_price_minor" integer;-- > statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "shop_order_status" AS ENUM ('pending', 'paid', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;-- > statement-breakpoint

CREATE TABLE IF NOT EXISTS "shop_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "status" "shop_order_status" DEFAULT 'pending' NOT NULL,
  "stripe_checkout_session_id" text,
  "stripe_payment_intent_id" text,
  "currency" text DEFAULT 'nok' NOT NULL,
  "total_minor" integer NOT NULL,
  "created_by_user_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "paid_at" timestamp with time zone
);-- > statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "shop_orders_stripe_session_uq"
  ON "shop_orders" USING btree ("stripe_checkout_session_id");-- > statement-breakpoint
CREATE INDEX IF NOT EXISTS "shop_orders_tenant_created_idx"
  ON "shop_orders" USING btree ("tenant_id","created_at");-- > statement-breakpoint
ALTER TABLE "shop_orders" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
DROP POLICY IF EXISTS "shop_orders_tenant_isolation" ON "shop_orders";-- > statement-breakpoint
CREATE POLICY "shop_orders_tenant_isolation" ON "shop_orders" AS PERMISSIVE FOR ALL TO "authenticated"
  USING ("shop_orders"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("shop_orders"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
DROP POLICY IF EXISTS "shop_orders_platform_inspect_read" ON "shop_orders";-- > statement-breakpoint
CREATE POLICY "shop_orders_platform_inspect_read" ON "shop_orders" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);-- > statement-breakpoint

CREATE TABLE IF NOT EXISTS "shop_order_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "order_id" uuid NOT NULL REFERENCES "shop_orders"("id") ON DELETE CASCADE,
  "part_id" uuid NOT NULL REFERENCES "parts"("id") ON DELETE RESTRICT,
  "sku" text NOT NULL,
  "name" text NOT NULL,
  "quantity" integer NOT NULL,
  "unit_price_minor" integer NOT NULL
);-- > statement-breakpoint
CREATE INDEX IF NOT EXISTS "shop_order_lines_order_idx"
  ON "shop_order_lines" USING btree ("order_id");-- > statement-breakpoint
CREATE INDEX IF NOT EXISTS "shop_order_lines_tenant_idx"
  ON "shop_order_lines" USING btree ("tenant_id");-- > statement-breakpoint
ALTER TABLE "shop_order_lines" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
DROP POLICY IF EXISTS "shop_order_lines_tenant_isolation" ON "shop_order_lines";-- > statement-breakpoint
CREATE POLICY "shop_order_lines_tenant_isolation" ON "shop_order_lines" AS PERMISSIVE FOR ALL TO "authenticated"
  USING ("shop_order_lines"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("shop_order_lines"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
DROP POLICY IF EXISTS "shop_order_lines_platform_inspect_read" ON "shop_order_lines";-- > statement-breakpoint
CREATE POLICY "shop_order_lines_platform_inspect_read" ON "shop_order_lines" AS PERMISSIVE FOR SELECT TO "authenticated"
  USING ("tenant_id" = nullif(current_setting('app.platform_inspect', true), '')::uuid);-- > statement-breakpoint

INSERT INTO "feature_flags" ("key", "description", "enabled")
VALUES (
  'shop',
  'Intern testbutikk (F10-03). Global default AV. Slås på per forhandler via tenant-overstyring. Ikke en selgbar modul.',
  false
)
ON CONFLICT ("key") DO UPDATE SET
  "description" = EXCLUDED."description";
