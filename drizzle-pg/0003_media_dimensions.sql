ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "width" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "height" integer DEFAULT 0 NOT NULL;
