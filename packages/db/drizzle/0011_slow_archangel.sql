CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"job_function" "job_function" NOT NULL,
	"role" text DEFAULT 'dealer_staff' NOT NULL,
	"invited_by" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- > statement-breakpoint
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_hash_uidx" ON "invitations" USING btree ("token_hash");-- > statement-breakpoint
CREATE INDEX "invitations_tenant_email_idx" ON "invitations" USING btree ("tenant_id","email");-- > statement-breakpoint
CREATE POLICY "invitations_tenant_isolation" ON "invitations" AS PERMISSIVE FOR ALL TO "authenticated" USING ("invitations"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("invitations"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint

/*
 * En invitasjon kan aldri gi mer enn `dealer_staff`.
 * Modulen validerer det allerede, og ruta er `adminProcedure`. Denne
 * constrainten er det tredje laget, og det eneste som overlever at noen senere
 * skriver en ny rute, et skript eller en migrasjon som glemmer regelen.
 * Å heve en invitasjon til `dealer_admin` skal kreve at man bevisst endrer en
 * Check i en migrasjon — ikke at man sender en annen streng i en JSON-kropp.
 * Idempotent: droppes først hvis den finnes.
 */
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_role_staff_only";-- > statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_staff_only" CHECK ("role" = 'dealer_staff');-- > statement-breakpoint

/*
 * Jobbfunksjonen må være tildelbar. `leder` følger av tilgangsnivået
 * (`member.role = dealer_admin`) og skal ikke kunne komme inn via en
 * invitasjon — da ville vi hatt en «leder» som er `dealer_staff`, altså en
 * person hvis funksjon og tilgang er uenige. Se `packages/modules/src/profil/`.
 */
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_function_assignable";-- > statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_function_assignable" CHECK ("job_function" IN ('selger', 'support', 'mekaniker'));
