CREATE TYPE "public"."booking_status" AS ENUM('draft', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');-- > statement-breakpoint
CREATE TYPE "public"."erasure_status" AS ENUM('requested', 'in_progress', 'completed', 'partial', 'failed');-- > statement-breakpoint
CREATE TYPE "public"."thread_kind" AS ENUM('customer_dealer', 'mechanic_dealer', 'dealer_admin');-- > statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'sms');-- > statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('sent', 'failed');-- > statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('mc', 'boat', 'atv');-- > statement-breakpoint
CREATE ROLE "authenticated";-- > statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text,
	"metadata" jsonb,
	"ip_address" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- > statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
-- > statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
-- > statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
-- > statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
-- > statement-breakpoint
CREATE TABLE "passkey" (
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
);
-- > statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
-- > statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	"absolute_expires_at" timestamp,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
-- > statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT true,
	"failed_verification_count" integer DEFAULT 0,
	"locked_until" timestamp
);
-- > statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"phone_number" text,
	"phone_number_verified" boolean,
	"two_factor_enabled" boolean DEFAULT false,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_phone_number_unique" UNIQUE("phone_number")
);
-- > statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
-- > statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid,
	"vehicle_id" uuid,
	"service_version_id" uuid NOT NULL,
	"mechanic_id" uuid NOT NULL,
	"status" "booking_status" DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"idempotency_key" text,
	"source" text DEFAULT 'admin' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- > statement-breakpoint
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "mechanic_skills" (
	"tenant_id" uuid NOT NULL,
	"mechanic_id" uuid NOT NULL,
	"skill_key" text NOT NULL,
	"level" integer DEFAULT 3 NOT NULL,
	"certified_at" date,
	"certification_expires_at" date,
	"years_experience" integer,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mechanic_skills_mechanic_id_skill_key_pk" PRIMARY KEY("mechanic_id","skill_key")
);
-- > statement-breakpoint
ALTER TABLE "mechanic_skills" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "skills" (
	"tenant_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"requires_certification" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_tenant_id_key_pk" PRIMARY KEY("tenant_id","key")
);
-- > statement-breakpoint
ALTER TABLE "skills" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "customer_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- > statement-breakpoint
ALTER TABLE "customer_notes" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- > statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "erasure_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" text NOT NULL,
	"requested_by" text NOT NULL,
	"status" "erasure_status" DEFAULT 'requested' NOT NULL,
	"report" jsonb,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
-- > statement-breakpoint
ALTER TABLE "erasure_requests" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "mechanics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- > statement-breakpoint
ALTER TABLE "mechanics" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- > statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "thread_participants" (
	"tenant_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"participant_id" text NOT NULL,
	"last_read_at" timestamp with time zone,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "thread_participants_thread_id_participant_id_pk" PRIMARY KEY("thread_id","participant_id")
);
-- > statement-breakpoint
ALTER TABLE "thread_participants" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kind" "thread_kind" NOT NULL,
	"subject" text,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- > statement-breakpoint
ALTER TABLE "threads" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"recipient" text NOT NULL,
	"kind" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "notification_status" NOT NULL,
	"provider_message_id" text,
	"error" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- > statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "service_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"duration_minutes" integer NOT NULL,
	"price_minor" integer,
	"description" text,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone
);
-- > statement-breakpoint
ALTER TABLE "service_versions" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"vehicle_type" "vehicle_type" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- > statement-breakpoint
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "stream_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"audience_id" text,
	"type" text NOT NULL,
	"subject_id" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- > statement-breakpoint
ALTER TABLE "stream_events" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "tenant_modules" (
	"tenant_id" uuid NOT NULL,
	"module_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"plan" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_modules_tenant_id_module_key_pk" PRIMARY KEY("tenant_id","module_key")
);
-- > statement-breakpoint
ALTER TABLE "tenant_modules" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
-- > statement-breakpoint
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid,
	"type" "vehicle_type" NOT NULL,
	"reg_number" text,
	"make" text,
	"model" text,
	"model_year" text,
	"vin" text,
	"inspection_due" date,
	"lookup_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- > statement-breakpoint
