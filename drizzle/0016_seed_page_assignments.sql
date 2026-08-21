-- Assigns each page its shell and records the per-city fields.
-- The shells themselves are seeded from worker/db/page-templates.generated.ts,
-- because a 290KB shell exceeds D1's 100KB limit on SQL statement text.
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'agra' AND `slug` = 'courtyard-by-marriott-agra';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'agra' AND `slug` = 'doubletree-by-hilton-hotel-agra';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'agra' AND `slug` = 'itc-mughal-agra';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'agra' AND `slug` = 'jaypee-palace-hotel-and-convention-centre-agra';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'agra' AND `slug` = 'laxmi-vilas-palace-bharatpur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'agra' AND `slug` = 'taj-agra';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'agra' AND `slug` = 'taj-view-agra';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'agra' AND `slug` = 'the-oberoi-amarvilas-agra';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'agra' AND `slug` = 'trident-agra';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'ahmedabad' AND `slug` = 'doubletree-by-hilton-ahmedabad';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'ahmedabad' AND `slug` = 'gateway-ahmedabad-sindhu-bhavan';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'ahmedabad' AND `slug` = 'itc-narmada-a-luxury-collection-hotel-ahmedabad';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'ahmedabad' AND `slug` = 'novotel-ahmedabad';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:c' WHERE `city` = 'ajmer' AND `slug` = 'pratap-mahal-ajmer-an-ihcl-seleqtions-hotel';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'amritsar' AND `slug` = 'holiday-inn-amritsar-ranjit-avenue-by-ihg';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'amritsar' AND `slug` = 'hyatt-regency-amritsar-hotel-and-spa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'amritsar' AND `slug` = 'taj-swarna-amritsar';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'amritsar' AND `slug` = 'welcomhotel-by-itc-hotels-amritsar';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:c' WHERE `city` = 'barwara' AND `slug` = 'six-senses-fort-barwara';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:c' WHERE `city` = 'bengal' AND `slug` = 'itc-royal-bengal';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'bengaluru' AND `slug` = 'hilton-bangalore-embassy-golflinks';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'bengaluru' AND `slug` = 'hilton-garden-inn-bengaluru-embassy-manyata-business-park';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'bengaluru' AND `slug` = 'itc-gardenia-bengaluru';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'bengaluru' AND `slug` = 'itc-windsor-a-luxury-collection-hotel-bengaluru';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'bengaluru' AND `slug` = 'jw-marriott-bengaluru-prestige-golfshire-resort-and-spa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'bengaluru' AND `slug` = 'radisson-blu-hotel-bengaluru';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'bengaluru' AND `slug` = 'shangri-la-bengaluru';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'bengaluru' AND `slug` = 'taj-west-end-bengaluru';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'bengaluru' AND `slug` = 'the-leela-bhartiya-city-bengaluru';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'bengaluru' AND `slug` = 'the-leela-palace-bengaluru';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'bengaluru' AND `slug` = 'the-ritz-carlton-bangalore';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'bhopal' AND `slug` = 'courtyard-by-marriott-bhopal';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'bhopal' AND `slug` = 'radisson-hotel-bhopal';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'bhopal' AND `slug` = 'taj-lakefront-bhopal';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'chandigarh' AND `slug` = 'hyatt-regency-chandigarh';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'chandigarh' AND `slug` = 'jw-marriott-hotel-chandigarh';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'chandigarh' AND `slug` = 'novotel-chandigarh-tribune-chowk';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'chandigarh' AND `slug` = 'taj-chandigarh';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'chandigarh' AND `slug` = 'the-oberoi-sukhvilas';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'chennai' AND `slug` = 'hilton-chennai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'chennai' AND `slug` = 'hyatt-regency-chennai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'chennai' AND `slug` = 'itc-grand-chola-chennai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'chennai' AND `slug` = 'le-royal-meridien-chennai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'chennai' AND `slug` = 'novotel-chennai-omr';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'chennai' AND `slug` = 'taj-club-house-chennai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'chennai' AND `slug` = 'taj-connemara-chennai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'chennai' AND `slug` = 'the-leela-palace-chennai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'daman' AND `slug` = 'praveg-lake-resort-daman';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'daman' AND `slug` = 'silver-waves-resort-and-spa-daman';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'daman' AND `slug` = 'the-deltin-daman';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'dehradun' AND `slug` = 'hyatt-regency-dehradun-resort-and-spa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:d' WHERE `city` = 'dehradun' AND `slug` = 'le-meridien-dehradun-resort-and-spa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'dehradun' AND `slug` = 'taj-mussoorie-foothills-dehradun';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'andaz-new-delhi';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'courtyard-by-marriott-aravali-resort-delhi-ncr';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'grand-hyatt-gurgaon';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'heritage-village-resort-and-spa-manesar';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'itc-grand-bharat-delhi-ncr';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'itc-maurya-a-luxury-collection-hotel-new-delhi';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'jaypee-greens-golf-and-spa-resort-delhi-ncr';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'jw-marriott-hotel-new-delhi-aerocity';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'karma-lakelands-gurugram';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'pullman-new-delhi-aerocity';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'radisson-blu-plaza-hotel-delhi-airport';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'resort-country-club-manesar';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'sheraton-new-delhi-hotel';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'taj-damdama-lake-resort-and-spa-gurugram';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'taj-mansingh-new-delhi';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'taj-palace-new-delhi';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'taj-surajkund-resort-and-spa-delhi-ncr';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'the-lalit-mangar-delhi-ncr';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'the-leela-ambience-convention-hotel-gurugram';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'the-leela-palace-new-delhi';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'the-oberoi-gurgaon';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'the-roseate-new-delhi';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'the-westin-sohna-resort-and-spa-gurgaon';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'trident-gurgaon';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'delhi-ncr' AND `slug` = 'welcomhotel-by-itc-hotels-delhi';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'alila-diwa-goa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'azaya-beach-resort-goa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'caravela-beach-resort';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'grand-hyatt-goa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'holiday-inn-resort-goa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'itc-grand-goa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'jw-marriott-goa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'planet-hollywood-beach-resort-goa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'radisson-blu-resort-goa-cavelossim-beach';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'taj-cidade-de-goa-heritage-goa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'taj-cidade-de-goa-horizon-goa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'taj-exotica-resort-and-spa-goa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'taj-fort-aguada-resort-and-spa-goa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'taj-holiday-village-resort-and-spa-goa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'the-lalit-golf-and-spa-resort-goa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:d' WHERE `city` = 'goa' AND `slug` = 'the-st-regis-goa-resort';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'the-zuri-white-sands-goa-resort-and-casino';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'goa' AND `slug` = 'w-goa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'guwahati' AND `slug` = 'mayfair-spring-valley-resort-guwahati';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'guwahati' AND `slug` = 'radisson-blu-hotel-guwahati';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:c' WHERE `city` = 'gwalior' AND `slug` = 'taj-usha-kiran-palace-gwalior';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'hyderabad' AND `slug` = 'hyatt-hyderabad-gachibowli';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'hyderabad' AND `slug` = 'hyderabad-marriott-hotel-and-convention-centre';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'hyderabad' AND `slug` = 'itc-kakatiya-a-luxury-collection-hotel-hyderabad';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'hyderabad' AND `slug` = 'itc-kohenur-a-luxury-collection-hotel-hyderabad';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'hyderabad' AND `slug` = 'le-meridien-hyderabad';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'hyderabad' AND `slug` = 'novotel-hyderabad-convention-centre';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'hyderabad' AND `slug` = 'radisson-blu-plaza-hotel-hyderabad-banjara-hills';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'hyderabad' AND `slug` = 'sheraton-hyderabad-hotel';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'hyderabad' AND `slug` = 'taj-deccan-hyderabad';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'hyderabad' AND `slug` = 'taj-falaknuma-palace-hyderabad';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'hyderabad' AND `slug` = 'taj-krishna-hyderabad';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'hyderabad' AND `slug` = 'the-leela-hyderabad';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'hyderabad' AND `slug` = 'the-park-hyderabad';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'hyderabad' AND `slug` = 'trident-hyderabad';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'indore' AND `slug` = 'indore-marriott-hotel';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'indore' AND `slug` = 'radisson-blu-hotel-indore';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'indore' AND `slug` = 'sheraton-grand-palace-indore';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'indore' AND `slug` = 'the-park-indore';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'alila-fort-bishangarh-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'ananta-spa-and-resort-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'bhanwar-singh-palace-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'buena-vista-luxury-garden-spa-resort';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'chomu-palace-hotel-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'doubletree-by-hilton-jaipur-amer';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'fairmont-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'hyatt-regency-jaipur-mansarovar';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'indana-palace-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'intercontinental-jaipur-tonk-road-by-ihg';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'itc-rajputana-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'jai-mahal-palace-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'le-meridien-jaipur-resort-and-spa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'mementos-by-itc-hotels-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'mundota-fort-and-palace-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'novotel-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'pride-amber-vilas-resort-and-convention-centre-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'raffles-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'rajasthali-resorts-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'rambagh-palace-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'samode-bagh-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'shiv-vilas-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'taj-amer-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'taj-devi-ratn-resort-and-spa-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'the-gold-palace-and-resorts-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'the-jaibagh-palace-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'the-leela-palace-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'the-oberoi-rajvilas-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'the-palace-aravali-by-park-jewels-hotels-and-resorts-jaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaipur' AND `slug` = 'the-westin-jaipur-kant-kalwar-resort-and-spa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaisalmer' AND `slug` = 'fort-rajwada-jaisalmer';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaisalmer' AND `slug` = 'gobindgarh-jaisalmer';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaisalmer' AND `slug` = 'jaisalmer-marriott-resort-and-spa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaisalmer' AND `slug` = 'storii-by-itc-hotels-jaisalmer';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaisalmer' AND `slug` = 'suryagarh-palace-jaisalmer';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jaisalmer' AND `slug` = 'taj-gorbandh-palace-jaisalmer';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jim-corbett' AND `slug` = 'aahana-resort-luxury-resorts-in-jim-corbett';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jim-corbett' AND `slug` = 'lemon-tree-premier-jim-corbett';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jim-corbett' AND `slug` = 'namah-jim-corbett';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jim-corbett' AND `slug` = 'resorts-by-the-baagh-jim-corbett';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jim-corbett' AND `slug` = 'taj-corbett-resort-and-spa-jim-corbett';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jim-corbett' AND `slug` = 'tarangi-jim-corbett-resort-and-spa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jim-corbett' AND `slug` = 'the-riverview-retreat-jim-corbett';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jim-corbett' AND `slug` = 'welcomhotel-by-itc-hotels-jim-corbett';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jim-corbett' AND `slug` = 'zana-a-luxury-escape-dhikuli-jim-corbet';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jodhpur' AND `slug` = 'indana-palace-jodhpur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jodhpur' AND `slug` = 'radisson-hotel-jodhpur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jodhpur' AND `slug` = 'ranbanka-palace-jodhpur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jodhpur' AND `slug` = 'taj-hari-mahal-jodhpur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jodhpur' AND `slug` = 'umaid-bhawan-palace-jodhpur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jodhpur' AND `slug` = 'welcomheritage-bal-samand-lake-palace-jodhpur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'jodhpur' AND `slug` = 'welcomhotel-by-itc-hotels-jodhpur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:c' WHERE `city` = 'karnal' AND `slug` = 'noormahal-palace-karnal';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'karnataka' AND `slug` = 'coorg-marriott-resort-and-spa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'karnataka' AND `slug` = 'gateway-coorg-karnataka';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'karnataka' AND `slug` = 'taj-madikeri-resort-and-spa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:c' WHERE `city` = 'kasauli' AND `slug` = 'fortune-select-forest-hill-mahiya-kasauli';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'kerala' AND `slug` = 'taj-bekal-resort-and-spa-kerala';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'kerala' AND `slug` = 'taj-kumarakom-resort-and-spa-kerala';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'kerala' AND `slug` = 'taj-wayanad-resort-and-spa-kerala';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:c' WHERE `city` = 'khimsar' AND `slug` = 'welcomhotel-by-itc-hotels-fort-and-dunes-khimsar';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'kochi' AND `slug` = 'courtyard-by-marriott-kochi-airport';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'kochi' AND `slug` = 'grand-hyatt-kochi-bolgatty';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'kochi' AND `slug` = 'le-meridien-kochi';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'kochi' AND `slug` = 'radisson-blu-kochi';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'kolkata' AND `slug` = 'hyatt-regency-kolkata';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'kolkata' AND `slug` = 'itc-sonar-a-luxury-collection-hotel-kolkata';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'kolkata' AND `slug` = 'jw-marriott-hotel-kolkata';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'kolkata' AND `slug` = 'novotel-kolkata-hotel-and-residences';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'kolkata' AND `slug` = 'taj-bengal-kolkata';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:c' WHERE `city` = 'kovalam' AND `slug` = 'the-leela-kovalam-a-raviz-hotel';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'lucknow' AND `slug` = 'hyatt-regency-lucknow';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'lucknow' AND `slug` = 'novotel-lucknow-gomti-nagar';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'lucknow' AND `slug` = 'taj-mahal-lucknow';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mumbai' AND `slug` = 'courtyard-by-marriott-mumbai-international-airport';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mumbai' AND `slug` = 'fairmont-mumbai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mumbai' AND `slug` = 'four-seasons-hotel-mumbai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mumbai' AND `slug` = 'grand-hyatt-mumbai-hotel-and-residences';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mumbai' AND `slug` = 'intercontinental-marine-drive-mumbai-by-ihg';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mumbai' AND `slug` = 'itc-maratha-mumbai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mumbai' AND `slug` = 'jw-marriott-mumbai-juhu';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mumbai' AND `slug` = 'jw-marriott-mumbai-sahar';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mumbai' AND `slug` = 'novotel-mumbai-juhu-beach';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mumbai' AND `slug` = 'radisson-blu-mumbai-international-airport';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mumbai' AND `slug` = 'sofitel-mumbai-bkc';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mumbai' AND `slug` = 'taj-lands-end-mumbai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:b' WHERE `city` = 'mumbai' AND `slug` = 'taj-santacruz-mumbai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:b' WHERE `city` = 'mumbai' AND `slug` = 'the-leela-mumbai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:b' WHERE `city` = 'mumbai' AND `slug` = 'the-oberoi-mumbai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:b' WHERE `city` = 'mumbai' AND `slug` = 'the-st-regis-mumbai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:b' WHERE `city` = 'mumbai' AND `slug` = 'the-taj-mahal-palace-mumbai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:b' WHERE `city` = 'mumbai' AND `slug` = 'the-westin-mumbai-powai-lake';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mumbai' AND `slug` = 'trident-nariman-point-mumbai';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mussoorie' AND `slug` = 'jaypee-residency-manor';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mussoorie' AND `slug` = 'jw-marriott-mussoorie-walnut-grove-resort-and-spa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mussoorie' AND `slug` = 'royal-orchid-fort-resort-mussoorie';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'mussoorie' AND `slug` = 'welcomhotel-by-itc-hotels-the-savoy';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:c' WHERE `city` = 'noida' AND `slug` = 'crown-plaza-greater-noida-by-ihg';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:b' WHERE `city` = 'pune' AND `slug` = 'conrad-pune';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:b' WHERE `city` = 'pune' AND `slug` = 'jw-marriott-hotel-pune';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:b' WHERE `city` = 'pune' AND `slug` = 'radisson-blu-hotel-pune-kharadi';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:b' WHERE `city` = 'pune' AND `slug` = 'sheraton-grand-pune-bund-garden-hotel';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:b' WHERE `city` = 'pune' AND `slug` = 'the-ritz-carlton-pune';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'pune' AND `slug` = 'the-westin-pune-koregaon-park';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'pushkar' AND `slug` = 'ananta-resort-pushkar';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'pushkar' AND `slug` = 'pushkara-resort-and-spa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'pushkar' AND `slug` = 'regenta-spa-and-resort-pushkar';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'raipur' AND `slug` = 'courtyard-by-marriott-raipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'raipur' AND `slug` = 'mayfair-lake-resort-raipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'ranthambore' AND `slug` = 'nahargarh-ranthambhore';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:b' WHERE `city` = 'ranthambore' AND `slug` = 'ranthambore-bagh-palace';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:b' WHERE `city` = 'ranthambore' AND `slug` = 'taj-sawai-ranthambore';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'ranthambore' AND `slug` = 'zana-forest-resort-ranthambore';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'rishikesh' AND `slug` = 'taj-rishikesh-resort-and-spa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'rishikesh' AND `slug` = 'the-westin-resort-and-spa-himalayas';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:c' WHERE `city` = 'shimla' AND `slug` = 'taj-theog-resort-and-spa-shimla';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:c' WHERE `city` = 'surat' AND `slug` = 'hilton-garden-inn-surat-city-centre';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:c' WHERE `city` = 'trivandrum' AND `slug` = 'hilton-garden-inn-trivandrum';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'aurika-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'chunda-palace-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:e' WHERE `city` = 'udaipur' AND `slug` = 'fairmont-udaipur-palace';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'holymont-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'hotel-lakend-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'justa-sajjangarh-resort-and-spa-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'labh-garh-palace-resort-and-spa-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'mementos-by-itc-hotels-ekaaya-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'raajsa-resort-kumbhalgarh-ihcl-seleqtions-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'raas-devigarh-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'radisson-blu-palace-resort-and-spa-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'raffles-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'ramada-by-wyndham-udaipur-resort-and-spa';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'taj-aravali-resort-and-spa-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'taj-fateh-prakash-palace-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'taj-lake-palace-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'taj-lalit-bagh-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'the-ananta-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'the-lalit-laxmi-vilas-palace-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:f' WHERE `city` = 'udaipur' AND `slug` = 'the-leela-palace-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'the-oberoi-udaivilas-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'trident-udaipur';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'udaipur-marriott-hotel';
--> statement-breakpoint
UPDATE `hotels` SET `shell_key` = 'venue:a' WHERE `city` = 'udaipur' AND `slug` = 'wyndham-grand-udaipur-fatehsagar-lake';
--> statement-breakpoint
UPDATE `blog_posts` SET `shell_key` = 'blog:a' WHERE `slug` = 'arjun-kapoor-sister-anshula-wedding-cost';
--> statement-breakpoint
UPDATE `blog_posts` SET `shell_key` = 'blog:a' WHERE `slug` = 'destination-wedding-venue-checklist';
--> statement-breakpoint
UPDATE `blog_posts` SET `shell_key` = 'blog:a' WHERE `slug` = 'new-luxury-wedding-hotels-in-india';
--> statement-breakpoint
UPDATE `blog_posts` SET `shell_key` = 'blog:a' WHERE `slug` = 'nupur-sanon-stebin-ben-wedding-cost';
--> statement-breakpoint
UPDATE `blog_posts` SET `shell_key` = 'blog:a' WHERE `slug` = 'plan-luxury-destination-wedding-like-nupur-sanon-stebin-ben';
--> statement-breakpoint
UPDATE `blog_posts` SET `shell_key` = 'blog:a' WHERE `slug` = 'questions-to-ask-destination-wedding-planner';
--> statement-breakpoint
UPDATE `blog_posts` SET `shell_key` = 'blog:b' WHERE `slug` = 'top-beachside-wedding-venues-goa';
--> statement-breakpoint
UPDATE `blog_posts` SET `shell_key` = 'blog:a' WHERE `slug` = 'top-destination-wedding-places-rajasthan';
--> statement-breakpoint
UPDATE `blog_posts` SET `shell_key` = 'blog:a' WHERE `slug` = 'traditional-vs-destination-wedding';
--> statement-breakpoint
UPDATE `blog_posts` SET `shell_key` = 'blog:a' WHERE `slug` = 'vijay-rashmika-udaipur-wedding-cost';
--> statement-breakpoint
UPDATE `blog_posts` SET `shell_key` = 'blog:a' WHERE `slug` = 'when-to-book-a-wedding-venue';
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'agra', 'Luxury Wedding Hotels in Agra | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '8', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'agra');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'ahmedabad', 'Luxury Wedding Hotels in Ahmedabad | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '28', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'ahmedabad');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'ajabgarh', 'Luxury Wedding Hotels in Ajabgarh | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '70', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'ajabgarh');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'ajmer', 'Luxury Wedding Hotels in Ajmer | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '32', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'ajmer');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'amritsar', 'Luxury Wedding Hotels in Amritsar | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '31', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'amritsar');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'andaman', 'Luxury Wedding Hotels in Andaman | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '69', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'andaman');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'barwara', 'Luxury Wedding Hotels in Barwara | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '34', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'barwara');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'bengal', 'Luxury Wedding Hotels in Bengal | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '23', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'bengal');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'bengaluru', 'Luxury Wedding Hotels in Bengaluru | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '17', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'bengaluru');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'bhopal', 'Luxury Wedding Hotels in Bhopal | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '40', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'bhopal');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'bhubaneswar', 'Luxury Wedding Hotels in Bhubaneswar | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '67', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'bhubaneswar');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'chandigarh', 'Luxury Wedding Hotels in Chandigarh | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '13', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'chandigarh');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'chennai', 'Luxury Wedding Hotels in Chennai | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '18', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'chennai');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'daman', 'Luxury Wedding Hotels in Daman | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '46', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'daman');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'dehradun', 'Luxury Wedding Hotels in Dehradun | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '15', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'dehradun');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'delhi-ncr', 'Luxury Wedding Hotels in Delhi NCR | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '4', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'delhi-ncr');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'goa', 'Luxury Wedding Hotels in Goa | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '7', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'goa');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'guwahati', 'Luxury Wedding Hotels in Guwahati | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '36', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'guwahati');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'gwalior', 'Luxury Wedding Hotels in Gwalior | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '43', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'gwalior');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'haridwar', 'Luxury Wedding Hotels in Haridwar | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '44', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'haridwar');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'hyderabad', 'Luxury Wedding Hotels in Hyderabad | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '27', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'hyderabad');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'indore', 'Luxury Wedding Hotels in Indore | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '47', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'indore');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'jaipur', 'Luxury Wedding Hotels in Jaipur | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '5', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'jaipur');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'jaisalmer', 'Luxury Wedding Hotels in Jaisalmer | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '9', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'jaisalmer');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'jim-corbett', 'Luxury Wedding Hotels in Jim Corbett | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '12', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'jim-corbett');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'jodhpur', 'Luxury Wedding Hotels in Jodhpur | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '6', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'jodhpur');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'karjat', 'Luxury Wedding Hotels in Karjat | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '71', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'karjat');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'karnal', 'Luxury Wedding Hotels in Karnal | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '55', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'karnal');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'karnataka', 'Luxury Wedding Hotels in Karnataka | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '24', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'karnataka');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'kasauli', 'Luxury Wedding Hotels in Kasauli | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '51', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'kasauli');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'kerala', 'Luxury Wedding Hotels in Kerala | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '21', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'kerala');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'khimsar', 'Luxury Wedding Hotels in Khimsar | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '56', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'khimsar');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'khopoli', 'Luxury Wedding Hotels in Khopoli | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '72', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'khopoli');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'kochi', 'Luxury Wedding Hotels in Kochi | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '19', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'kochi');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'kolkata', 'Luxury Wedding Hotels in Kolkata | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '25', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'kolkata');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'kovalam', 'Luxury Wedding Hotels in Kovalam | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '20', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'kovalam');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'lakshadweep', 'Luxury Wedding Hotels in Lakshadweep | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '68', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'lakshadweep');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'lonavala', 'Luxury Wedding Hotels in Lonavala | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '73', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'lonavala');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'lucknow', 'Luxury Wedding Hotels in Lucknow | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '1', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'lucknow');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'mumbai', 'Luxury Wedding Hotels in Mumbai | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '26', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'mumbai');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'mussoorie', 'Luxury Wedding Hotels in Mussoorie | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '10', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'mussoorie');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'noida', 'Luxury Wedding Hotels in Noida | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '2', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'noida');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'pune', 'Luxury Wedding Hotels in Pune | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '16', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'pune');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'pushkar', 'Luxury Wedding Hotels in Pushkar | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '30', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'pushkar');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'raipur', 'Luxury Wedding Hotels in Raipur | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '35', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'raipur');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'ranthambore', 'Luxury Wedding Hotels in Ranthambore | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '33', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'ranthambore');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'rishikesh', 'Luxury Wedding Hotels in Rishikesh | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '11', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'rishikesh');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'sakleshpur', 'Luxury Wedding Hotels in Sakleshpur | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '42', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'sakleshpur');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'shimla', 'Luxury Wedding Hotels in Shimla | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '14', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'shimla');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'surat', 'Luxury Wedding Hotels in Surat | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '29', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'surat');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'trivandrum', 'Luxury Wedding Hotels in Trivandrum | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '22', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'trivandrum');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'udaipur', 'Luxury Wedding Hotels in Udaipur | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '3', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'udaipur');
--> statement-breakpoint
INSERT INTO `city_pages` (`city`, `seo_title`, `meta_description`, `city_id`, `shell_key`)
SELECT 'vrindavan', 'Luxury Wedding Hotels in Vrindavan | Viraaya Weddings', 'Browse luxury destination wedding hotels and venues across India. Filter by city, rooms and guest capacity.', '41', 'city'
WHERE NOT EXISTS (SELECT 1 FROM `city_pages` WHERE `city` = 'vrindavan');
