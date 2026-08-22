-- Pages that had no content model: the calculators, the landing pages, the
-- policy and story pages. They were served straight from their cloned file, so
-- nothing an admin changed ever reached them.
CREATE TABLE "static_pages" (
	"path" text PRIMARY KEY NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"meta_description" text DEFAULT '' NOT NULL,
	"html" text DEFAULT '' NOT NULL,
	"published" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "static_pages_published_idx" ON "static_pages" ("published");
