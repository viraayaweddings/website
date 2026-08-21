CREATE TABLE `city_listings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`city` text NOT NULL,
	`venue_city` text NOT NULL,
	`venue_slug` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `city_listings_unique` ON `city_listings` (`city`,`venue_city`,`venue_slug`);--> statement-breakpoint
CREATE INDEX `city_listings_city_idx` ON `city_listings` (`city`,`position`);--> statement-breakpoint
ALTER TABLE `hotels` ADD `thumbnail_image` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `hotels` ADD `city_label` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `hotels` ADD `nearby_slugs` text DEFAULT '[]' NOT NULL;