/*
 * 0051 — White label F7: Privat/Bedrift på sesjonen.
 * kontekst + Bedrift-vindu. Unik (tenant, user) på customers når koblet.
 */
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "kontekst" text;-- > statement-breakpoint
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "bedrift_verifisert_at" timestamp;-- > statement-breakpoint
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "bedrift_utloper_at" timestamp;-- > statement-breakpoint

ALTER TABLE "session" DROP CONSTRAINT IF EXISTS session_kontekst_chk;-- > statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT session_kontekst_chk
  CHECK ("kontekst" IS NULL OR "kontekst" IN ('privat', 'bedrift'));-- > statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "customers_tenant_user_uidx"
  ON "customers" ("tenant_id", "user_id")
  WHERE "user_id" IS NOT NULL;
