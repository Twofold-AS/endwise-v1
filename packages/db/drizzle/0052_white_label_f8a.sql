/*
 * 0052 — White label F8a: send-vindu på invitation_codes (3 per time).
 */
ALTER TABLE "invitation_codes" ADD COLUMN IF NOT EXISTS "send_count" integer NOT NULL DEFAULT 0;-- > statement-breakpoint
ALTER TABLE "invitation_codes" ADD COLUMN IF NOT EXISTS "window_started_at" timestamp with time zone;
