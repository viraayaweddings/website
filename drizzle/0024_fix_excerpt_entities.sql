-- Two excerpts were stored with entities as literal text, so readers saw
-- &quot; and &nbsp; printed on the blog listing. Decoding them once fixes
-- the display; the wording itself is unchanged.
UPDATE `blog_posts` SET `card_excerpt` = replace(`card_excerpt`, '&quot;', '"')
WHERE `slug` = 'questions-to-ask-destination-wedding-planner';
--> statement-breakpoint
UPDATE `blog_posts` SET `card_excerpt` = replace(`card_excerpt`, '&nbsp;', ' ')
WHERE `slug` = 'arjun-kapoor-sister-anshula-wedding-cost';
