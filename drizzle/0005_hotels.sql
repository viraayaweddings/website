CREATE TABLE `hotels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`city` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`seo_title` text DEFAULT '' NOT NULL,
	`meta_description` text DEFAULT '' NOT NULL,
	`meta_keywords` text DEFAULT '' NOT NULL,
	`og_image` text DEFAULT '' NOT NULL,
	`banner_image` text DEFAULT '' NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`airport_time` text DEFAULT '' NOT NULL,
	`station_time` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`room_inventory` text DEFAULT '' NOT NULL,
	`indoor_venues` text DEFAULT '' NOT NULL,
	`outdoor_venues` text DEFAULT '' NOT NULL,
	`guest_capacity` text DEFAULT '' NOT NULL,
	`reception_capacity` text DEFAULT '' NOT NULL,
	`highlights` text DEFAULT '[]' NOT NULL,
	`faqs` text DEFAULT '[]' NOT NULL,
	`external_hotel_id` text DEFAULT '' NOT NULL,
	`total_rooms` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hotels_city_slug_unique` ON `hotels` (`city`,`slug`);--> statement-breakpoint
CREATE INDEX `hotels_city_idx` ON `hotels` (`city`);--> statement-breakpoint
CREATE INDEX `hotels_status_idx` ON `hotels` (`status`);