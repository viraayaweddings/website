CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"user_email" text DEFAULT '' NOT NULL,
	"action" text NOT NULL,
	"entity" text DEFAULT '' NOT NULL,
	"entity_id" text DEFAULT '' NOT NULL,
	"detail" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"taxonomy" text NOT NULL,
	"taxonomy_slug" text NOT NULL,
	"post_slug" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"seo_title" text DEFAULT '' NOT NULL,
	"meta_description" text DEFAULT '' NOT NULL,
	"og_image" text DEFAULT '' NOT NULL,
	"banner_image" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"heading" text DEFAULT '' NOT NULL,
	"published_label" text DEFAULT '' NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"body_html" text DEFAULT '' NOT NULL,
	"faqs" text DEFAULT '[]' NOT NULL,
	"shell_key" text DEFAULT 'blog:a' NOT NULL,
	"card_title" text DEFAULT '' NOT NULL,
	"card_excerpt" text DEFAULT '' NOT NULL,
	"card_image" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "city_listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"city" text NOT NULL,
	"venue_city" text NOT NULL,
	"venue_slug" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "city_pages" (
	"city" text PRIMARY KEY NOT NULL,
	"seo_title" text DEFAULT '' NOT NULL,
	"meta_description" text DEFAULT '' NOT NULL,
	"city_id" text DEFAULT '' NOT NULL,
	"total_venues" integer DEFAULT 0 NOT NULL,
	"shell_key" text DEFAULT 'city' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_slides" (
	"id" serial PRIMARY KEY NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"published" integer DEFAULT 1 NOT NULL,
	"image_key" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"badge_title" text DEFAULT '' NOT NULL,
	"badge_subtitle" text DEFAULT '' NOT NULL,
	"cta_label" text DEFAULT '' NOT NULL,
	"cta_href" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotels" (
	"id" serial PRIMARY KEY NOT NULL,
	"city" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"seo_title" text DEFAULT '' NOT NULL,
	"meta_description" text DEFAULT '' NOT NULL,
	"meta_keywords" text DEFAULT '' NOT NULL,
	"og_image" text DEFAULT '' NOT NULL,
	"banner_image" text DEFAULT '' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"airport_time" text DEFAULT '' NOT NULL,
	"station_time" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"room_inventory" text DEFAULT '' NOT NULL,
	"indoor_venues" text DEFAULT '' NOT NULL,
	"outdoor_venues" text DEFAULT '' NOT NULL,
	"guest_capacity" text DEFAULT '' NOT NULL,
	"reception_capacity" text DEFAULT '' NOT NULL,
	"highlights" text DEFAULT '[]' NOT NULL,
	"faqs" text DEFAULT '[]' NOT NULL,
	"thumbnail_image" text DEFAULT '' NOT NULL,
	"venue_category" text DEFAULT '' NOT NULL,
	"card_pax" text DEFAULT '' NOT NULL,
	"city_label" text DEFAULT '' NOT NULL,
	"nearby_slugs" text DEFAULT '[]' NOT NULL,
	"shell_key" text DEFAULT 'venue:a' NOT NULL,
	"video_id" text DEFAULT '' NOT NULL,
	"external_hotel_id" text DEFAULT '' NOT NULL,
	"total_rooms" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" text DEFAULT '' NOT NULL,
	"form_name" text DEFAULT '' NOT NULL,
	"page_url" text DEFAULT '' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"fields" text DEFAULT '{}' NOT NULL,
	"metadata" text DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"email_sent" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"key" text PRIMARY KEY NOT NULL,
	"filename" text DEFAULT '' NOT NULL,
	"content_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"uploaded_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_templates" (
	"key" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"html" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text DEFAULT '""' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_labels" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"emphasis" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_listings_unique" ON "blog_listings" USING btree ("taxonomy","taxonomy_slug","post_slug");--> statement-breakpoint
CREATE INDEX "blog_listings_page_idx" ON "blog_listings" USING btree ("taxonomy","taxonomy_slug","position");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_unique" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blog_posts_position_idx" ON "blog_posts" USING btree ("position");--> statement-breakpoint
CREATE INDEX "blog_posts_status_idx" ON "blog_posts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "city_listings_unique" ON "city_listings" USING btree ("city","venue_city","venue_slug");--> statement-breakpoint
CREATE INDEX "city_listings_city_idx" ON "city_listings" USING btree ("city","position");--> statement-breakpoint
CREATE INDEX "hero_slides_position_idx" ON "hero_slides" USING btree ("position");--> statement-breakpoint
CREATE UNIQUE INDEX "hotels_city_slug_unique" ON "hotels" USING btree ("city","slug");--> statement-breakpoint
CREATE INDEX "hotels_city_idx" ON "hotels" USING btree ("city");--> statement-breakpoint
CREATE INDEX "hotels_status_idx" ON "hotels" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_form_id_idx" ON "leads" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");