CREATE TABLE "billing_customers" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan_key" text,
	"status" text DEFAULT 'none' NOT NULL,
	"current_period_end" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- > statement-breakpoint
ALTER TABLE "billing_customers" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "feature_flag_overrides" (
	"flag_key" text NOT NULL,
	"tenant_id" uuid NOT NULL,
	"enabled" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flag_overrides_flag_key_tenant_id_pk" PRIMARY KEY("flag_key","tenant_id")
);
-- > statement-breakpoint
ALTER TABLE "feature_flag_overrides" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- > statement-breakpoint
CREATE TABLE "integration_config" (
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"base_url" text,
	"token_cipher" text,
	"last_synced_at" timestamp with time zone,
	"last_sync_status" text,
	"last_sync_detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_config_tenant_id_provider_pk" PRIMARY KEY("tenant_id","provider")
);
-- > statement-breakpoint
ALTER TABLE "integration_config" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "sync_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"field" text NOT NULL,
	"base_value" text,
	"our_value" text,
	"their_value" text,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"push_intent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- > statement-breakpoint
ALTER TABLE "sync_conflicts" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "source" text DEFAULT 'endwise' NOT NULL;-- > statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "quick_guid" text;-- > statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "quick_baseline" jsonb;-- > statement-breakpoint
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "integration_config" ADD CONSTRAINT "integration_config_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
CREATE INDEX "sync_conflicts_tenant_status_idx" ON "sync_conflicts" USING btree ("tenant_id","status");-- > statement-breakpoint
CREATE UNIQUE INDEX "sync_conflicts_open_uidx" ON "sync_conflicts" USING btree ("tenant_id","provider","entity","entity_id","field") WHERE status = 'open';-- > statement-breakpoint
CREATE UNIQUE INDEX "customers_tenant_quick_guid_uidx" ON "customers" USING btree ("tenant_id","quick_guid");-- > statement-breakpoint
CREATE POLICY "billing_customers_tenant_isolation" ON "billing_customers" AS PERMISSIVE FOR ALL TO "authenticated" USING ("billing_customers"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("billing_customers"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "feature_flag_overrides_tenant_isolation" ON "feature_flag_overrides" AS PERMISSIVE FOR ALL TO "authenticated" USING ("feature_flag_overrides"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("feature_flag_overrides"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "integration_config_tenant_isolation" ON "integration_config" AS PERMISSIVE FOR ALL TO "authenticated" USING ("integration_config"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("integration_config"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "sync_conflicts_tenant_isolation" ON "sync_conflicts" AS PERMISSIVE FOR ALL TO "authenticated" USING ("sync_conflicts"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("sync_conflicts"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);