-- Stores the site's contact details, so they live in the database rather
-- than only as defaults in code. The values match what the pages already
-- show, so nothing changes until someone edits them in the panel.
INSERT INTO `settings` (`key`, `value`, `updated_by`)
SELECT 'phone', '"+91 81302 22141"', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'phone');
--> statement-breakpoint
INSERT INTO `settings` (`key`, `value`, `updated_by`)
SELECT 'whatsappNumber', '"918130222141"', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'whatsappNumber');
--> statement-breakpoint
INSERT INTO `settings` (`key`, `value`, `updated_by`)
SELECT 'email', '"support@viraayaweddings.com"', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'email');
--> statement-breakpoint
INSERT INTO `settings` (`key`, `value`, `updated_by`)
SELECT 'addressLines', '["Chattarpur Mandir Rd, Ansal Villas,", "Satbari, New Delhi,", "Delhi - 110074"]', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'addressLines');
--> statement-breakpoint
INSERT INTO `settings` (`key`, `value`, `updated_by`)
SELECT 'instagramUrl', '"https://www.instagram.com/viraayaweddings/"', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'instagramUrl');
--> statement-breakpoint
INSERT INTO `settings` (`key`, `value`, `updated_by`)
SELECT 'linkedinUrl', '"https://www.linkedin.com/company/viraaya-weddings/"', 'seed'
WHERE NOT EXISTS (SELECT 1 FROM `settings` WHERE `key` = 'linkedinUrl');
