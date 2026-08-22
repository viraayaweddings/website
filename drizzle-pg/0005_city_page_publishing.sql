-- City index pages gain the two things every other content type already had:
-- a publish switch, and a heading the panel owns.
--
-- `published` gates the stored version only. An unpublished city falls back to
-- the markup it shipped with, exactly as an unpublished stored page does, so
-- hiding a city never takes its page offline.
--
-- The heading is stored in two halves because the markup styles it as a plain
-- word followed by an emphasised span ("Luxury <b>Hotels</b>"), the same shape
-- site_labels already uses. Both empty means "leave the shell's own wording
-- alone", which is what every seeded row starts as.
ALTER TABLE "city_pages" ADD COLUMN IF NOT EXISTS "published" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "city_pages" ADD COLUMN IF NOT EXISTS "heading" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "city_pages" ADD COLUMN IF NOT EXISTS "heading_emphasis" text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE INDEX "city_pages_published_idx" ON "city_pages" ("published");
