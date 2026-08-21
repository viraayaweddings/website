-- These venues describe capacity in prose on their own page but show a plain
-- number on listing cards. Only the differing ones are stored; everything
-- else falls back to guest_capacity.
UPDATE `hotels` SET `card_pax` = '630' WHERE `city` = 'goa' AND `slug` = 'grand-hyatt-goa' AND `card_pax` = '';
--> statement-breakpoint
UPDATE `hotels` SET `card_pax` = '180' WHERE `city` = 'jaisalmer' AND `slug` = 'suryagarh-palace-jaisalmer' AND `card_pax` = '';
--> statement-breakpoint
UPDATE `hotels` SET `card_pax` = '310' WHERE `city` = 'jaisalmer' AND `slug` = 'jaisalmer-marriott-resort-and-spa' AND `card_pax` = '';
--> statement-breakpoint
UPDATE `hotels` SET `card_pax` = '220' WHERE `city` = 'jodhpur' AND `slug` = 'indana-palace-jodhpur' AND `card_pax` = '';
