-- Records which posts each blog category and tag page lists.
-- A page with no rows renders the site's own "No blogs found" state.
INSERT INTO `blog_listings` (`taxonomy`, `taxonomy_slug`, `post_slug`, `position`)
SELECT 'category', 'weeding-planning', 'questions-to-ask-destination-wedding-planner', 0
WHERE NOT EXISTS (SELECT 1 FROM `blog_listings` WHERE `taxonomy` = 'category' AND `taxonomy_slug` = 'weeding-planning' AND `post_slug` = 'questions-to-ask-destination-wedding-planner');
--> statement-breakpoint
INSERT INTO `blog_listings` (`taxonomy`, `taxonomy_slug`, `post_slug`, `position`)
SELECT 'category', 'weeding-planning', 'new-luxury-wedding-hotels-in-india', 1
WHERE NOT EXISTS (SELECT 1 FROM `blog_listings` WHERE `taxonomy` = 'category' AND `taxonomy_slug` = 'weeding-planning' AND `post_slug` = 'new-luxury-wedding-hotels-in-india');
--> statement-breakpoint
INSERT INTO `blog_listings` (`taxonomy`, `taxonomy_slug`, `post_slug`, `position`)
SELECT 'category', 'weeding-planning', 'when-to-book-a-wedding-venue', 2
WHERE NOT EXISTS (SELECT 1 FROM `blog_listings` WHERE `taxonomy` = 'category' AND `taxonomy_slug` = 'weeding-planning' AND `post_slug` = 'when-to-book-a-wedding-venue');
--> statement-breakpoint
INSERT INTO `blog_listings` (`taxonomy`, `taxonomy_slug`, `post_slug`, `position`)
SELECT 'category', 'weeding-planning', 'destination-wedding-venue-checklist', 3
WHERE NOT EXISTS (SELECT 1 FROM `blog_listings` WHERE `taxonomy` = 'category' AND `taxonomy_slug` = 'weeding-planning' AND `post_slug` = 'destination-wedding-venue-checklist');
--> statement-breakpoint
INSERT INTO `blog_listings` (`taxonomy`, `taxonomy_slug`, `post_slug`, `position`)
SELECT 'category', 'weeding-planning', 'traditional-vs-destination-wedding', 4
WHERE NOT EXISTS (SELECT 1 FROM `blog_listings` WHERE `taxonomy` = 'category' AND `taxonomy_slug` = 'weeding-planning' AND `post_slug` = 'traditional-vs-destination-wedding');
--> statement-breakpoint
INSERT INTO `blog_listings` (`taxonomy`, `taxonomy_slug`, `post_slug`, `position`)
SELECT 'category', 'weeding-planning', 'arjun-kapoor-sister-anshula-wedding-cost', 5
WHERE NOT EXISTS (SELECT 1 FROM `blog_listings` WHERE `taxonomy` = 'category' AND `taxonomy_slug` = 'weeding-planning' AND `post_slug` = 'arjun-kapoor-sister-anshula-wedding-cost');
--> statement-breakpoint
INSERT INTO `blog_listings` (`taxonomy`, `taxonomy_slug`, `post_slug`, `position`)
SELECT 'category', 'weeding-planning', 'plan-luxury-destination-wedding-like-nupur-sanon-stebin-ben', 6
WHERE NOT EXISTS (SELECT 1 FROM `blog_listings` WHERE `taxonomy` = 'category' AND `taxonomy_slug` = 'weeding-planning' AND `post_slug` = 'plan-luxury-destination-wedding-like-nupur-sanon-stebin-ben');
--> statement-breakpoint
INSERT INTO `blog_listings` (`taxonomy`, `taxonomy_slug`, `post_slug`, `position`)
SELECT 'category', 'weeding-planning', 'vijay-rashmika-udaipur-wedding-cost', 7
WHERE NOT EXISTS (SELECT 1 FROM `blog_listings` WHERE `taxonomy` = 'category' AND `taxonomy_slug` = 'weeding-planning' AND `post_slug` = 'vijay-rashmika-udaipur-wedding-cost');
--> statement-breakpoint
INSERT INTO `blog_listings` (`taxonomy`, `taxonomy_slug`, `post_slug`, `position`)
SELECT 'category', 'weeding-planning', 'nupur-sanon-stebin-ben-wedding-cost', 8
WHERE NOT EXISTS (SELECT 1 FROM `blog_listings` WHERE `taxonomy` = 'category' AND `taxonomy_slug` = 'weeding-planning' AND `post_slug` = 'nupur-sanon-stebin-ben-wedding-cost');
