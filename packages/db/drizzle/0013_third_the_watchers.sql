CREATE TABLE "helpdesk_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body" text NOT NULL,
	"image" text,
	"published" boolean DEFAULT true NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "helpdesk_articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "helpdesk_reads" (
	"user_id" text NOT NULL,
	"article_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "helpdesk_reads_user_id_article_id_pk" PRIMARY KEY("user_id","article_id")
);
--> statement-breakpoint
ALTER TABLE "helpdesk_reads" ADD CONSTRAINT "helpdesk_reads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk_reads" ADD CONSTRAINT "helpdesk_reads_article_id_helpdesk_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."helpdesk_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "helpdesk_articles_published_idx" ON "helpdesk_articles" USING btree ("published","published_at");--> statement-breakpoint
CREATE INDEX "helpdesk_reads_user_idx" ON "helpdesk_reads" USING btree ("user_id");