/*
 * F6-01 / F6-16 — KANAL PÅ MELDINGER (08.08.2026).
 *
 * Innboksen hadde en kanal-indikator som var ren prototype: den viste et
 * oppdiktet SMS-/e-post-ikon bak en av-som-standard-bryter, fordi `messages`
 * ikke hadde noe felt for hvor meldingen kom fra. Denne migrasjonen gir den
 * et datagrunnlag.
 *
 * ⚠️ Eksisterende rader: `NOT NULL DEFAULT` fyller dem i samme setning —
 * alt som allerede står i basen blir `channel='app'`, `direction='outbound'`,
 * som er sant: de ble alle skrevet i Endwise.
 *
 * `external_id` er unik per tenant og er idempotensnøkkelen for innkommende
 * webhooks (F6-16). NULL teller som distinkt i Postgres, så app-meldinger —
 * som ikke har en ekstern ID — kolliderer ikke med hverandre.
 */
CREATE TYPE "public"."message_channel" AS ENUM('app', 'sms', 'email', 'web');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "channel" "message_channel" DEFAULT 'app' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "direction" "message_direction" DEFAULT 'outbound' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "external_ref" text;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "channel" "message_channel" DEFAULT 'app' NOT NULL;--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "external_ref" text;--> statement-breakpoint
CREATE UNIQUE INDEX "messages_tenant_external_uidx" ON "messages" USING btree ("tenant_id","external_id");--> statement-breakpoint
CREATE INDEX "threads_tenant_channel_ref_idx" ON "threads" USING btree ("tenant_id","channel","external_ref");