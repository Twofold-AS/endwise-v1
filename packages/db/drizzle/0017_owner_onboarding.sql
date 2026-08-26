/*
 * Eier-veiviser etter passord + 2FA.
 * tenants.onboarding_completed_at: null = eier må gjennom veiviseren.
 * Eksisterende tenants settes til created_at så de ikke tvinges inn.
 * tenant_modules.source skiller admin-pakke (included) fra valgfrie
 * tillegg eieren kan slå på (optional → dealer). Stripe-rader merkes
 * ikke her; default included treffer gamle rader.
 */
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp with time zone;-- > statement-breakpoint

UPDATE "tenants"
   SET "onboarding_completed_at" = "created_at"
 WHERE "onboarding_completed_at" IS NULL;-- > statement-breakpoint

ALTER TABLE "tenant_modules" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'included' NOT NULL;-- > statement-breakpoint

ALTER TABLE "tenant_modules" DROP CONSTRAINT IF EXISTS "tenant_modules_source_kjent";-- > statement-breakpoint

ALTER TABLE "tenant_modules" ADD CONSTRAINT "tenant_modules_source_kjent" CHECK (
  "source" IN ('included', 'optional', 'dealer', 'stripe')
);
