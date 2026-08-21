CREATE TABLE `city_pages` (
	`city` text PRIMARY KEY NOT NULL,
	`seo_title` text DEFAULT '' NOT NULL,
	`meta_description` text DEFAULT '' NOT NULL,
	`city_id` text DEFAULT '' NOT NULL,
	`shell_key` text DEFAULT 'city' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `page_templates` (
	`key` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`html` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `blog_posts` ADD `shell_key` text DEFAULT 'blog:a' NOT NULL;--> statement-breakpoint
ALTER TABLE `hotels` ADD `shell_key` text DEFAULT 'venue:a' NOT NULL;