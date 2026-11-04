/*
 * 0055 — White label F11b: tråd ↔ kunde og kunde-RLS på meldinger.
 */
ALTER TABLE "threads" ADD COLUMN IF NOT EXISTS "customer_id" uuid;-- > statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "threads" ADD CONSTRAINT "threads_customer_id_customers_id_fk"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;-- > statement-breakpoint
CREATE INDEX IF NOT EXISTS "threads_tenant_customer_idx" ON "threads" ("tenant_id", "customer_id");-- > statement-breakpoint

UPDATE "threads" AS t
SET "customer_id" = c.id
FROM "customers" AS c
WHERE t.customer_id IS NULL
  AND t.kind = 'customer_dealer'
  AND t.tenant_id = c.tenant_id
  AND t.external_ref IS NOT NULL
  AND (t.external_ref = c.email OR t.external_ref = c.phone);-- > statement-breakpoint

DROP POLICY IF EXISTS "threads_customer_own" ON "threads";-- > statement-breakpoint
CREATE POLICY "threads_customer_own" ON "threads" AS RESTRICTIVE FOR ALL TO "authenticated"
  USING (
    nullif(current_setting('app.actor', true), '') IS DISTINCT FROM 'customer'
    OR "threads"."customer_id" = nullif(current_setting('app.customer_id', true), '')::uuid
  )
  WITH CHECK (
    nullif(current_setting('app.actor', true), '') IS DISTINCT FROM 'customer'
    OR "threads"."customer_id" = nullif(current_setting('app.customer_id', true), '')::uuid
  );-- > statement-breakpoint

DROP POLICY IF EXISTS "messages_customer_own" ON "messages";-- > statement-breakpoint
CREATE POLICY "messages_customer_own" ON "messages" AS RESTRICTIVE FOR ALL TO "authenticated"
  USING (
    nullif(current_setting('app.actor', true), '') IS DISTINCT FROM 'customer'
    OR EXISTS (
      SELECT 1 FROM threads th
      WHERE th.id = "messages"."thread_id"
        AND th.customer_id = nullif(current_setting('app.customer_id', true), '')::uuid
    )
  )
  WITH CHECK (
    nullif(current_setting('app.actor', true), '') IS DISTINCT FROM 'customer'
    OR EXISTS (
      SELECT 1 FROM threads th
      WHERE th.id = "messages"."thread_id"
        AND th.customer_id = nullif(current_setting('app.customer_id', true), '')::uuid
    )
  );-- > statement-breakpoint

DROP POLICY IF EXISTS "thread_participants_customer_own" ON "thread_participants";-- > statement-breakpoint
CREATE POLICY "thread_participants_customer_own" ON "thread_participants" AS RESTRICTIVE FOR ALL TO "authenticated"
  USING (
    nullif(current_setting('app.actor', true), '') IS DISTINCT FROM 'customer'
    OR EXISTS (
      SELECT 1 FROM threads th
      WHERE th.id = "thread_participants"."thread_id"
        AND th.customer_id = nullif(current_setting('app.customer_id', true), '')::uuid
    )
  )
  WITH CHECK (
    nullif(current_setting('app.actor', true), '') IS DISTINCT FROM 'customer'
    OR EXISTS (
      SELECT 1 FROM threads th
      WHERE th.id = "thread_participants"."thread_id"
        AND th.customer_id = nullif(current_setting('app.customer_id', true), '')::uuid
    )
  );
