/*
 * 0064 — passnøkkel-skjema + leftover TOTP vekk.
 *
 * Prod etter #216: Better Auth INSERT/SELECT mot "passkey" kan 42703
 * hvis tabellen aldri ble opprettet (0000 ble ikke kjørt som nå).
 * session.kontekst sikres på nytt (samme 42703 som 0063).
 *
 * rpID per sone er plugin-config (app / platform / <slug>), ikke kolonne.
 * Better Auth 1.7.15 lagrer ikke rpID på raden.
 *
 * TOTP-rader og two_factor_enabled blokkerer gamle brukere etter at
 * flyten er passnøkkel. Tøm begge. Trigger 0010 fyrer bare ved påslag.
 */
CREATE TABLE IF NOT EXISTS "passkey" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "public_key" text NOT NULL,
  "user_id" text NOT NULL,
  "credential_id" text NOT NULL,
  "counter" integer NOT NULL,
  "device_type" text NOT NULL,
  "backed_up" boolean NOT NULL,
  "transports" text,
  "created_at" timestamp,
  "aaguid" text
);-- > statement-breakpoint
ALTER TABLE "passkey" ADD COLUMN IF NOT EXISTS "name" text;-- > statement-breakpoint
ALTER TABLE "passkey" ADD COLUMN IF NOT EXISTS "public_key" text;-- > statement-breakpoint
ALTER TABLE "passkey" ADD COLUMN IF NOT EXISTS "user_id" text;-- > statement-breakpoint
ALTER TABLE "passkey" ADD COLUMN IF NOT EXISTS "credential_id" text;-- > statement-breakpoint
ALTER TABLE "passkey" ADD COLUMN IF NOT EXISTS "counter" integer;-- > statement-breakpoint
ALTER TABLE "passkey" ADD COLUMN IF NOT EXISTS "device_type" text;-- > statement-breakpoint
ALTER TABLE "passkey" ADD COLUMN IF NOT EXISTS "backed_up" boolean;-- > statement-breakpoint
ALTER TABLE "passkey" ADD COLUMN IF NOT EXISTS "transports" text;-- > statement-breakpoint
ALTER TABLE "passkey" ADD COLUMN IF NOT EXISTS "created_at" timestamp;-- > statement-breakpoint
ALTER TABLE "passkey" ADD COLUMN IF NOT EXISTS "aaguid" text;-- > statement-breakpoint
ALTER TABLE "passkey" DROP CONSTRAINT IF EXISTS "passkey_user_id_user_id_fk";-- > statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
CREATE INDEX IF NOT EXISTS "passkey_userId_idx" ON "passkey" USING btree ("user_id");-- > statement-breakpoint
CREATE INDEX IF NOT EXISTS "passkey_credentialID_idx" ON "passkey" USING btree ("credential_id");-- > statement-breakpoint

ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "kontekst" text;-- > statement-breakpoint
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "bedrift_verifisert_at" timestamp;-- > statement-breakpoint
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "bedrift_utloper_at" timestamp;-- > statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT IF EXISTS session_kontekst_chk;-- > statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT session_kontekst_chk
  CHECK ("kontekst" IS NULL OR "kontekst" IN ('privat', 'bedrift'));-- > statement-breakpoint

DELETE FROM "two_factor";-- > statement-breakpoint
UPDATE "user" SET two_factor_enabled = false
  WHERE two_factor_enabled IS DISTINCT FROM false;
