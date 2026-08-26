CREATE TYPE "public"."message_delivery" AS ENUM('pending', 'sending', 'sent', 'failed');-- > statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "delivery_status" "message_delivery";-- > statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "delivery_error" text;