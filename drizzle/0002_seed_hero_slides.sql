-- Seeds the hero slider with the slides the homepage already ships, so the
-- admin panel opens on the real content and the rendered page is unchanged.
--
-- Each row is guarded on its own position rather than on the table being
-- empty: the hosting platform may apply these migrations itself, in which
-- case the worker's migrator replays them and an unguarded INSERT would
-- duplicate every slide.
INSERT INTO `hero_slides` (`position`, `published`, `image_key`, `title`, `description`, `badge_title`, `badge_subtitle`, `cta_label`, `cta_href`)
SELECT 0, 1, '/storage/banners/4SkVYWKvY2RlANzTzq5Rh0jvzu28T6jdZ5ujG9kY.jpg', 'Check Availability for Your Dream Wedding Venue', 'Shortlist your preferred hotels or resorts and let us verify wedding date availability for you. Our team manages the coordination and shares confirmed responses directly.', 'Reliable Venue Availability Checks', '', 'Request Availability', '/check-hotel-availability'
WHERE NOT EXISTS (SELECT 1 FROM `hero_slides` WHERE `position` = 0);
--> statement-breakpoint
INSERT INTO `hero_slides` (`position`, `published`, `image_key`, `title`, `description`, `badge_title`, `badge_subtitle`, `cta_label`, `cta_href`)
SELECT 1, 1, '/storage/banners/1N5vZk6PJa0CZfwK1MvMNRbzzlNCJ3qaM5wXFMig.jpg', 'Estimate Your Destination Wedding Cost', 'Get a clear understanding of your wedding budget before you commit. Use our venue cost calculator to receive a personalised estimate based on your ceremony details.', 'Smart Venue Cost Insights', '', 'View Your Estimate', '/hotel-cost-calculator'
WHERE NOT EXISTS (SELECT 1 FROM `hero_slides` WHERE `position` = 1);
--> statement-breakpoint
INSERT INTO `hero_slides` (`position`, `published`, `image_key`, `title`, `description`, `badge_title`, `badge_subtitle`, `cta_label`, `cta_href`)
SELECT 2, 1, '/storage/banners/zDU6MEA4ANapeel8MSyOa2BsYjxmLOsd3zd7CX48.jpg', 'Get Direction on Wedding Planning', 'Speak with an experienced wedding planner who can guide you through vendor selection, budget planning and choosing the right venue category for your celebration.', 'Senior-Level Wedding Expertise', '', 'Book a Call', '/wedding-consultation'
WHERE NOT EXISTS (SELECT 1 FROM `hero_slides` WHERE `position` = 2);
--> statement-breakpoint
INSERT INTO `hero_slides` (`position`, `published`, `image_key`, `title`, `description`, `badge_title`, `badge_subtitle`, `cta_label`, `cta_href`)
SELECT 3, 1, '/storage/banners/X2NsD8x7byP3Uw0ckRe7GYx6c6MvfIostCeXnl94.jpg', 'Take Your Vows at a Venue as Extraordinary as You', 'Viraaya Weddings is an intelligent wedding planning platform connecting families with exceptional destination wedding venues across India.', '250+ Verified Luxury Wedding Venues', '', 'Explore Venues', '/hotel-listing'
WHERE NOT EXISTS (SELECT 1 FROM `hero_slides` WHERE `position` = 3);
