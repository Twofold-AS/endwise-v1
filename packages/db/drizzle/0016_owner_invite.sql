/*
 * F5-26 / F1-10 — EIER-INVITASJON er et EGET spor.
 *
 * Staff-sjekken svekkes ikke: `kind = 'staff'` kan fortsatt bare være
 * `dealer_staff` med tildelbar funksjon (ikke `leder`).
 *
 * Owner-sporet er bevisst: `kind = 'owner'` + `dealer_admin` + `leder`.
 * Det krever at man endrer CHECKen — ikke at man sender en annen streng
 * i en JSON-kropp. Staff-ruten setter `kind` selv og tar den aldri fra klienten.
 */
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'staff' NOT NULL;--> statement-breakpoint

ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_role_staff_only";--> statement-breakpoint
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_function_assignable";--> statement-breakpoint
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_role_by_kind";--> statement-breakpoint
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_function_by_kind";--> statement-breakpoint

ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_by_kind" CHECK (
  ("kind" = 'staff' AND "role" = 'dealer_staff')
  OR ("kind" = 'owner' AND "role" = 'dealer_admin')
);--> statement-breakpoint

ALTER TABLE "invitations" ADD CONSTRAINT "invitations_function_by_kind" CHECK (
  ("kind" = 'staff' AND "job_function" IN ('selger', 'support', 'mekaniker'))
  OR ("kind" = 'owner' AND "job_function" = 'leder')
);