ALTER TABLE "vehicles" ENABLE ROW LEVEL SECURITY;-- > statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_version_id_service_versions_id_fk" FOREIGN KEY ("service_version_id") REFERENCES "public"."service_versions"("id") ON DELETE restrict ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_mechanic_id_mechanics_id_fk" FOREIGN KEY ("mechanic_id") REFERENCES "public"."mechanics"("id") ON DELETE restrict ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "mechanic_skills" ADD CONSTRAINT "mechanic_skills_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "mechanic_skills" ADD CONSTRAINT "mechanic_skills_mechanic_id_mechanics_id_fk" FOREIGN KEY ("mechanic_id") REFERENCES "public"."mechanics"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "erasure_requests" ADD CONSTRAINT "erasure_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "mechanics" ADD CONSTRAINT "mechanics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "thread_participants" ADD CONSTRAINT "thread_participants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "thread_participants" ADD CONSTRAINT "thread_participants_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "service_versions" ADD CONSTRAINT "service_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "service_versions" ADD CONSTRAINT "service_versions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "stream_events" ADD CONSTRAINT "stream_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "tenant_modules" ADD CONSTRAINT "tenant_modules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;-- > statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;-- > statement-breakpoint
CREATE INDEX "audit_log_tenant_occurred_idx" ON "audit_log" USING btree ("tenant_id","occurred_at");-- > statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");-- > statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");-- > statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");-- > statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" USING btree ("organization_id");-- > statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" USING btree ("user_id");-- > statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "organization" USING btree ("slug");-- > statement-breakpoint
CREATE INDEX "passkey_userId_idx" ON "passkey" USING btree ("user_id");-- > statement-breakpoint
CREATE INDEX "passkey_credentialID_idx" ON "passkey" USING btree ("credential_id");-- > statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");-- > statement-breakpoint
CREATE INDEX "twoFactor_secret_idx" ON "two_factor" USING btree ("secret");-- > statement-breakpoint
CREATE INDEX "twoFactor_userId_idx" ON "two_factor" USING btree ("user_id");-- > statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");-- > statement-breakpoint
CREATE UNIQUE INDEX "bookings_tenant_idempotency_uidx" ON "bookings" USING btree ("tenant_id","idempotency_key");-- > statement-breakpoint
CREATE INDEX "bookings_mechanic_window_idx" ON "bookings" USING btree ("mechanic_id","starts_at","ends_at");-- > statement-breakpoint
CREATE INDEX "bookings_tenant_starts_idx" ON "bookings" USING btree ("tenant_id","starts_at");-- > statement-breakpoint
CREATE INDEX "mechanic_skills_tenant_skill_idx" ON "mechanic_skills" USING btree ("tenant_id","skill_key");-- > statement-breakpoint
CREATE INDEX "customer_notes_customer_idx" ON "customer_notes" USING btree ("customer_id","created_at");-- > statement-breakpoint
CREATE INDEX "customers_tenant_name_idx" ON "customers" USING btree ("tenant_id","name");-- > statement-breakpoint
CREATE INDEX "erasure_requests_tenant_idx" ON "erasure_requests" USING btree ("tenant_id","requested_at");-- > statement-breakpoint
CREATE INDEX "mechanics_tenant_active_idx" ON "mechanics" USING btree ("tenant_id","active");-- > statement-breakpoint
CREATE INDEX "messages_thread_created_idx" ON "messages" USING btree ("thread_id","created_at");-- > statement-breakpoint
CREATE INDEX "thread_participants_participant_idx" ON "thread_participants" USING btree ("tenant_id","participant_id");-- > statement-breakpoint
CREATE INDEX "threads_tenant_last_idx" ON "threads" USING btree ("tenant_id","last_message_at");-- > statement-breakpoint
CREATE UNIQUE INDEX "notifications_tenant_idempotency_uidx" ON "notifications" USING btree ("tenant_id","idempotency_key");-- > statement-breakpoint
CREATE INDEX "notifications_tenant_kind_idx" ON "notifications" USING btree ("tenant_id","kind","sent_at");-- > statement-breakpoint
CREATE UNIQUE INDEX "service_versions_service_version_uidx" ON "service_versions" USING btree ("service_id","version");-- > statement-breakpoint
CREATE INDEX "service_versions_current_idx" ON "service_versions" USING btree ("service_id","valid_to");-- > statement-breakpoint
CREATE INDEX "services_tenant_active_idx" ON "services" USING btree ("tenant_id","active");-- > statement-breakpoint
CREATE INDEX "stream_events_tenant_id_idx" ON "stream_events" USING btree ("tenant_id","id");-- > statement-breakpoint
CREATE INDEX "stream_events_created_idx" ON "stream_events" USING btree ("created_at");-- > statement-breakpoint
CREATE INDEX "vehicles_tenant_reg_idx" ON "vehicles" USING btree ("tenant_id","reg_number");-- > statement-breakpoint
CREATE INDEX "vehicles_customer_idx" ON "vehicles" USING btree ("customer_id");-- > statement-breakpoint
CREATE POLICY "audit_log_tenant_read" ON "audit_log" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("audit_log"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "audit_log_tenant_insert" ON "audit_log" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("audit_log"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "bookings_tenant_isolation" ON "bookings" AS PERMISSIVE FOR ALL TO "authenticated" USING ("bookings"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("bookings"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "mechanic_skills_tenant_isolation" ON "mechanic_skills" AS PERMISSIVE FOR ALL TO "authenticated" USING ("mechanic_skills"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("mechanic_skills"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "skills_tenant_isolation" ON "skills" AS PERMISSIVE FOR ALL TO "authenticated" USING ("skills"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("skills"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "customer_notes_tenant_isolation" ON "customer_notes" AS PERMISSIVE FOR ALL TO "authenticated" USING ("customer_notes"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("customer_notes"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "customers_tenant_isolation" ON "customers" AS PERMISSIVE FOR ALL TO "authenticated" USING ("customers"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("customers"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "erasure_requests_tenant_isolation" ON "erasure_requests" AS PERMISSIVE FOR ALL TO "authenticated" USING ("erasure_requests"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("erasure_requests"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "mechanics_tenant_isolation" ON "mechanics" AS PERMISSIVE FOR ALL TO "authenticated" USING ("mechanics"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("mechanics"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "messages_tenant_isolation" ON "messages" AS PERMISSIVE FOR ALL TO "authenticated" USING ("messages"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("messages"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "thread_participants_tenant_isolation" ON "thread_participants" AS PERMISSIVE FOR ALL TO "authenticated" USING ("thread_participants"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("thread_participants"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "threads_tenant_isolation" ON "threads" AS PERMISSIVE FOR ALL TO "authenticated" USING ("threads"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("threads"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "notifications_tenant_isolation" ON "notifications" AS PERMISSIVE FOR ALL TO "authenticated" USING ("notifications"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("notifications"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "service_versions_tenant_isolation" ON "service_versions" AS PERMISSIVE FOR ALL TO "authenticated" USING ("service_versions"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("service_versions"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "services_tenant_isolation" ON "services" AS PERMISSIVE FOR ALL TO "authenticated" USING ("services"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("services"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "stream_events_tenant_isolation" ON "stream_events" AS PERMISSIVE FOR ALL TO "authenticated" USING ("stream_events"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("stream_events"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "tenant_modules_tenant_isolation" ON "tenant_modules" AS PERMISSIVE FOR ALL TO "authenticated" USING ("tenant_modules"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("tenant_modules"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "tenants_self_isolation" ON "tenants" AS PERMISSIVE FOR ALL TO "authenticated" USING ("tenants"."id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("tenants"."id" = nullif(current_setting('app.tenant_id', true), '')::uuid);-- > statement-breakpoint
CREATE POLICY "vehicles_tenant_isolation" ON "vehicles" AS PERMISSIVE FOR ALL TO "authenticated" USING ("vehicles"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("vehicles"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);