CREATE TABLE "member_profiles" (
	"tenant_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"nickname" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_profiles_tenant_id_user_id_pk" PRIMARY KEY("tenant_id","user_id")
);
-- > statement-breakpoint
ALTER TABLE "member_profiles" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"notification_sounds" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- > statement-breakpoint
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
CREATE INDEX "member_profiles_user_idx" ON "member_profiles" USING btree ("user_id");-- > statement-breakpoint
CREATE POLICY "member_profiles_tenant_isolation" ON "member_profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING ("member_profiles"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("member_profiles"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);