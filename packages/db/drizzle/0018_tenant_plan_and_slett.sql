/*
 * F5-26 P0 — valgt tiers-nøkkel på tenanten + engangskode for GDPR-slett.
 */
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "plan" text;-- > statement-breakpoint

CREATE TABLE IF NOT EXISTS "tenant_delete_challenges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "requested_by" text NOT NULL,
  "code_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
