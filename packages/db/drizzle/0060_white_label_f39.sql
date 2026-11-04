/*
 * F39 — GDPR-ack på customers (varsel ved første innlogging).
 * `app` er allerede reservert slug (0045). Host-sonen settes i kode.
 */
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "gdpr_ack_at" timestamp with time zone;
