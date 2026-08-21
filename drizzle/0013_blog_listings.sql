CREATE TABLE `blog_listings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`taxonomy` text NOT NULL,
	`taxonomy_slug` text NOT NULL,
	`post_slug` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blog_listings_unique` ON `blog_listings` (`taxonomy`,`taxonomy_slug`,`post_slug`);--> statement-breakpoint
CREATE INDEX `blog_listings_page_idx` ON `blog_listings` (`taxonomy`,`taxonomy_slug`,`position`);