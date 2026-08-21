CREATE TABLE `blog_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`seo_title` text DEFAULT '' NOT NULL,
	`meta_description` text DEFAULT '' NOT NULL,
	`og_image` text DEFAULT '' NOT NULL,
	`banner_image` text DEFAULT '' NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`heading` text DEFAULT '' NOT NULL,
	`published_label` text DEFAULT '' NOT NULL,
	`author` text DEFAULT '' NOT NULL,
	`body_html` text DEFAULT '' NOT NULL,
	`faqs` text DEFAULT '[]' NOT NULL,
	`card_title` text DEFAULT '' NOT NULL,
	`card_excerpt` text DEFAULT '' NOT NULL,
	`card_image` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blog_posts_slug_unique` ON `blog_posts` (`slug`);--> statement-breakpoint
CREATE INDEX `blog_posts_position_idx` ON `blog_posts` (`position`);--> statement-breakpoint
CREATE INDEX `blog_posts_status_idx` ON `blog_posts` (`status`);