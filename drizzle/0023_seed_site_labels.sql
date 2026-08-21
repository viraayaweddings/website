-- Stores the fixed section headings, buttons and field labels, so the
-- wording lives in the database rather than only as defaults in code.
-- The values match what the pages already say.
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'venue.amenities', 'Hotel', 'Amenities', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'venue.amenities');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'venue.faq', 'Frequently Asked', 'Questions', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'venue.faq');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'venue.similar', 'Browse Similar', 'Hotels', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'venue.similar');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'venue.gallery', 'Event Spaces', 'Gallery', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'venue.gallery');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'venue.glance', 'AT A', 'GLANCE', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'venue.glance');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'venue.glance.rooms', 'Total Room Inventory', '', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'venue.glance.rooms');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'venue.glance.indoor', 'Indoor Venues', '', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'venue.glance.indoor');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'venue.glance.outdoor', 'Outdoor Venues', '', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'venue.glance.outdoor');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'venue.glance.guests', 'Total Guest Capacity', '', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'venue.glance.guests');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'venue.glance.reception', 'Max. Reception Capacity', '', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'venue.glance.reception');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'venue.viewMore', 'View More', '', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'venue.viewMore');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'venue.airport', 'Airport', '', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'venue.airport');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'venue.station', 'Railway Station', '', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'venue.station');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'card.details', 'DETAILS', '', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'card.details');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'card.availability', 'CHECK AVAILABILITY', '', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'card.availability');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'card.readMore', 'Read More', '', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'card.readMore');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'blog.toc', 'Table of Contents', '', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'blog.toc');
--> statement-breakpoint
INSERT INTO `site_labels` (`key`, `value`, `emphasis`, `updated_by`)
SELECT 'blog.faq', 'Frequently Asked', 'Questions', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `site_labels` WHERE `key` = 'blog.faq');
