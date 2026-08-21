-- Backfills the listing data the venue cards need, and records which venues
-- each city index page shows.
--
-- city_label holds the full location ("Agra, India") as the nearby-venues strip
-- prints it; city cards show the part before the comma.
--
-- The city listing is a curated subset (Delhi NCR has 25 venue pages but lists
-- 12), so it is stored rather than regenerated from the hotels table.
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Rob4BYlR1qTHbnZQMalclcoeVRhhluhNjMzaEjAr.png', `city_label` = 'Agra, India', `nearby_slugs` = '["agra/the-oberoi-amarvilas-agra", "agra/itc-mughal-agra", "agra/jaypee-palace-hotel-and-convention-centre-agra"]'
WHERE `city` = 'agra' AND `slug` = 'courtyard-by-marriott-agra' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/5wvjuaSJ5XAW36KphI6PCG7WEUDmn8YhvY2k5MPs.png', `city_label` = 'Agra, India', `nearby_slugs` = '["agra/the-oberoi-amarvilas-agra", "agra/itc-mughal-agra", "agra/jaypee-palace-hotel-and-convention-centre-agra"]'
WHERE `city` = 'agra' AND `slug` = 'doubletree-by-hilton-hotel-agra' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/h1Z8z1uFUxEDbat7mTLug8WnklTWR82L5pQB1OCk.jpg', `city_label` = 'Agra, India', `nearby_slugs` = '["agra/the-oberoi-amarvilas-agra", "agra/jaypee-palace-hotel-and-convention-centre-agra", "agra/taj-view-agra"]'
WHERE `city` = 'agra' AND `slug` = 'itc-mughal-agra' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/LemBaHF1SXhvTwlEIZ0K3X9FVLUIeVLTEcOSmkK2.jpg', `city_label` = 'Agra, India', `nearby_slugs` = '["agra/the-oberoi-amarvilas-agra", "agra/itc-mughal-agra", "agra/taj-view-agra"]'
WHERE `city` = 'agra' AND `slug` = 'jaypee-palace-hotel-and-convention-centre-agra' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/5wYd5zvBzwnChemd1aQ74zYb8iPsxb1VdtNOrWVl.png', `city_label` = 'Agra, India', `nearby_slugs` = '["agra/the-oberoi-amarvilas-agra", "agra/itc-mughal-agra", "agra/jaypee-palace-hotel-and-convention-centre-agra"]'
WHERE `city` = 'agra' AND `slug` = 'laxmi-vilas-palace-bharatpur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/lIU8Jnkz1TGzks0SCqQr30GaA6kprccg8XLghMSq.png', `city_label` = 'Agra, India', `nearby_slugs` = '["agra/the-oberoi-amarvilas-agra", "agra/itc-mughal-agra", "agra/jaypee-palace-hotel-and-convention-centre-agra"]'
WHERE `city` = 'agra' AND `slug` = 'taj-agra' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/5tuthvw0OvrOTUpHoxJnjdigkdGzIOQ5c2xQhlXL.png', `city_label` = 'Agra, India', `nearby_slugs` = '["agra/the-oberoi-amarvilas-agra", "agra/itc-mughal-agra", "agra/jaypee-palace-hotel-and-convention-centre-agra"]'
WHERE `city` = 'agra' AND `slug` = 'taj-view-agra' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/N0bYlSeX7fxfGUbIuYKzfgisgureydBOi32snCAJ.jpg', `city_label` = 'Agra, India', `nearby_slugs` = '["agra/itc-mughal-agra", "agra/jaypee-palace-hotel-and-convention-centre-agra", "agra/taj-view-agra"]'
WHERE `city` = 'agra' AND `slug` = 'the-oberoi-amarvilas-agra' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/8M5E6GxIJHroF4ndMmk5pMapMvU4qW8LUXYx2apM.png', `city_label` = 'Agra, India', `nearby_slugs` = '["agra/the-oberoi-amarvilas-agra", "agra/itc-mughal-agra", "agra/jaypee-palace-hotel-and-convention-centre-agra"]'
WHERE `city` = 'agra' AND `slug` = 'trident-agra' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Qq1yMo6pCHzNsLgoeL2wA35zjyDhsHcjvmyKuUUA.png', `city_label` = 'Ahmedabad, India', `nearby_slugs` = '["ahmedabad/itc-narmada-a-luxury-collection-hotel-ahmedabad", "ahmedabad/novotel-ahmedabad", "ahmedabad/gateway-ahmedabad-sindhu-bhavan"]'
WHERE `city` = 'ahmedabad' AND `slug` = 'doubletree-by-hilton-ahmedabad' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/6992uVmQHbRttVbqV4RUq4kUq6U0Fl8bHCb2hSZh.png', `city_label` = 'Ahmedabad, India', `nearby_slugs` = '["ahmedabad/itc-narmada-a-luxury-collection-hotel-ahmedabad", "ahmedabad/novotel-ahmedabad", "ahmedabad/doubletree-by-hilton-ahmedabad"]'
WHERE `city` = 'ahmedabad' AND `slug` = 'gateway-ahmedabad-sindhu-bhavan' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/M45QXerKKJDiL8uOISdbet3Vu1MPZ5bGQyQSugvx.png', `city_label` = 'Ahmedabad, India', `nearby_slugs` = '["ahmedabad/novotel-ahmedabad", "ahmedabad/gateway-ahmedabad-sindhu-bhavan", "ahmedabad/doubletree-by-hilton-ahmedabad"]'
WHERE `city` = 'ahmedabad' AND `slug` = 'itc-narmada-a-luxury-collection-hotel-ahmedabad' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/iXP3AdylmXLuipEfrFMgIhrL6Oox4k9iVFMArCue.png', `city_label` = 'Ahmedabad, India', `nearby_slugs` = '["ahmedabad/itc-narmada-a-luxury-collection-hotel-ahmedabad", "ahmedabad/gateway-ahmedabad-sindhu-bhavan", "ahmedabad/doubletree-by-hilton-ahmedabad"]'
WHERE `city` = 'ahmedabad' AND `slug` = 'novotel-ahmedabad' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Xi9Pt59VmPd3d6eXwW0ZjbqE7iSV3qQ19sIl6ORT.png', `city_label` = 'Ajmer, India', `nearby_slugs` = '[]'
WHERE `city` = 'ajmer' AND `slug` = 'pratap-mahal-ajmer-an-ihcl-seleqtions-hotel' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/eVhv9IRjKCZpc7bC7Icf1WvjFyX8jVwfqEouD0ao.png', `city_label` = 'Amritsar, India', `nearby_slugs` = '["amritsar/welcomhotel-by-itc-hotels-amritsar", "amritsar/taj-swarna-amritsar", "amritsar/hyatt-regency-amritsar-hotel-and-spa"]'
WHERE `city` = 'amritsar' AND `slug` = 'holiday-inn-amritsar-ranjit-avenue-by-ihg' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/4BM5mxc2vpEzHK9csbettDl6ZMZXQ3LehwALvFAe.png', `city_label` = 'Amritsar, India', `nearby_slugs` = '["amritsar/welcomhotel-by-itc-hotels-amritsar", "amritsar/taj-swarna-amritsar", "amritsar/holiday-inn-amritsar-ranjit-avenue-by-ihg"]'
WHERE `city` = 'amritsar' AND `slug` = 'hyatt-regency-amritsar-hotel-and-spa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/PEF0nS6H38y8fh6ZrsWEp10FVX6kCPBUwEXU2RLV.png', `city_label` = 'Amritsar, India', `nearby_slugs` = '["amritsar/welcomhotel-by-itc-hotels-amritsar", "amritsar/hyatt-regency-amritsar-hotel-and-spa", "amritsar/holiday-inn-amritsar-ranjit-avenue-by-ihg"]'
WHERE `city` = 'amritsar' AND `slug` = 'taj-swarna-amritsar' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/dfLpXPpD4k2g1Jz8Bt13FCDCsAVDroibqic3E5Fw.png', `city_label` = 'Amritsar, India', `nearby_slugs` = '["amritsar/taj-swarna-amritsar", "amritsar/hyatt-regency-amritsar-hotel-and-spa", "amritsar/holiday-inn-amritsar-ranjit-avenue-by-ihg"]'
WHERE `city` = 'amritsar' AND `slug` = 'welcomhotel-by-itc-hotels-amritsar' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/JCiMwQ6ZHA0uDjqUWgCq4KLc257preIbnLGHRyvo.jpg', `city_label` = 'Barwara, India', `nearby_slugs` = '[]'
WHERE `city` = 'barwara' AND `slug` = 'six-senses-fort-barwara' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/sfn1vZemYUflZbtpeD8wOQqxX1xXvnvkpxS1AFbX.jpg', `city_label` = 'Bengal, India', `nearby_slugs` = '[]'
WHERE `city` = 'bengal' AND `slug` = 'itc-royal-bengal' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Iicn1YM6b8yYJ7dFdQBOhNK31ryYtuDIVpVSQ1Mj.png', `city_label` = 'Bengaluru, India', `nearby_slugs` = '["bengaluru/the-leela-palace-bengaluru", "bengaluru/jw-marriott-bengaluru-prestige-golfshire-resort-and-spa", "bengaluru/the-ritz-carlton-bangalore"]'
WHERE `city` = 'bengaluru' AND `slug` = 'hilton-bangalore-embassy-golflinks' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/khscZeEdqEtsAj5XXyCnSEPRZloieYTjiC3KEqV6.png', `city_label` = 'Bengaluru, India', `nearby_slugs` = '["bengaluru/the-leela-palace-bengaluru", "bengaluru/jw-marriott-bengaluru-prestige-golfshire-resort-and-spa", "bengaluru/the-ritz-carlton-bangalore"]'
WHERE `city` = 'bengaluru' AND `slug` = 'hilton-garden-inn-bengaluru-embassy-manyata-business-park' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/PXOP3yPzTTQds5qIe1HWUlqnrLVAs8V1ergXjcOq.jpg', `city_label` = 'Bengaluru, India', `nearby_slugs` = '["bengaluru/the-leela-palace-bengaluru", "bengaluru/jw-marriott-bengaluru-prestige-golfshire-resort-and-spa", "bengaluru/the-ritz-carlton-bangalore"]'
WHERE `city` = 'bengaluru' AND `slug` = 'itc-gardenia-bengaluru' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/GZWSOksQ1xY8qpXaQSUcg8Q8qWDdHWWGGBP1xCi2.png', `city_label` = 'Bengaluru, India', `nearby_slugs` = '["bengaluru/the-leela-palace-bengaluru", "bengaluru/jw-marriott-bengaluru-prestige-golfshire-resort-and-spa", "bengaluru/the-ritz-carlton-bangalore"]'
WHERE `city` = 'bengaluru' AND `slug` = 'itc-windsor-a-luxury-collection-hotel-bengaluru' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/sBu6N2QPptI81dHRo6eA84ojgCvxiRLpSOb4pqTe.jpg', `city_label` = 'Bengaluru, India', `nearby_slugs` = '["bengaluru/the-leela-palace-bengaluru", "bengaluru/the-ritz-carlton-bangalore", "bengaluru/itc-gardenia-bengaluru"]'
WHERE `city` = 'bengaluru' AND `slug` = 'jw-marriott-bengaluru-prestige-golfshire-resort-and-spa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/bVsQyubgfvC1w4c6RsqAr9E5VJf03PrJiyMbQqwu.png', `city_label` = 'Bengaluru, India', `nearby_slugs` = '["bengaluru/the-leela-palace-bengaluru", "bengaluru/jw-marriott-bengaluru-prestige-golfshire-resort-and-spa", "bengaluru/the-ritz-carlton-bangalore"]'
WHERE `city` = 'bengaluru' AND `slug` = 'radisson-blu-hotel-bengaluru' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/SPDKeLcWjaCsafepSGSllBk1YrIw5BGBVg2tUaR4.png', `city_label` = 'Bengaluru, India', `nearby_slugs` = '["bengaluru/the-leela-palace-bengaluru", "bengaluru/jw-marriott-bengaluru-prestige-golfshire-resort-and-spa", "bengaluru/the-ritz-carlton-bangalore"]'
WHERE `city` = 'bengaluru' AND `slug` = 'shangri-la-bengaluru' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/tmGwldYWQjcv1FG49POpjK1nkk8rYpEx72fUnM3F.jpg', `city_label` = 'Bengaluru, India', `nearby_slugs` = '["bengaluru/the-leela-palace-bengaluru", "bengaluru/jw-marriott-bengaluru-prestige-golfshire-resort-and-spa", "bengaluru/the-ritz-carlton-bangalore"]'
WHERE `city` = 'bengaluru' AND `slug` = 'taj-west-end-bengaluru' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/p8rjHm5DwmefsfteDKpCuv4LPDaMgWNRvMWkaSgt.png', `city_label` = 'Bengaluru, India', `nearby_slugs` = '["bengaluru/the-leela-palace-bengaluru", "bengaluru/jw-marriott-bengaluru-prestige-golfshire-resort-and-spa", "bengaluru/the-ritz-carlton-bangalore"]'
WHERE `city` = 'bengaluru' AND `slug` = 'the-leela-bhartiya-city-bengaluru' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/RVqE1nXAccleBDLE06YQ2pbVvaNwWdYdd1zJzQYk.jpg', `city_label` = 'Bengaluru, India', `nearby_slugs` = '["bengaluru/jw-marriott-bengaluru-prestige-golfshire-resort-and-spa", "bengaluru/the-ritz-carlton-bangalore", "bengaluru/itc-gardenia-bengaluru"]'
WHERE `city` = 'bengaluru' AND `slug` = 'the-leela-palace-bengaluru' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/pPb60D3fIYRxIHRqDQCFImiiYQObSukrpeIzimbB.jpg', `city_label` = 'Bengaluru, India', `nearby_slugs` = '["bengaluru/the-leela-palace-bengaluru", "bengaluru/jw-marriott-bengaluru-prestige-golfshire-resort-and-spa", "bengaluru/itc-gardenia-bengaluru"]'
WHERE `city` = 'bengaluru' AND `slug` = 'the-ritz-carlton-bangalore' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/9cD1YLCcHEuvCEPyAMl8s9KeKk8LJ7Umb9XIC0Qu.png', `city_label` = 'Bhopal, India', `nearby_slugs` = '["bhopal/taj-lakefront-bhopal", "bhopal/radisson-hotel-bhopal"]'
WHERE `city` = 'bhopal' AND `slug` = 'courtyard-by-marriott-bhopal' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Qf5wVYyAj0f9cCvd7ZaAW9jGFh5f09LG0fdFptow.png', `city_label` = 'Bhopal, India', `nearby_slugs` = '["bhopal/taj-lakefront-bhopal", "bhopal/courtyard-by-marriott-bhopal"]'
WHERE `city` = 'bhopal' AND `slug` = 'radisson-hotel-bhopal' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/H1vmC4us0ZQkAItZpSnLxXuoj7zQUIJ62FqOidMw.png', `city_label` = 'Bhopal, India', `nearby_slugs` = '["bhopal/courtyard-by-marriott-bhopal", "bhopal/radisson-hotel-bhopal"]'
WHERE `city` = 'bhopal' AND `slug` = 'taj-lakefront-bhopal' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/zSQ3HG4TuDSANIPiXxx3oT9qeReqA7d4N9vvsjJW.jpg', `city_label` = 'Chandigarh, India', `nearby_slugs` = '["chandigarh/jw-marriott-hotel-chandigarh", "chandigarh/the-oberoi-sukhvilas", "chandigarh/taj-chandigarh"]'
WHERE `city` = 'chandigarh' AND `slug` = 'hyatt-regency-chandigarh' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/1fs2mbCr5QCU9gltYwUcrCJrKhedac3qJl5wPlzX.jpg', `city_label` = 'Chandigarh, India', `nearby_slugs` = '["chandigarh/hyatt-regency-chandigarh", "chandigarh/the-oberoi-sukhvilas", "chandigarh/taj-chandigarh"]'
WHERE `city` = 'chandigarh' AND `slug` = 'jw-marriott-hotel-chandigarh' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/QtPQ5Boh54yuzQMBp3CcxbPHoK3mDMNkLoez43ty.png', `city_label` = 'Chandigarh, India', `nearby_slugs` = '["chandigarh/hyatt-regency-chandigarh", "chandigarh/jw-marriott-hotel-chandigarh", "chandigarh/the-oberoi-sukhvilas"]'
WHERE `city` = 'chandigarh' AND `slug` = 'novotel-chandigarh-tribune-chowk' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/C6uOYemMOzbOHaL6I57tMQeP1PQrMBw4dNQCsnBV.png', `city_label` = 'Chandigarh, India', `nearby_slugs` = '["chandigarh/hyatt-regency-chandigarh", "chandigarh/jw-marriott-hotel-chandigarh", "chandigarh/the-oberoi-sukhvilas"]'
WHERE `city` = 'chandigarh' AND `slug` = 'taj-chandigarh' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/UBHPQO6YiB1ifpcAJZLqvRc22y6mk8bR5hXKnq6f.jpg', `city_label` = 'Chandigarh, India', `nearby_slugs` = '["chandigarh/hyatt-regency-chandigarh", "chandigarh/jw-marriott-hotel-chandigarh", "chandigarh/taj-chandigarh"]'
WHERE `city` = 'chandigarh' AND `slug` = 'the-oberoi-sukhvilas' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/F9sVtst2LdojdGS984hUQdVU3yVymF9hh1BaSK5W.png', `city_label` = 'Chennai, India', `nearby_slugs` = '["chennai/itc-grand-chola-chennai", "chennai/the-leela-palace-chennai", "chennai/le-royal-meridien-chennai"]'
WHERE `city` = 'chennai' AND `slug` = 'hilton-chennai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Cp7OpJ4zYyyjxyavHrN6Zrk9UOLniakRjAHySk5Y.png', `city_label` = 'Chennai, India', `nearby_slugs` = '["chennai/itc-grand-chola-chennai", "chennai/the-leela-palace-chennai", "chennai/le-royal-meridien-chennai"]'
WHERE `city` = 'chennai' AND `slug` = 'hyatt-regency-chennai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/dx6ALxaIVhiDyIcmILGM1D80d8fjDAFsrFbY2H51.jpg', `city_label` = 'Chennai, India', `nearby_slugs` = '["chennai/the-leela-palace-chennai", "chennai/le-royal-meridien-chennai", "chennai/taj-connemara-chennai"]'
WHERE `city` = 'chennai' AND `slug` = 'itc-grand-chola-chennai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/xBWxxvrAfjvF6aEICvQ5NUTjOLtWFfoDLqMsL76o.jpg', `city_label` = 'Chennai, India', `nearby_slugs` = '["chennai/itc-grand-chola-chennai", "chennai/the-leela-palace-chennai", "chennai/taj-connemara-chennai"]'
WHERE `city` = 'chennai' AND `slug` = 'le-royal-meridien-chennai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/vk4avVrQgSdUjHv9cYTMcYiMLII9sGt2Jg64JmZk.jpg', `city_label` = 'Chennai, India', `nearby_slugs` = '["chennai/itc-grand-chola-chennai", "chennai/the-leela-palace-chennai", "chennai/le-royal-meridien-chennai"]'
WHERE `city` = 'chennai' AND `slug` = 'novotel-chennai-omr' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/r9e6x8KCS21wjZCpZNO0c6ecIPYfp99xxQev3l5S.png', `city_label` = 'Chennai, India', `nearby_slugs` = '["chennai/itc-grand-chola-chennai", "chennai/the-leela-palace-chennai", "chennai/le-royal-meridien-chennai"]'
WHERE `city` = 'chennai' AND `slug` = 'taj-club-house-chennai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/gpHjAAeD0fJqkSy4TFdFJcnWLMgEE1Dk9uQpiY9O.png', `city_label` = 'Chennai, India', `nearby_slugs` = '["chennai/itc-grand-chola-chennai", "chennai/the-leela-palace-chennai", "chennai/le-royal-meridien-chennai"]'
WHERE `city` = 'chennai' AND `slug` = 'taj-connemara-chennai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/B7WZDKqeNmmSZujm5ZzvBcIhyKf1PfARJ8M28X9N.jpg', `city_label` = 'Chennai, India', `nearby_slugs` = '["chennai/itc-grand-chola-chennai", "chennai/le-royal-meridien-chennai", "chennai/taj-connemara-chennai"]'
WHERE `city` = 'chennai' AND `slug` = 'the-leela-palace-chennai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/OOFH8awFcmFgUDRUHuv27gcNfjRvVaY5vogUsj7s.png', `city_label` = 'Daman, India', `nearby_slugs` = '["daman/silver-waves-resort-and-spa-daman", "daman/the-deltin-daman"]'
WHERE `city` = 'daman' AND `slug` = 'praveg-lake-resort-daman' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/SZaoiN7nW5I85iqmIV7NSkwcfJ7x0lYwIPIC3azS.png', `city_label` = 'Daman, India', `nearby_slugs` = '["daman/praveg-lake-resort-daman", "daman/the-deltin-daman"]'
WHERE `city` = 'daman' AND `slug` = 'silver-waves-resort-and-spa-daman' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Kbx7cQTfBHO3X6KmqGfCk65Km8ykU71PposgMhMw.png', `city_label` = 'Daman, India', `nearby_slugs` = '["daman/silver-waves-resort-and-spa-daman", "daman/praveg-lake-resort-daman"]'
WHERE `city` = 'daman' AND `slug` = 'the-deltin-daman' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/b2AJVYKGc30kz5pQzjQ8oMkIGAAwktSSKmfuqTJS.jpg', `city_label` = 'Dehradun, India', `nearby_slugs` = '["dehradun/le-meridien-dehradun-resort-and-spa", "dehradun/taj-mussoorie-foothills-dehradun"]'
WHERE `city` = 'dehradun' AND `slug` = 'hyatt-regency-dehradun-resort-and-spa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/q1k9ErbrtlsUTLbgoXd58KuxMwxj6IWowuVfw9bF.jpg', `city_label` = 'Dehradun, India', `nearby_slugs` = '["dehradun/hyatt-regency-dehradun-resort-and-spa", "dehradun/taj-mussoorie-foothills-dehradun"]'
WHERE `city` = 'dehradun' AND `slug` = 'le-meridien-dehradun-resort-and-spa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/3AoqFvXteKbKgeMwHoNNUQsMcF8JGlCJImlokQzk.jpg', `city_label` = 'Dehradun, India', `nearby_slugs` = '["dehradun/hyatt-regency-dehradun-resort-and-spa", "dehradun/le-meridien-dehradun-resort-and-spa"]'
WHERE `city` = 'dehradun' AND `slug` = 'taj-mussoorie-foothills-dehradun' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/DLYjde3asNVSDv9aVSyXJnYTkiqCQqjvHuTcOm66.png', `city_label` = 'Delhi NCR, India', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'andaz-new-delhi' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/4QJ1ub3xo0Ig2Qq6INhkssaVfDDOZtXMKlMWzVbI.png', `city_label` = 'Delhi NCR, India', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'courtyard-by-marriott-aravali-resort-delhi-ncr' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/XgFYG2SpdGx2RQU2G1nh7vy9iXB55Sqt2dw10rmk.png', `city_label` = 'Delhi NCR, India', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'grand-hyatt-gurgaon' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/sS0MfQSPw3ggScPVyiqzq6T38hzkuhduP3bphqkg.png', `city_label` = 'Delhi NCR, India', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'heritage-village-resort-and-spa-manesar' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/zvAtFdjJJvrNs4xY5saYLLIqMCVJvBKpanrW8uvr.jpg', `city_label` = 'Delhi NCR, India', `nearby_slugs` = '["delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon", "delhi-ncr/courtyard-by-marriott-aravali-resort-delhi-ncr"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'itc-grand-bharat-delhi-ncr' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/nmc4zXO6cpGRlmIREliND3td4wHQHHiFqrIQB3vi.png', `city_label` = 'Delhi NCR, India', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'itc-maurya-a-luxury-collection-hotel-new-delhi' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/C4vI2VyI8skODVqdRTKC9hFvBYioXB6amitCBEof.png', `city_label` = 'Delhi NCR, India', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'jaypee-greens-golf-and-spa-resort-delhi-ncr' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/WaareQMcMAeaAZk1GeGjdiQfjxP7Hr9hJVUjCvXU.png', `city_label` = 'Delhi NCR, India', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'jw-marriott-hotel-new-delhi-aerocity' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/LG1aRjb4oT1OzcDkN1HEHAYOMSDdKWhqVdxZFw5m.png', `city_label` = 'Delhi NCR, India', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'karma-lakelands-gurugram' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/al1iyQ7hVKtAwSHRdAvHn4nSal5IcfFIq0wLoi82.png', `city_label` = 'Delhi NCR, India', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'pullman-new-delhi-aerocity' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/AG9p8Xq9592CDadKd29pmw5cFyiEVbxHzeOjUzkO.png', `city_label` = 'Delhi NCR, India', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'radisson-blu-plaza-hotel-delhi-airport' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/HXdLZufubZId7opah6tTGoTNQPsRogziQTA4Xh5o.png', `city_label` = 'Delhi NCR, India', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'resort-country-club-manesar' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'sheraton-new-delhi-hotel' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/qeE8M6qcyRcaF4VbuwnR1AkirM5sIAgYgOFYQo1j.png', `city_label` = 'Delhi NCR, India', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon", "delhi-ncr/courtyard-by-marriott-aravali-resort-delhi-ncr"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'taj-damdama-lake-resort-and-spa-gurugram' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'taj-mansingh-new-delhi' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'taj-palace-new-delhi' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'taj-surajkund-resort-and-spa-delhi-ncr' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'the-lalit-mangar-delhi-ncr' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'the-leela-ambience-convention-hotel-gurugram' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'the-leela-palace-new-delhi' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'the-oberoi-gurgaon' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'the-roseate-new-delhi' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/t6DmtmCYSSRfLbxVPhRE7EwDLbp6DGn2XgLmsRdZ.png', `city_label` = 'Delhi NCR, India', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/courtyard-by-marriott-aravali-resort-delhi-ncr"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'the-westin-sohna-resort-and-spa-gurgaon' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'trident-gurgaon' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["delhi-ncr/itc-grand-bharat-delhi-ncr", "delhi-ncr/taj-damdama-lake-resort-and-spa-gurugram", "delhi-ncr/the-westin-sohna-resort-and-spa-gurgaon"]'
WHERE `city` = 'delhi-ncr' AND `slug` = 'welcomhotel-by-itc-hotels-delhi' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Rbmaom3HG5k6PNzkg7bfqq4US4esyxIJ8bCLmInW.jpg', `city_label` = 'Goa, India', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/holiday-inn-resort-goa", "goa/taj-exotica-resort-and-spa-goa"]'
WHERE `city` = 'goa' AND `slug` = 'alila-diwa-goa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/H9OWQryQBNiSdPcf8ILXFPHDB6S3zzuOrblIpaxG.png', `city_label` = 'Goa, India', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/alila-diwa-goa", "goa/holiday-inn-resort-goa"]'
WHERE `city` = 'goa' AND `slug` = 'azaya-beach-resort-goa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/KBvNQGrnrTRCGqAEDBP2Bpw1ac5nYk3GfgVYC3nq.jpg', `city_label` = 'Goa, India', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/alila-diwa-goa", "goa/holiday-inn-resort-goa"]'
WHERE `city` = 'goa' AND `slug` = 'caravela-beach-resort' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/h9Hyv21lji11XAE4QbieivtZ9S1W5kJox6vb7xuo.jpg', `city_label` = 'Goa, India', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/alila-diwa-goa", "goa/holiday-inn-resort-goa"]'
WHERE `city` = 'goa' AND `slug` = 'grand-hyatt-goa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/BBGzAHGGpnjdw2hCyi841LPJa95SfoQMIakwxDRd.jpg', `city_label` = 'Goa, India', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/alila-diwa-goa", "goa/taj-exotica-resort-and-spa-goa"]'
WHERE `city` = 'goa' AND `slug` = 'holiday-inn-resort-goa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/zUzQ7gG1yrxaf1t9SEVO2IpP8Fvkidf1Ke2WsfGt.png', `city_label` = 'Goa, India', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/alila-diwa-goa", "goa/holiday-inn-resort-goa"]'
WHERE `city` = 'goa' AND `slug` = 'itc-grand-goa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/1qgHAKRPZ0QynpH1LqSQsBLrKkyzzFZqOJHYFk16.jpg', `city_label` = 'Goa, India', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/alila-diwa-goa", "goa/holiday-inn-resort-goa"]'
WHERE `city` = 'goa' AND `slug` = 'jw-marriott-goa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/qqfSHddcu6qXmrEc58UsmYb7F6GqDw4bovcC0yUs.png', `city_label` = 'Goa, India', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/alila-diwa-goa", "goa/holiday-inn-resort-goa"]'
WHERE `city` = 'goa' AND `slug` = 'planet-hollywood-beach-resort-goa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/DCkEhODAskFbw4I5eQdSC4lZHTU1PUW8GcCp8WYG.png', `city_label` = 'Goa, India', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/alila-diwa-goa", "goa/holiday-inn-resort-goa"]'
WHERE `city` = 'goa' AND `slug` = 'radisson-blu-resort-goa-cavelossim-beach' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/xi5fSeC2Jtb2hB8eoSpZZ6EZxjn1xACp4KytAIra.png', `city_label` = 'Goa, India', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/alila-diwa-goa", "goa/holiday-inn-resort-goa"]'
WHERE `city` = 'goa' AND `slug` = 'taj-cidade-de-goa-heritage-goa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/c1KOTTHwKaHlAIS6Yc2qDaSDAbqrLVU4F6Fg5Xvs.png', `city_label` = 'Goa, India', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/alila-diwa-goa", "goa/holiday-inn-resort-goa"]'
WHERE `city` = 'goa' AND `slug` = 'taj-cidade-de-goa-horizon-goa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/ATt1Ual1WkVQogCdHNa7c8SxqrfqcrYIyztopXrX.jpg', `city_label` = 'Goa, India', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/alila-diwa-goa", "goa/holiday-inn-resort-goa"]'
WHERE `city` = 'goa' AND `slug` = 'taj-exotica-resort-and-spa-goa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/alila-diwa-goa", "goa/holiday-inn-resort-goa"]'
WHERE `city` = 'goa' AND `slug` = 'taj-fort-aguada-resort-and-spa-goa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/alila-diwa-goa", "goa/holiday-inn-resort-goa"]'
WHERE `city` = 'goa' AND `slug` = 'taj-holiday-village-resort-and-spa-goa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/alila-diwa-goa", "goa/holiday-inn-resort-goa"]'
WHERE `city` = 'goa' AND `slug` = 'the-lalit-golf-and-spa-resort-goa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/qMIiHZJbgQNWd1XDZuV1jQbsEJQK6BuecZxvz0sT.jpg', `city_label` = 'Goa, India', `nearby_slugs` = '["goa/alila-diwa-goa", "goa/holiday-inn-resort-goa", "goa/taj-exotica-resort-and-spa-goa"]'
WHERE `city` = 'goa' AND `slug` = 'the-st-regis-goa-resort' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/alila-diwa-goa", "goa/holiday-inn-resort-goa"]'
WHERE `city` = 'goa' AND `slug` = 'the-zuri-white-sands-goa-resort-and-casino' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/86qXi7kzbuwiVPRF5S5a4sh0HIacTgtRmeysQtM2.jpg', `city_label` = 'Goa, India', `nearby_slugs` = '["goa/the-st-regis-goa-resort", "goa/alila-diwa-goa", "goa/holiday-inn-resort-goa"]'
WHERE `city` = 'goa' AND `slug` = 'w-goa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/cRlQaCA1j68jMpgCpZtHovhFkXZSK6Zc7YbT0DF5.png', `city_label` = 'Guwahati, India', `nearby_slugs` = '["guwahati/radisson-blu-hotel-guwahati"]'
WHERE `city` = 'guwahati' AND `slug` = 'mayfair-spring-valley-resort-guwahati' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/1LtisLiC7Qb3NnYLlGyGowddCqRH7CWAhMyEKPSV.png', `city_label` = 'Guwahati, India', `nearby_slugs` = '["guwahati/mayfair-spring-valley-resort-guwahati"]'
WHERE `city` = 'guwahati' AND `slug` = 'radisson-blu-hotel-guwahati' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/uBPNoXSbbFST24BlOdBUCa2W63ZiTPxYzYpQ0CQT.png', `city_label` = 'Gwalior, India', `nearby_slugs` = '[]'
WHERE `city` = 'gwalior' AND `slug` = 'taj-usha-kiran-palace-gwalior' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/bPfhcBtp9qBwgp9iZ71HSSacYo1dAhZwPM48hPKa.png', `city_label` = 'Hyderabad, India', `nearby_slugs` = '["hyderabad/taj-falaknuma-palace-hyderabad", "hyderabad/hyderabad-marriott-hotel-and-convention-centre", "hyderabad/le-meridien-hyderabad"]'
WHERE `city` = 'hyderabad' AND `slug` = 'hyatt-hyderabad-gachibowli' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/kM27xQ0bVpoXAmpYOxFb9xDnhSFQPTT5abpcfdnZ.png', `city_label` = 'Hyderabad, India', `nearby_slugs` = '["hyderabad/taj-falaknuma-palace-hyderabad", "hyderabad/le-meridien-hyderabad", "hyderabad/the-park-hyderabad"]'
WHERE `city` = 'hyderabad' AND `slug` = 'hyderabad-marriott-hotel-and-convention-centre' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/ZFwbjtSfxDZjeZ6lmIxgCoWgvnUfW4AFqsjvVvr0.png', `city_label` = 'Hyderabad, India', `nearby_slugs` = '["hyderabad/taj-falaknuma-palace-hyderabad", "hyderabad/hyderabad-marriott-hotel-and-convention-centre", "hyderabad/le-meridien-hyderabad"]'
WHERE `city` = 'hyderabad' AND `slug` = 'itc-kakatiya-a-luxury-collection-hotel-hyderabad' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Mi4K3X7TKSqAeErliReMIAidZeMmhIVvod18IwWv.png', `city_label` = 'Hyderabad, India', `nearby_slugs` = '["hyderabad/taj-falaknuma-palace-hyderabad", "hyderabad/hyderabad-marriott-hotel-and-convention-centre", "hyderabad/le-meridien-hyderabad"]'
WHERE `city` = 'hyderabad' AND `slug` = 'itc-kohenur-a-luxury-collection-hotel-hyderabad' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/AOit2JWail9DZToMxBYtVlvg6l4lL0vPQGvfWqtc.png', `city_label` = 'Hyderabad, India', `nearby_slugs` = '["hyderabad/taj-falaknuma-palace-hyderabad", "hyderabad/hyderabad-marriott-hotel-and-convention-centre", "hyderabad/the-park-hyderabad"]'
WHERE `city` = 'hyderabad' AND `slug` = 'le-meridien-hyderabad' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/6R0kwLKRYj3RMFw1pz95Qh43FI5Bqd93eahfhnZB.png', `city_label` = 'Hyderabad, India', `nearby_slugs` = '["hyderabad/taj-falaknuma-palace-hyderabad", "hyderabad/hyderabad-marriott-hotel-and-convention-centre", "hyderabad/le-meridien-hyderabad"]'
WHERE `city` = 'hyderabad' AND `slug` = 'novotel-hyderabad-convention-centre' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/m6KoP0ECZaDc2GhrjBRGBtI6YD4PhB0HfPjaRn6H.png', `city_label` = 'Hyderabad, India', `nearby_slugs` = '["hyderabad/taj-falaknuma-palace-hyderabad", "hyderabad/hyderabad-marriott-hotel-and-convention-centre", "hyderabad/le-meridien-hyderabad"]'
WHERE `city` = 'hyderabad' AND `slug` = 'radisson-blu-plaza-hotel-hyderabad-banjara-hills' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/vNQXiO4j68LkEG6JpW2OyWYLJ0XhEIb7r1N1BbLo.png', `city_label` = 'Hyderabad, India', `nearby_slugs` = '["hyderabad/taj-falaknuma-palace-hyderabad", "hyderabad/hyderabad-marriott-hotel-and-convention-centre", "hyderabad/le-meridien-hyderabad"]'
WHERE `city` = 'hyderabad' AND `slug` = 'sheraton-hyderabad-hotel' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/hCkRbhtcxBNGFDmk74hIlhTm36j1F5VxpH531TN0.png', `city_label` = 'Hyderabad, India', `nearby_slugs` = '["hyderabad/taj-falaknuma-palace-hyderabad", "hyderabad/hyderabad-marriott-hotel-and-convention-centre", "hyderabad/le-meridien-hyderabad"]'
WHERE `city` = 'hyderabad' AND `slug` = 'taj-deccan-hyderabad' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/gj2BI5N4dnkrQgjy9xfouTJcosszugkj3D5sb2Gz.png', `city_label` = 'Hyderabad, India', `nearby_slugs` = '["hyderabad/hyderabad-marriott-hotel-and-convention-centre", "hyderabad/le-meridien-hyderabad", "hyderabad/the-park-hyderabad"]'
WHERE `city` = 'hyderabad' AND `slug` = 'taj-falaknuma-palace-hyderabad' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/UwhtMWihneUhc7YVzImjcczpwDmWjH6ugBKGJmdt.png', `city_label` = 'Hyderabad, India', `nearby_slugs` = '["hyderabad/taj-falaknuma-palace-hyderabad", "hyderabad/hyderabad-marriott-hotel-and-convention-centre", "hyderabad/le-meridien-hyderabad"]'
WHERE `city` = 'hyderabad' AND `slug` = 'taj-krishna-hyderabad' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/C7VUGBdEiQsZsxRcORssPyk8gvPxr4p3CnuwjZ7r.png', `city_label` = 'Hyderabad, India', `nearby_slugs` = '["hyderabad/taj-falaknuma-palace-hyderabad", "hyderabad/hyderabad-marriott-hotel-and-convention-centre", "hyderabad/le-meridien-hyderabad"]'
WHERE `city` = 'hyderabad' AND `slug` = 'the-leela-hyderabad' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/rAms4jmsqFzPMq1GZ31EzvXBhZ7R3nzvq6du3QOz.png', `city_label` = 'Hyderabad, India', `nearby_slugs` = '["hyderabad/taj-falaknuma-palace-hyderabad", "hyderabad/hyderabad-marriott-hotel-and-convention-centre", "hyderabad/le-meridien-hyderabad"]'
WHERE `city` = 'hyderabad' AND `slug` = 'the-park-hyderabad' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["hyderabad/taj-falaknuma-palace-hyderabad", "hyderabad/hyderabad-marriott-hotel-and-convention-centre", "hyderabad/le-meridien-hyderabad"]'
WHERE `city` = 'hyderabad' AND `slug` = 'trident-hyderabad' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/wNMyJYWdyoz6BbMPBltShK8AzWDDcsF5m3HhieYn.png', `city_label` = 'Indore, India', `nearby_slugs` = '["indore/the-park-indore", "indore/radisson-blu-hotel-indore", "indore/sheraton-grand-palace-indore"]'
WHERE `city` = 'indore' AND `slug` = 'indore-marriott-hotel' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/IAE3iZhylrpZdzy3nNjkbUqnN3gdQ87yFZBnua1a.png', `city_label` = 'Indore, India', `nearby_slugs` = '["indore/the-park-indore", "indore/sheraton-grand-palace-indore", "indore/indore-marriott-hotel"]'
WHERE `city` = 'indore' AND `slug` = 'radisson-blu-hotel-indore' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/7ukwAOdxwMvZppmL0TxmMenS2QHk9NB93NXTylCb.png', `city_label` = 'Indore, India', `nearby_slugs` = '["indore/the-park-indore", "indore/radisson-blu-hotel-indore", "indore/indore-marriott-hotel"]'
WHERE `city` = 'indore' AND `slug` = 'sheraton-grand-palace-indore' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/WQ14lKsTHZPyt4BGKOdIOIbzBv6I8DHwlc3ISsHh.png', `city_label` = 'Indore, India', `nearby_slugs` = '["indore/radisson-blu-hotel-indore", "indore/sheraton-grand-palace-indore", "indore/indore-marriott-hotel"]'
WHERE `city` = 'indore' AND `slug` = 'the-park-indore' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/tnBVu1iPZHgWixBkuWF5oseJWAdDWebP3kJXN7DT.jpg', `city_label` = 'Jaipur, India', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'alila-fort-bishangarh-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/AXqz7s4o0PM4zXeLtlZGWVI7NOwoxwx82JbHxG76.png', `city_label` = 'Jaipur, India', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'ananta-spa-and-resort-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/CmChSwcpKKMkKg4t9mbn0KtAGZchPt1ChpLnHeBs.png', `city_label` = 'Jaipur, India', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'bhanwar-singh-palace-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/5vGfVs0VfHcZr9eIFcuebsW9ThXAuwSnIyOGqid4.png', `city_label` = 'Jaipur, India', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'buena-vista-luxury-garden-spa-resort' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/8NwflkK9LQzh77PZPC2KqlHPA1g0HIeyyZxxGLTY.png', `city_label` = 'Jaipur, India', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'chomu-palace-hotel-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Z8Z4Be3S7LUbGPwITV4myac01e684hS7UEczNGA1.png', `city_label` = 'Jaipur, India', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'doubletree-by-hilton-jaipur-amer' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/JFVB7PiDFs86AmL6LW8MWDXj6tBkLPPGKYh3fT4Q.jpg', `city_label` = 'Jaipur, India', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'fairmont-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/F4EM1S4Cq7tgQhp7510uO7uqY6WcGQ0E2oMHftwP.jpg', `city_label` = 'Jaipur, India', `nearby_slugs` = '["jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur", "jaipur/jai-mahal-palace-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'hyatt-regency-jaipur-mansarovar' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/j6nQKP849BX6WhEIIFn0IS16VHQEW5uqstIRm9zT.png', `city_label` = 'Jaipur, India', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'indana-palace-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/ejUOwFlioEkm6ozuoLspFCWLBEJTO2RK8YSI9Lns.png', `city_label` = 'Jaipur, India', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'intercontinental-jaipur-tonk-road-by-ihg' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/YUteEyJZfcf8nCGb0HME7C6aLNJq0eA3N5z4KbQE.png', `city_label` = 'Jaipur, India', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'itc-rajputana-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/ApJOWUGHFGyYaUlDftSaX5npDMlIS58jmzLTPVPe.jpg', `city_label` = 'Jaipur, India', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'jai-mahal-palace-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'le-meridien-jaipur-resort-and-spa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'mementos-by-itc-hotels-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'mundota-fort-and-palace-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'novotel-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'pride-amber-vilas-resort-and-convention-centre-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'raffles-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'rajasthali-resorts-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'rambagh-palace-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'samode-bagh-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'shiv-vilas-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/9ZaNAwFNK07JfijoREalO82ViH2KpymwuWNkhM6J.jpg', `city_label` = 'Jaipur, India', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/jai-mahal-palace-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'taj-amer-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'taj-devi-ratn-resort-and-spa-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'the-gold-palace-and-resorts-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'the-jaibagh-palace-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/leela-palace-jaipur-clean.jpg', `city_label` = 'Jaipur, India', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/taj-amer-jaipur", "jaipur/jai-mahal-palace-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'the-leela-palace-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'the-oberoi-rajvilas-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'the-palace-aravali-by-park-jewels-hotels-and-resorts-jaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["jaipur/hyatt-regency-jaipur-mansarovar", "jaipur/the-leela-palace-jaipur", "jaipur/taj-amer-jaipur"]'
WHERE `city` = 'jaipur' AND `slug` = 'the-westin-jaipur-kant-kalwar-resort-and-spa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/VUzBcq0oQbPU7No4kCQdeNOa6tysGMOSlMLiAOKk.png', `city_label` = 'Jaisalmer, India', `nearby_slugs` = '["jaisalmer/suryagarh-palace-jaisalmer", "jaisalmer/jaisalmer-marriott-resort-and-spa", "jaisalmer/taj-gorbandh-palace-jaisalmer"]'
WHERE `city` = 'jaisalmer' AND `slug` = 'fort-rajwada-jaisalmer' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/CmgNAMBReGgsBbie0Xi9RswF96kZc93EFu7bGwsp.png', `city_label` = 'Jaisalmer, India', `nearby_slugs` = '["jaisalmer/suryagarh-palace-jaisalmer", "jaisalmer/jaisalmer-marriott-resort-and-spa", "jaisalmer/taj-gorbandh-palace-jaisalmer"]'
WHERE `city` = 'jaisalmer' AND `slug` = 'gobindgarh-jaisalmer' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/HilmXIg7vOFyc8H0vZK89ScMjZNCz344bKzA6mOl.jpg', `city_label` = 'Jaisalmer, India', `nearby_slugs` = '["jaisalmer/suryagarh-palace-jaisalmer", "jaisalmer/taj-gorbandh-palace-jaisalmer", "jaisalmer/storii-by-itc-hotels-jaisalmer"]'
WHERE `city` = 'jaisalmer' AND `slug` = 'jaisalmer-marriott-resort-and-spa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/LTx7LIDRFrbrF8eXXJzTAOePNPvMLQre5teXzTOY.png', `city_label` = 'Jaisalmer, India', `nearby_slugs` = '["jaisalmer/suryagarh-palace-jaisalmer", "jaisalmer/jaisalmer-marriott-resort-and-spa", "jaisalmer/taj-gorbandh-palace-jaisalmer"]'
WHERE `city` = 'jaisalmer' AND `slug` = 'storii-by-itc-hotels-jaisalmer' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Pbax7yLGvRiIt8FJDEwQLtBKKMDib24NIuw79Y3g.jpg', `city_label` = 'Jaisalmer, India', `nearby_slugs` = '["jaisalmer/jaisalmer-marriott-resort-and-spa", "jaisalmer/taj-gorbandh-palace-jaisalmer", "jaisalmer/storii-by-itc-hotels-jaisalmer"]'
WHERE `city` = 'jaisalmer' AND `slug` = 'suryagarh-palace-jaisalmer' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/DrFDy5ilG7Yixu5znlTgmpAQdaUQzLtTXOM9y4lc.jpg', `city_label` = 'Jaisalmer, India', `nearby_slugs` = '["jaisalmer/suryagarh-palace-jaisalmer", "jaisalmer/jaisalmer-marriott-resort-and-spa", "jaisalmer/storii-by-itc-hotels-jaisalmer"]'
WHERE `city` = 'jaisalmer' AND `slug` = 'taj-gorbandh-palace-jaisalmer' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/NWWX9kcfGqxbQHU6LGFV6PihiqJupAgPdUnKyP93.jpg', `city_label` = 'Jim Corbett, India', `nearby_slugs` = '["jim-corbett/taj-corbett-resort-and-spa-jim-corbett", "jim-corbett/lemon-tree-premier-jim-corbett", "jim-corbett/namah-jim-corbett"]'
WHERE `city` = 'jim-corbett' AND `slug` = 'aahana-resort-luxury-resorts-in-jim-corbett' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/7KS5n41Fk7eAMb5ZspGlsaHTHRlfXM9DEjd8quUg.jpg', `city_label` = 'Jim Corbett, India', `nearby_slugs` = '["jim-corbett/taj-corbett-resort-and-spa-jim-corbett", "jim-corbett/namah-jim-corbett", "jim-corbett/welcomhotel-by-itc-hotels-jim-corbett"]'
WHERE `city` = 'jim-corbett' AND `slug` = 'lemon-tree-premier-jim-corbett' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/NkHgQYHHbO72bHwBDAjj8iDunYmhDDi3fIBbNaBU.jpg', `city_label` = 'Jim Corbett, India', `nearby_slugs` = '["jim-corbett/taj-corbett-resort-and-spa-jim-corbett", "jim-corbett/lemon-tree-premier-jim-corbett", "jim-corbett/welcomhotel-by-itc-hotels-jim-corbett"]'
WHERE `city` = 'jim-corbett' AND `slug` = 'namah-jim-corbett' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/MVQdcFrcVexszY1jHjeD8lN9HNUSTDC0hFxbWNml.png', `city_label` = 'Jim Corbett, India', `nearby_slugs` = '["jim-corbett/taj-corbett-resort-and-spa-jim-corbett", "jim-corbett/lemon-tree-premier-jim-corbett", "jim-corbett/namah-jim-corbett"]'
WHERE `city` = 'jim-corbett' AND `slug` = 'resorts-by-the-baagh-jim-corbett' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/gSXK7b2rgsnDBukvIUASjjBxrwDVmGCnolh81yhd.jpg', `city_label` = 'Jim Corbett, India', `nearby_slugs` = '["jim-corbett/lemon-tree-premier-jim-corbett", "jim-corbett/namah-jim-corbett", "jim-corbett/welcomhotel-by-itc-hotels-jim-corbett"]'
WHERE `city` = 'jim-corbett' AND `slug` = 'taj-corbett-resort-and-spa-jim-corbett' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/yhPb3b3MqY8w5ybN5Xedle7ZMubCEuoMtIhY7G2A.jpg', `city_label` = 'Jim Corbett, India', `nearby_slugs` = '["jim-corbett/taj-corbett-resort-and-spa-jim-corbett", "jim-corbett/lemon-tree-premier-jim-corbett", "jim-corbett/namah-jim-corbett"]'
WHERE `city` = 'jim-corbett' AND `slug` = 'tarangi-jim-corbett-resort-and-spa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/B6BLTOhj4rFf9VX2H6qULLAJAC0FP75xuZLohngV.png', `city_label` = 'Jim Corbett, India', `nearby_slugs` = '["jim-corbett/taj-corbett-resort-and-spa-jim-corbett", "jim-corbett/lemon-tree-premier-jim-corbett", "jim-corbett/namah-jim-corbett"]'
WHERE `city` = 'jim-corbett' AND `slug` = 'the-riverview-retreat-jim-corbett' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/tvOgat1XcWqRW7Fd5mlsF1sJ6pBAHDODtLvOgmwz.jpg', `city_label` = 'Jim Corbett, India', `nearby_slugs` = '["jim-corbett/taj-corbett-resort-and-spa-jim-corbett", "jim-corbett/lemon-tree-premier-jim-corbett", "jim-corbett/namah-jim-corbett"]'
WHERE `city` = 'jim-corbett' AND `slug` = 'welcomhotel-by-itc-hotels-jim-corbett' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/4cDCfcTz6Y9auXffQJtktdIxcTduAgl7IMFoyOQ2.jpg', `city_label` = 'Jim Corbett, India', `nearby_slugs` = '["jim-corbett/taj-corbett-resort-and-spa-jim-corbett", "jim-corbett/lemon-tree-premier-jim-corbett", "jim-corbett/namah-jim-corbett"]'
WHERE `city` = 'jim-corbett' AND `slug` = 'zana-a-luxury-escape-dhikuli-jim-corbet' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/oS7zaZNG0FbhjVk2uNRjWLtuiOcpGHi4pHePJ1Hy.jpg', `city_label` = 'Jodhpur, India', `nearby_slugs` = '["jodhpur/umaid-bhawan-palace-jodhpur", "jodhpur/taj-hari-mahal-jodhpur", "jodhpur/welcomhotel-by-itc-hotels-jodhpur"]'
WHERE `city` = 'jodhpur' AND `slug` = 'indana-palace-jodhpur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/1K8EelaafPeBuXFuE9GXWNMCDTxvVVp63BEP25U1.jpg', `city_label` = 'Jodhpur, India', `nearby_slugs` = '["jodhpur/umaid-bhawan-palace-jodhpur", "jodhpur/taj-hari-mahal-jodhpur", "jodhpur/welcomhotel-by-itc-hotels-jodhpur"]'
WHERE `city` = 'jodhpur' AND `slug` = 'radisson-hotel-jodhpur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/mlYBa6zv362BvS0nAflnBAA4XRgFqViySLVihdnx.png', `city_label` = 'Jodhpur, India', `nearby_slugs` = '["jodhpur/umaid-bhawan-palace-jodhpur", "jodhpur/taj-hari-mahal-jodhpur", "jodhpur/welcomhotel-by-itc-hotels-jodhpur"]'
WHERE `city` = 'jodhpur' AND `slug` = 'ranbanka-palace-jodhpur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/ZtuGfvsxRCWl77BZOOhYQ0jc76gJR5w50hhOjMBM.jpg', `city_label` = 'Jodhpur, India', `nearby_slugs` = '["jodhpur/umaid-bhawan-palace-jodhpur", "jodhpur/welcomhotel-by-itc-hotels-jodhpur", "jodhpur/radisson-hotel-jodhpur"]'
WHERE `city` = 'jodhpur' AND `slug` = 'taj-hari-mahal-jodhpur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/1ezt7wxYzC2c0800pSPeYahwEu0YMyV9FbToaRq5.jpg', `city_label` = 'Jodhpur, India', `nearby_slugs` = '["jodhpur/taj-hari-mahal-jodhpur", "jodhpur/welcomhotel-by-itc-hotels-jodhpur", "jodhpur/radisson-hotel-jodhpur"]'
WHERE `city` = 'jodhpur' AND `slug` = 'umaid-bhawan-palace-jodhpur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/WTVpqhWFMksCUEsTRfxfGSd4JTpgcp0c0ZHdWN1z.png', `city_label` = 'Jodhpur, India', `nearby_slugs` = '["jodhpur/umaid-bhawan-palace-jodhpur", "jodhpur/taj-hari-mahal-jodhpur", "jodhpur/welcomhotel-by-itc-hotels-jodhpur"]'
WHERE `city` = 'jodhpur' AND `slug` = 'welcomheritage-bal-samand-lake-palace-jodhpur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/cgnwZawKcZMPpUgiqpNGHfbzCacaq4SIoWXPUfia.jpg', `city_label` = 'Jodhpur, India', `nearby_slugs` = '["jodhpur/umaid-bhawan-palace-jodhpur", "jodhpur/taj-hari-mahal-jodhpur", "jodhpur/radisson-hotel-jodhpur"]'
WHERE `city` = 'jodhpur' AND `slug` = 'welcomhotel-by-itc-hotels-jodhpur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/usb01oAKQTuWTOtidxexThLexqhyImCeqH7cOCTk.png', `city_label` = 'Karnal, India', `nearby_slugs` = '[]'
WHERE `city` = 'karnal' AND `slug` = 'noormahal-palace-karnal' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/kKCOQf0xzuUqdpXJE9win4RuRj1uZTSm3xiqEgr4.jpg', `city_label` = 'Karnataka, India', `nearby_slugs` = '["karnataka/gateway-coorg-karnataka", "karnataka/taj-madikeri-resort-and-spa"]'
WHERE `city` = 'karnataka' AND `slug` = 'coorg-marriott-resort-and-spa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/B8qWL9g8MOomHyMhaQcTCAbGsvoNbIKwLkOBEBRz.jpg', `city_label` = 'Karnataka, India', `nearby_slugs` = '["karnataka/coorg-marriott-resort-and-spa", "karnataka/taj-madikeri-resort-and-spa"]'
WHERE `city` = 'karnataka' AND `slug` = 'gateway-coorg-karnataka' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/INyVVmh1mQKUM9RjXtUGuQNzQAkLq4uSLUQV4LE7.png', `city_label` = 'Karnataka, India', `nearby_slugs` = '["karnataka/coorg-marriott-resort-and-spa", "karnataka/gateway-coorg-karnataka"]'
WHERE `city` = 'karnataka' AND `slug` = 'taj-madikeri-resort-and-spa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/UO6AvG4HN6QZo9t93mvCldfowRsYIcVl7dtdpken.png', `city_label` = 'kasauli, India', `nearby_slugs` = '[]'
WHERE `city` = 'kasauli' AND `slug` = 'fortune-select-forest-hill-mahiya-kasauli' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/suku7yq1Jlc02NnMjklCXZlJErJ03ZtuRkeOjybq.png', `city_label` = 'kerala, India', `nearby_slugs` = '["kerala/taj-kumarakom-resort-and-spa-kerala", "kerala/taj-wayanad-resort-and-spa-kerala"]'
WHERE `city` = 'kerala' AND `slug` = 'taj-bekal-resort-and-spa-kerala' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/eBWGkAtwglgYjEL7ckKt9QNeAeC8vIhYi6KjOFrS.jpg', `city_label` = 'kerala, India', `nearby_slugs` = '["kerala/taj-wayanad-resort-and-spa-kerala", "kerala/taj-bekal-resort-and-spa-kerala"]'
WHERE `city` = 'kerala' AND `slug` = 'taj-kumarakom-resort-and-spa-kerala' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/JKde3fkvV1j6qhyqRFHEiYzHptZrEN7vPQp6h9kB.png', `city_label` = 'kerala, India', `nearby_slugs` = '["kerala/taj-kumarakom-resort-and-spa-kerala", "kerala/taj-bekal-resort-and-spa-kerala"]'
WHERE `city` = 'kerala' AND `slug` = 'taj-wayanad-resort-and-spa-kerala' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/BcWiyspQChp1tjB35vZJHA2zOdnl0Ole3xA938CB.png', `city_label` = 'khimsar, India', `nearby_slugs` = '[]'
WHERE `city` = 'khimsar' AND `slug` = 'welcomhotel-by-itc-hotels-fort-and-dunes-khimsar' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Z5vvn829YykfjRqYx8fzG3sPRt6p6YB9aClBb1Uq.png', `city_label` = 'kochi, India', `nearby_slugs` = '["kochi/grand-hyatt-kochi-bolgatty", "kochi/le-meridien-kochi", "kochi/radisson-blu-kochi"]'
WHERE `city` = 'kochi' AND `slug` = 'courtyard-by-marriott-kochi-airport' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/tMpAba9jbwKeB24iFGgSVDEClr7gVhaVIcz1pGsp.jpg', `city_label` = 'kochi, India', `nearby_slugs` = '["kochi/courtyard-by-marriott-kochi-airport", "kochi/le-meridien-kochi", "kochi/radisson-blu-kochi"]'
WHERE `city` = 'kochi' AND `slug` = 'grand-hyatt-kochi-bolgatty' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/FmgVa5USo9VN0mVkAYRuqLH5aJQDGCNkxk2VS9ru.png', `city_label` = 'kochi, India', `nearby_slugs` = '["kochi/grand-hyatt-kochi-bolgatty", "kochi/courtyard-by-marriott-kochi-airport", "kochi/radisson-blu-kochi"]'
WHERE `city` = 'kochi' AND `slug` = 'le-meridien-kochi' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/zgv0wa8tnF8vByvGy462Qc48w8ky3ipOwnXIIek6.png', `city_label` = 'kochi, India', `nearby_slugs` = '["kochi/grand-hyatt-kochi-bolgatty", "kochi/courtyard-by-marriott-kochi-airport", "kochi/le-meridien-kochi"]'
WHERE `city` = 'kochi' AND `slug` = 'radisson-blu-kochi' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/qralMX8zhYdbyQ6yNmHxGitAAtgQL3olPYFVxxgL.png', `city_label` = 'Kolkata, India', `nearby_slugs` = '["kolkata/jw-marriott-hotel-kolkata", "kolkata/taj-bengal-kolkata", "kolkata/novotel-kolkata-hotel-and-residences"]'
WHERE `city` = 'kolkata' AND `slug` = 'hyatt-regency-kolkata' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/KuRY5CmUfMny0w9Ht8GVHRH5RyQVsw5LTlhm6hNL.png', `city_label` = 'Kolkata, India', `nearby_slugs` = '["kolkata/jw-marriott-hotel-kolkata", "kolkata/taj-bengal-kolkata", "kolkata/hyatt-regency-kolkata"]'
WHERE `city` = 'kolkata' AND `slug` = 'itc-sonar-a-luxury-collection-hotel-kolkata' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/rPNwZSqbDRWN5bC1T9rT2EZUPlfZyDlgzufMadtU.png', `city_label` = 'Kolkata, India', `nearby_slugs` = '["kolkata/taj-bengal-kolkata", "kolkata/hyatt-regency-kolkata", "kolkata/novotel-kolkata-hotel-and-residences"]'
WHERE `city` = 'kolkata' AND `slug` = 'jw-marriott-hotel-kolkata' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/syFJZbIAo3I7Yun3Y4N4tir2XIqtpuOTPitsIOtg.png', `city_label` = 'Kolkata, India', `nearby_slugs` = '["kolkata/jw-marriott-hotel-kolkata", "kolkata/taj-bengal-kolkata", "kolkata/hyatt-regency-kolkata"]'
WHERE `city` = 'kolkata' AND `slug` = 'novotel-kolkata-hotel-and-residences' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/zTQlEhI3bq97FCfD4rYEGmz20MO1Iwy9HYsf7MI7.png', `city_label` = 'Kolkata, India', `nearby_slugs` = '["kolkata/jw-marriott-hotel-kolkata", "kolkata/hyatt-regency-kolkata", "kolkata/novotel-kolkata-hotel-and-residences"]'
WHERE `city` = 'kolkata' AND `slug` = 'taj-bengal-kolkata' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/yTnvZSkowHY9bgLcQU9oil0iR9IyZp0nxjhBHoYn.jpg', `city_label` = 'Kovalam, India', `nearby_slugs` = '[]'
WHERE `city` = 'kovalam' AND `slug` = 'the-leela-kovalam-a-raviz-hotel' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/MMcSZ2KHLu2XlmSJotmGT4O4WT0S63MXyZrD1AZm.png', `city_label` = 'Lucknow, India', `nearby_slugs` = '["lucknow/taj-mahal-lucknow", "lucknow/novotel-lucknow-gomti-nagar"]'
WHERE `city` = 'lucknow' AND `slug` = 'hyatt-regency-lucknow' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/GJzms1gt7sfCJJniGzeVo2uhAaxPzhrMCkG17gqH.png', `city_label` = 'Lucknow, India', `nearby_slugs` = '["lucknow/taj-mahal-lucknow", "lucknow/hyatt-regency-lucknow"]'
WHERE `city` = 'lucknow' AND `slug` = 'novotel-lucknow-gomti-nagar' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/CLZsuw05AUoGhwDoQnvgOVImuBsBCKuLE4EEzxjM.png', `city_label` = 'Lucknow, India', `nearby_slugs` = '["lucknow/novotel-lucknow-gomti-nagar", "lucknow/hyatt-regency-lucknow"]'
WHERE `city` = 'lucknow' AND `slug` = 'taj-mahal-lucknow' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Mzm60iLmPlFvhp36MjW0OWgb4IF9cVzQpM08rNsC.png', `city_label` = 'Mumbai, India', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'courtyard-by-marriott-mumbai-international-airport' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/UNusKPGHjM5RQSKWYbF00AbAcJJCEOFLP5vOre0Z.png', `city_label` = 'Mumbai, India', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'fairmont-mumbai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Nk945MefBDxMELdOtFfWwBSHcbEmd5cjA5asriWe.png', `city_label` = 'Mumbai, India', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'four-seasons-hotel-mumbai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/xiFf2p7ZQNa9bshUpP1SoUYN9ePK6hvLe0hgT3ZO.png', `city_label` = 'Mumbai, India', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'grand-hyatt-mumbai-hotel-and-residences' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/zPlgcFBQ2XiOt5sDHzY9xLZdHU4y1k5jng9ZxCNP.png', `city_label` = 'Mumbai, India', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'intercontinental-marine-drive-mumbai-by-ihg' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Jq6kK19n3muSlKjkShDd9llO6U5GW8ztrJGkVkkQ.png', `city_label` = 'Mumbai, India', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/taj-lands-end-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'itc-maratha-mumbai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/HIsyzWCSuh9QIw9MQacA5zmuUrj63HhL6paW69Ia.png', `city_label` = 'Mumbai, India', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'jw-marriott-mumbai-juhu' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/YCgDkEdol1ZNWiqX7QcXbmO0Xt9xtt8XgFOs43fm.png', `city_label` = 'Mumbai, India', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'jw-marriott-mumbai-sahar' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/g8Uxj8tYrDjt5PZAYkWO1KXN8ryV0y39qyIJPskZ.png', `city_label` = 'Mumbai, India', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'novotel-mumbai-juhu-beach' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/sKZjymMBeKD3vp4O8TXXEdFnGAoYOk0PNLHTPHVK.png', `city_label` = 'Mumbai, India', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'radisson-blu-mumbai-international-airport' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/BhsgC1t5whXW0K8YC4XlkKxoUKzqrddX4hGexqOz.png', `city_label` = 'Mumbai, India', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'sofitel-mumbai-bkc' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/S7LdCRwQjadrVflbLDl4LrqJBAI8Gs1brBNpnyRu.png', `city_label` = 'Mumbai, India', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'taj-lands-end-mumbai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'taj-santacruz-mumbai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'the-leela-mumbai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'the-oberoi-mumbai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/iznHvZxwMqbJkwhjwkticjUNCvxaBBbg9gN9J4ba.png', `city_label` = 'Mumbai, India', `nearby_slugs` = '["mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai", "mumbai/taj-lands-end-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'the-st-regis-mumbai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/n4uMUFKAeRLNWsSi9BlpOWoRnOUykoBZFxGsf9b6.png', `city_label` = 'Mumbai, India', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/itc-maratha-mumbai", "mumbai/taj-lands-end-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'the-taj-mahal-palace-mumbai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'the-westin-mumbai-powai-lake' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["mumbai/the-st-regis-mumbai", "mumbai/the-taj-mahal-palace-mumbai", "mumbai/itc-maratha-mumbai"]'
WHERE `city` = 'mumbai' AND `slug` = 'trident-nariman-point-mumbai' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/ap0X5r3MHgGKCule2RJmTIiRPnwNmWDET9Q3xUiq.jpg', `city_label` = 'Mussoorie, India', `nearby_slugs` = '["mussoorie/welcomhotel-by-itc-hotels-the-savoy", "mussoorie/jw-marriott-mussoorie-walnut-grove-resort-and-spa", "mussoorie/royal-orchid-fort-resort-mussoorie"]'
WHERE `city` = 'mussoorie' AND `slug` = 'jaypee-residency-manor' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Lat803kPcch7FOSdMX4Da1hHpjAexrUqSQHCkHrr.jpg', `city_label` = 'Mussoorie, India', `nearby_slugs` = '["mussoorie/welcomhotel-by-itc-hotels-the-savoy", "mussoorie/jaypee-residency-manor", "mussoorie/royal-orchid-fort-resort-mussoorie"]'
WHERE `city` = 'mussoorie' AND `slug` = 'jw-marriott-mussoorie-walnut-grove-resort-and-spa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/4WCcSFpCQojq0KiKxIBbL9yMeDHWuhlj2cjHYKml.png', `city_label` = 'Mussoorie, India', `nearby_slugs` = '["mussoorie/welcomhotel-by-itc-hotels-the-savoy", "mussoorie/jaypee-residency-manor", "mussoorie/jw-marriott-mussoorie-walnut-grove-resort-and-spa"]'
WHERE `city` = 'mussoorie' AND `slug` = 'royal-orchid-fort-resort-mussoorie' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/1tOeNqbclkOEYCIPUvFRxtrJ4QJY9C4RA1JUvDDA.jpg', `city_label` = 'Mussoorie, India', `nearby_slugs` = '["mussoorie/jaypee-residency-manor", "mussoorie/jw-marriott-mussoorie-walnut-grove-resort-and-spa", "mussoorie/royal-orchid-fort-resort-mussoorie"]'
WHERE `city` = 'mussoorie' AND `slug` = 'welcomhotel-by-itc-hotels-the-savoy' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Krqj8MPtf2kdfoZ84e1raEljkwKn3DbcCvqeUMID.png', `city_label` = 'Noida, India', `nearby_slugs` = '[]'
WHERE `city` = 'noida' AND `slug` = 'crown-plaza-greater-noida-by-ihg' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Svby0ShAyJBO2B0O9ReSLOX4uySF14uWJvhUdP7G.jpg', `city_label` = 'Pune, India', `nearby_slugs` = '["pune/the-ritz-carlton-pune", "pune/the-westin-pune-koregaon-park", "pune/sheraton-grand-pune-bund-garden-hotel"]'
WHERE `city` = 'pune' AND `slug` = 'conrad-pune' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/eY33oVlgW3BdCNcMaUC5wQYjCjphhdHNm6yUKwZI.png', `city_label` = 'Pune, India', `nearby_slugs` = '["pune/the-ritz-carlton-pune", "pune/conrad-pune", "pune/the-westin-pune-koregaon-park"]'
WHERE `city` = 'pune' AND `slug` = 'jw-marriott-hotel-pune' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/ESpWZn6EvrLVLiTrwMfzTfgf1Jt4SO9WSbZIl8KR.jpg', `city_label` = 'Pune, India', `nearby_slugs` = '["pune/the-ritz-carlton-pune", "pune/conrad-pune", "pune/the-westin-pune-koregaon-park"]'
WHERE `city` = 'pune' AND `slug` = 'radisson-blu-hotel-pune-kharadi' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/w7ymG14slT6djecNW72KFaRcn8SCnSGwxBiv0lgI.png', `city_label` = 'Pune, India', `nearby_slugs` = '["pune/the-ritz-carlton-pune", "pune/conrad-pune", "pune/the-westin-pune-koregaon-park"]'
WHERE `city` = 'pune' AND `slug` = 'sheraton-grand-pune-bund-garden-hotel' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/wPKNnrHYPzM1Z5VrFu4mvGqU19jWMcNyyhTQrErS.jpg', `city_label` = 'Pune, India', `nearby_slugs` = '["pune/conrad-pune", "pune/the-westin-pune-koregaon-park", "pune/sheraton-grand-pune-bund-garden-hotel"]'
WHERE `city` = 'pune' AND `slug` = 'the-ritz-carlton-pune' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/6P6syqF6ZcHt1k1z94K8nkXFPS0mRqr3g1CrE05R.jpg', `city_label` = 'Pune, India', `nearby_slugs` = '["pune/the-ritz-carlton-pune", "pune/conrad-pune", "pune/sheraton-grand-pune-bund-garden-hotel"]'
WHERE `city` = 'pune' AND `slug` = 'the-westin-pune-koregaon-park' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/EtjFbhoCALlGLARSkCBtaPqKj0rGQ0tiHXfXRISb.png', `city_label` = 'Pushkar, India', `nearby_slugs` = '["pushkar/pushkara-resort-and-spa", "pushkar/regenta-spa-and-resort-pushkar"]'
WHERE `city` = 'pushkar' AND `slug` = 'ananta-resort-pushkar' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/iUSrTyZRZdu3KA90gKdtX8y2U2Dcv1nTwq1bLtHs.png', `city_label` = 'Pushkar, India', `nearby_slugs` = '["pushkar/ananta-resort-pushkar", "pushkar/regenta-spa-and-resort-pushkar"]'
WHERE `city` = 'pushkar' AND `slug` = 'pushkara-resort-and-spa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/EhOUHOYhGgp1k34pUtbGlHwYgub3BthxpTJgJ8vV.png', `city_label` = 'Pushkar, India', `nearby_slugs` = '["pushkar/ananta-resort-pushkar", "pushkar/pushkara-resort-and-spa"]'
WHERE `city` = 'pushkar' AND `slug` = 'regenta-spa-and-resort-pushkar' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/wFUAYBKpoAWWeLnsyUSrlOgvY0f9RwULxJLSmDiK.png', `city_label` = 'Raipur, India', `nearby_slugs` = '["raipur/mayfair-lake-resort-raipur"]'
WHERE `city` = 'raipur' AND `slug` = 'courtyard-by-marriott-raipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/G5KfXCscJCzd8L7zbhhHuTN1tuqPgauAF9lNvVUa.png', `city_label` = 'Raipur, India', `nearby_slugs` = '["raipur/courtyard-by-marriott-raipur"]'
WHERE `city` = 'raipur' AND `slug` = 'mayfair-lake-resort-raipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/esqM2cu2hpTYj5GhOPQmfUEWtqSWD3lDx49p0kFv.png', `city_label` = 'Ranthambore, India', `nearby_slugs` = '["ranthambore/taj-sawai-ranthambore", "ranthambore/zana-forest-resort-ranthambore", "ranthambore/ranthambore-bagh-palace"]'
WHERE `city` = 'ranthambore' AND `slug` = 'nahargarh-ranthambhore' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/aIjd3cITI3L7uPVkXkIGOUEVOCJnS9iKvWZpObpX.png', `city_label` = 'Ranthambore, India', `nearby_slugs` = '["ranthambore/nahargarh-ranthambhore", "ranthambore/taj-sawai-ranthambore", "ranthambore/zana-forest-resort-ranthambore"]'
WHERE `city` = 'ranthambore' AND `slug` = 'ranthambore-bagh-palace' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/4eFnEcOUpcnOgVFMdvB01RpKgjfl27dAYORxOV4V.png', `city_label` = 'Ranthambore, India', `nearby_slugs` = '["ranthambore/nahargarh-ranthambhore", "ranthambore/zana-forest-resort-ranthambore", "ranthambore/ranthambore-bagh-palace"]'
WHERE `city` = 'ranthambore' AND `slug` = 'taj-sawai-ranthambore' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/aC9cmbufuUiGlfwdglJvasy4G6DPuhGeT8qVN9Ed.png', `city_label` = 'Ranthambore, India', `nearby_slugs` = '["ranthambore/nahargarh-ranthambhore", "ranthambore/taj-sawai-ranthambore", "ranthambore/ranthambore-bagh-palace"]'
WHERE `city` = 'ranthambore' AND `slug` = 'zana-forest-resort-ranthambore' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Xsk21oC92dB7Gd7l6rrmPwDboIyLDxi7fzxVbfTv.jpg', `city_label` = 'Rishikesh, India', `nearby_slugs` = '["rishikesh/the-westin-resort-and-spa-himalayas"]'
WHERE `city` = 'rishikesh' AND `slug` = 'taj-rishikesh-resort-and-spa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/QHuOaWW8dILSGnjHamNFQjnZUuFA0TukDUT0mcCC.jpg', `city_label` = 'Rishikesh, India', `nearby_slugs` = '["rishikesh/taj-rishikesh-resort-and-spa"]'
WHERE `city` = 'rishikesh' AND `slug` = 'the-westin-resort-and-spa-himalayas' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/h6trBSzbZQjJXsyf2E3iTMEuyb4zKHNCoa1tvRmk.jpg', `city_label` = 'Shimla, India', `nearby_slugs` = '[]'
WHERE `city` = 'shimla' AND `slug` = 'taj-theog-resort-and-spa-shimla' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/GkBZRNOEkGDaMgRsPYPb1VI8mFQFXMIn0yHqEH5V.png', `city_label` = 'Surat, India', `nearby_slugs` = '[]'
WHERE `city` = 'surat' AND `slug` = 'hilton-garden-inn-surat-city-centre' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/zHfAHqLpodhtq8kIxPh6QKGj0r7RAIQv1PFlgORa.jpg', `city_label` = 'Trivandrum, India', `nearby_slugs` = '[]'
WHERE `city` = 'trivandrum' AND `slug` = 'hilton-garden-inn-trivandrum' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/V5sS8fYBpEo0X0XXjf75QVaJYBqHwG4RHedakkYs.png', `city_label` = 'Udaipur, India', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'aurika-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/rLMuvCi37TCUwEt2op8IUdluuGjnU09pXugylzYx.png', `city_label` = 'Udaipur, India', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'chunda-palace-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/Sv9kRxzHCCBMEwLTMyk7OcZGt8GxG9wqavPFvJpZ.jpg', `city_label` = 'Udaipur, India', `nearby_slugs` = '["udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur", "udaipur/taj-lake-palace-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'fairmont-udaipur-palace' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/aTkSksmBRnbaOy4kdknSKDZ2AUerkJ2O7le5KSxa.png', `city_label` = 'Udaipur, India', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'holymont-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/8EYdWNjhbq830ZN7A8k3132AGGBDM6IWgV4amZw6.png', `city_label` = 'Udaipur, India', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'hotel-lakend-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/xaCf4V8zkDAKomKmaFxoKUPzEvCGP8eEdGvHw53R.png', `city_label` = 'Udaipur, India', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'justa-sajjangarh-resort-and-spa-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/nGV9EYmP2VnYubASiumOyzjJQzeAL9eW4g6UzpLd.png', `city_label` = 'Udaipur, India', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'labh-garh-palace-resort-and-spa-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/fsU20APLnBrMy5PtRpAhi1EkvMEmHYaQI8dcCvI9.jpg', `city_label` = 'Udaipur, India', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'mementos-by-itc-hotels-ekaaya-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/eut8q3kasPvE2B78Qz0e53Jq12Ul2FzMDEoCbFNf.png', `city_label` = 'Udaipur, India', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'raajsa-resort-kumbhalgarh-ihcl-seleqtions-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/ZFdU2ArDvj9xiv50aciLvdlFMHEhzgbXLiskazGq.png', `city_label` = 'Udaipur, India', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'raas-devigarh-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/b1tdmwW6o2SZBuvlZ91loVDwqR1uND9Fhyv12ZN5.png', `city_label` = 'Udaipur, India', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'radisson-blu-palace-resort-and-spa-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/cs5Nqux1ffIWUKH47fuksMbR620G4pkEwJd09ju7.jpg', `city_label` = 'Udaipur, India', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/taj-lake-palace-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'raffles-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'ramada-by-wyndham-udaipur-resort-and-spa' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'taj-aravali-resort-and-spa-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'taj-fateh-prakash-palace-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/aeuMMdXMJhIOG4UJEabRz6JYH6R9dPZ5uirEqVSj.jpg', `city_label` = 'Udaipur, India', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'taj-lake-palace-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'taj-lalit-bagh-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'the-ananta-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'the-lalit-laxmi-vilas-palace-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '/storage/hotels/thumbnails/bzULEIXQdp8mcmdXpNVWrWjNJsxGJrlrnF79DBfq.jpg', `city_label` = 'Udaipur, India', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/raffles-udaipur", "udaipur/taj-lake-palace-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'the-leela-palace-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'the-oberoi-udaivilas-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'trident-udaipur' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'udaipur-marriott-hotel' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
UPDATE `hotels` SET `thumbnail_image` = '', `city_label` = '', `nearby_slugs` = '["udaipur/fairmont-udaipur-palace", "udaipur/the-leela-palace-udaipur", "udaipur/raffles-udaipur"]'
WHERE `city` = 'udaipur' AND `slug` = 'wyndham-grand-udaipur-fatehsagar-lake' AND `thumbnail_image` = '' AND `city_label` = '' AND `nearby_slugs` = '[]';
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'agra', 'agra', 'courtyard-by-marriott-agra', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'agra' AND `venue_city` = 'agra' AND `venue_slug` = 'courtyard-by-marriott-agra');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'agra', 'agra', 'doubletree-by-hilton-hotel-agra', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'agra' AND `venue_city` = 'agra' AND `venue_slug` = 'doubletree-by-hilton-hotel-agra');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'agra', 'agra', 'itc-mughal-agra', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'agra' AND `venue_city` = 'agra' AND `venue_slug` = 'itc-mughal-agra');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'agra', 'agra', 'jaypee-palace-hotel-and-convention-centre-agra', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'agra' AND `venue_city` = 'agra' AND `venue_slug` = 'jaypee-palace-hotel-and-convention-centre-agra');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'agra', 'agra', 'laxmi-vilas-palace-bharatpur', 4
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'agra' AND `venue_city` = 'agra' AND `venue_slug` = 'laxmi-vilas-palace-bharatpur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'agra', 'agra', 'taj-agra', 5
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'agra' AND `venue_city` = 'agra' AND `venue_slug` = 'taj-agra');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'agra', 'agra', 'taj-view-agra', 6
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'agra' AND `venue_city` = 'agra' AND `venue_slug` = 'taj-view-agra');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'agra', 'agra', 'the-oberoi-amarvilas-agra', 7
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'agra' AND `venue_city` = 'agra' AND `venue_slug` = 'the-oberoi-amarvilas-agra');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'agra', 'agra', 'trident-agra', 8
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'agra' AND `venue_city` = 'agra' AND `venue_slug` = 'trident-agra');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'ahmedabad', 'ahmedabad', 'doubletree-by-hilton-ahmedabad', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'ahmedabad' AND `venue_city` = 'ahmedabad' AND `venue_slug` = 'doubletree-by-hilton-ahmedabad');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'ahmedabad', 'ahmedabad', 'gateway-ahmedabad-sindhu-bhavan', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'ahmedabad' AND `venue_city` = 'ahmedabad' AND `venue_slug` = 'gateway-ahmedabad-sindhu-bhavan');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'ahmedabad', 'ahmedabad', 'itc-narmada-a-luxury-collection-hotel-ahmedabad', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'ahmedabad' AND `venue_city` = 'ahmedabad' AND `venue_slug` = 'itc-narmada-a-luxury-collection-hotel-ahmedabad');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'ahmedabad', 'ahmedabad', 'novotel-ahmedabad', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'ahmedabad' AND `venue_city` = 'ahmedabad' AND `venue_slug` = 'novotel-ahmedabad');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'ajmer', 'ajmer', 'pratap-mahal-ajmer-an-ihcl-seleqtions-hotel', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'ajmer' AND `venue_city` = 'ajmer' AND `venue_slug` = 'pratap-mahal-ajmer-an-ihcl-seleqtions-hotel');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'amritsar', 'amritsar', 'holiday-inn-amritsar-ranjit-avenue-by-ihg', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'amritsar' AND `venue_city` = 'amritsar' AND `venue_slug` = 'holiday-inn-amritsar-ranjit-avenue-by-ihg');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'amritsar', 'amritsar', 'hyatt-regency-amritsar-hotel-and-spa', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'amritsar' AND `venue_city` = 'amritsar' AND `venue_slug` = 'hyatt-regency-amritsar-hotel-and-spa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'amritsar', 'amritsar', 'taj-swarna-amritsar', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'amritsar' AND `venue_city` = 'amritsar' AND `venue_slug` = 'taj-swarna-amritsar');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'amritsar', 'amritsar', 'welcomhotel-by-itc-hotels-amritsar', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'amritsar' AND `venue_city` = 'amritsar' AND `venue_slug` = 'welcomhotel-by-itc-hotels-amritsar');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'barwara', 'barwara', 'six-senses-fort-barwara', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'barwara' AND `venue_city` = 'barwara' AND `venue_slug` = 'six-senses-fort-barwara');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'bengal', 'bengal', 'itc-royal-bengal', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'bengal' AND `venue_city` = 'bengal' AND `venue_slug` = 'itc-royal-bengal');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'bengaluru', 'bengaluru', 'hilton-bangalore-embassy-golflinks', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'bengaluru' AND `venue_city` = 'bengaluru' AND `venue_slug` = 'hilton-bangalore-embassy-golflinks');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'bengaluru', 'bengaluru', 'hilton-garden-inn-bengaluru-embassy-manyata-business-park', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'bengaluru' AND `venue_city` = 'bengaluru' AND `venue_slug` = 'hilton-garden-inn-bengaluru-embassy-manyata-business-park');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'bengaluru', 'bengaluru', 'itc-gardenia-bengaluru', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'bengaluru' AND `venue_city` = 'bengaluru' AND `venue_slug` = 'itc-gardenia-bengaluru');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'bengaluru', 'bengaluru', 'itc-windsor-a-luxury-collection-hotel-bengaluru', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'bengaluru' AND `venue_city` = 'bengaluru' AND `venue_slug` = 'itc-windsor-a-luxury-collection-hotel-bengaluru');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'bengaluru', 'bengaluru', 'jw-marriott-bengaluru-prestige-golfshire-resort-and-spa', 4
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'bengaluru' AND `venue_city` = 'bengaluru' AND `venue_slug` = 'jw-marriott-bengaluru-prestige-golfshire-resort-and-spa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'bengaluru', 'bengaluru', 'radisson-blu-hotel-bengaluru', 5
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'bengaluru' AND `venue_city` = 'bengaluru' AND `venue_slug` = 'radisson-blu-hotel-bengaluru');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'bengaluru', 'bengaluru', 'shangri-la-bengaluru', 6
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'bengaluru' AND `venue_city` = 'bengaluru' AND `venue_slug` = 'shangri-la-bengaluru');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'bengaluru', 'bengaluru', 'taj-west-end-bengaluru', 7
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'bengaluru' AND `venue_city` = 'bengaluru' AND `venue_slug` = 'taj-west-end-bengaluru');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'bengaluru', 'bengaluru', 'the-leela-bhartiya-city-bengaluru', 8
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'bengaluru' AND `venue_city` = 'bengaluru' AND `venue_slug` = 'the-leela-bhartiya-city-bengaluru');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'bengaluru', 'bengaluru', 'the-leela-palace-bengaluru', 9
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'bengaluru' AND `venue_city` = 'bengaluru' AND `venue_slug` = 'the-leela-palace-bengaluru');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'bengaluru', 'bengaluru', 'the-ritz-carlton-bangalore', 10
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'bengaluru' AND `venue_city` = 'bengaluru' AND `venue_slug` = 'the-ritz-carlton-bangalore');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'bhopal', 'bhopal', 'courtyard-by-marriott-bhopal', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'bhopal' AND `venue_city` = 'bhopal' AND `venue_slug` = 'courtyard-by-marriott-bhopal');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'bhopal', 'bhopal', 'radisson-hotel-bhopal', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'bhopal' AND `venue_city` = 'bhopal' AND `venue_slug` = 'radisson-hotel-bhopal');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'bhopal', 'bhopal', 'taj-lakefront-bhopal', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'bhopal' AND `venue_city` = 'bhopal' AND `venue_slug` = 'taj-lakefront-bhopal');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'chandigarh', 'chandigarh', 'hyatt-regency-chandigarh', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'chandigarh' AND `venue_city` = 'chandigarh' AND `venue_slug` = 'hyatt-regency-chandigarh');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'chandigarh', 'chandigarh', 'jw-marriott-hotel-chandigarh', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'chandigarh' AND `venue_city` = 'chandigarh' AND `venue_slug` = 'jw-marriott-hotel-chandigarh');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'chandigarh', 'chandigarh', 'novotel-chandigarh-tribune-chowk', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'chandigarh' AND `venue_city` = 'chandigarh' AND `venue_slug` = 'novotel-chandigarh-tribune-chowk');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'chandigarh', 'chandigarh', 'taj-chandigarh', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'chandigarh' AND `venue_city` = 'chandigarh' AND `venue_slug` = 'taj-chandigarh');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'chandigarh', 'chandigarh', 'the-oberoi-sukhvilas', 4
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'chandigarh' AND `venue_city` = 'chandigarh' AND `venue_slug` = 'the-oberoi-sukhvilas');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'chennai', 'chennai', 'hilton-chennai', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'chennai' AND `venue_city` = 'chennai' AND `venue_slug` = 'hilton-chennai');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'chennai', 'chennai', 'hyatt-regency-chennai', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'chennai' AND `venue_city` = 'chennai' AND `venue_slug` = 'hyatt-regency-chennai');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'chennai', 'chennai', 'itc-grand-chola-chennai', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'chennai' AND `venue_city` = 'chennai' AND `venue_slug` = 'itc-grand-chola-chennai');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'chennai', 'chennai', 'le-royal-meridien-chennai', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'chennai' AND `venue_city` = 'chennai' AND `venue_slug` = 'le-royal-meridien-chennai');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'chennai', 'chennai', 'novotel-chennai-omr', 4
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'chennai' AND `venue_city` = 'chennai' AND `venue_slug` = 'novotel-chennai-omr');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'chennai', 'chennai', 'taj-club-house-chennai', 5
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'chennai' AND `venue_city` = 'chennai' AND `venue_slug` = 'taj-club-house-chennai');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'chennai', 'chennai', 'taj-connemara-chennai', 6
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'chennai' AND `venue_city` = 'chennai' AND `venue_slug` = 'taj-connemara-chennai');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'chennai', 'chennai', 'the-leela-palace-chennai', 7
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'chennai' AND `venue_city` = 'chennai' AND `venue_slug` = 'the-leela-palace-chennai');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'daman', 'daman', 'praveg-lake-resort-daman', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'daman' AND `venue_city` = 'daman' AND `venue_slug` = 'praveg-lake-resort-daman');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'daman', 'daman', 'silver-waves-resort-and-spa-daman', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'daman' AND `venue_city` = 'daman' AND `venue_slug` = 'silver-waves-resort-and-spa-daman');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'daman', 'daman', 'the-deltin-daman', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'daman' AND `venue_city` = 'daman' AND `venue_slug` = 'the-deltin-daman');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'dehradun', 'dehradun', 'hyatt-regency-dehradun-resort-and-spa', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'dehradun' AND `venue_city` = 'dehradun' AND `venue_slug` = 'hyatt-regency-dehradun-resort-and-spa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'dehradun', 'dehradun', 'le-meridien-dehradun-resort-and-spa', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'dehradun' AND `venue_city` = 'dehradun' AND `venue_slug` = 'le-meridien-dehradun-resort-and-spa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'dehradun', 'dehradun', 'taj-mussoorie-foothills-dehradun', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'dehradun' AND `venue_city` = 'dehradun' AND `venue_slug` = 'taj-mussoorie-foothills-dehradun');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'delhi-ncr', 'delhi-ncr', 'andaz-new-delhi', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'delhi-ncr' AND `venue_city` = 'delhi-ncr' AND `venue_slug` = 'andaz-new-delhi');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'delhi-ncr', 'delhi-ncr', 'courtyard-by-marriott-aravali-resort-delhi-ncr', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'delhi-ncr' AND `venue_city` = 'delhi-ncr' AND `venue_slug` = 'courtyard-by-marriott-aravali-resort-delhi-ncr');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'delhi-ncr', 'delhi-ncr', 'grand-hyatt-gurgaon', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'delhi-ncr' AND `venue_city` = 'delhi-ncr' AND `venue_slug` = 'grand-hyatt-gurgaon');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'delhi-ncr', 'delhi-ncr', 'heritage-village-resort-and-spa-manesar', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'delhi-ncr' AND `venue_city` = 'delhi-ncr' AND `venue_slug` = 'heritage-village-resort-and-spa-manesar');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'delhi-ncr', 'delhi-ncr', 'itc-grand-bharat-delhi-ncr', 4
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'delhi-ncr' AND `venue_city` = 'delhi-ncr' AND `venue_slug` = 'itc-grand-bharat-delhi-ncr');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'delhi-ncr', 'delhi-ncr', 'itc-maurya-a-luxury-collection-hotel-new-delhi', 5
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'delhi-ncr' AND `venue_city` = 'delhi-ncr' AND `venue_slug` = 'itc-maurya-a-luxury-collection-hotel-new-delhi');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'delhi-ncr', 'delhi-ncr', 'jaypee-greens-golf-and-spa-resort-delhi-ncr', 6
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'delhi-ncr' AND `venue_city` = 'delhi-ncr' AND `venue_slug` = 'jaypee-greens-golf-and-spa-resort-delhi-ncr');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'delhi-ncr', 'delhi-ncr', 'jw-marriott-hotel-new-delhi-aerocity', 7
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'delhi-ncr' AND `venue_city` = 'delhi-ncr' AND `venue_slug` = 'jw-marriott-hotel-new-delhi-aerocity');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'delhi-ncr', 'delhi-ncr', 'karma-lakelands-gurugram', 8
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'delhi-ncr' AND `venue_city` = 'delhi-ncr' AND `venue_slug` = 'karma-lakelands-gurugram');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'delhi-ncr', 'delhi-ncr', 'pullman-new-delhi-aerocity', 9
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'delhi-ncr' AND `venue_city` = 'delhi-ncr' AND `venue_slug` = 'pullman-new-delhi-aerocity');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'delhi-ncr', 'delhi-ncr', 'radisson-blu-plaza-hotel-delhi-airport', 10
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'delhi-ncr' AND `venue_city` = 'delhi-ncr' AND `venue_slug` = 'radisson-blu-plaza-hotel-delhi-airport');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'delhi-ncr', 'delhi-ncr', 'resort-country-club-manesar', 11
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'delhi-ncr' AND `venue_city` = 'delhi-ncr' AND `venue_slug` = 'resort-country-club-manesar');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'goa', 'goa', 'w-goa', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'goa' AND `venue_city` = 'goa' AND `venue_slug` = 'w-goa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'goa', 'goa', 'alila-diwa-goa', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'goa' AND `venue_city` = 'goa' AND `venue_slug` = 'alila-diwa-goa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'goa', 'goa', 'azaya-beach-resort-goa', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'goa' AND `venue_city` = 'goa' AND `venue_slug` = 'azaya-beach-resort-goa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'goa', 'goa', 'caravela-beach-resort', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'goa' AND `venue_city` = 'goa' AND `venue_slug` = 'caravela-beach-resort');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'goa', 'goa', 'grand-hyatt-goa', 4
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'goa' AND `venue_city` = 'goa' AND `venue_slug` = 'grand-hyatt-goa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'goa', 'goa', 'holiday-inn-resort-goa', 5
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'goa' AND `venue_city` = 'goa' AND `venue_slug` = 'holiday-inn-resort-goa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'goa', 'goa', 'itc-grand-goa', 6
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'goa' AND `venue_city` = 'goa' AND `venue_slug` = 'itc-grand-goa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'goa', 'goa', 'jw-marriott-goa', 7
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'goa' AND `venue_city` = 'goa' AND `venue_slug` = 'jw-marriott-goa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'goa', 'goa', 'planet-hollywood-beach-resort-goa', 8
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'goa' AND `venue_city` = 'goa' AND `venue_slug` = 'planet-hollywood-beach-resort-goa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'goa', 'goa', 'radisson-blu-resort-goa-cavelossim-beach', 9
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'goa' AND `venue_city` = 'goa' AND `venue_slug` = 'radisson-blu-resort-goa-cavelossim-beach');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'goa', 'goa', 'taj-cidade-de-goa-heritage-goa', 10
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'goa' AND `venue_city` = 'goa' AND `venue_slug` = 'taj-cidade-de-goa-heritage-goa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'goa', 'goa', 'taj-cidade-de-goa-horizon-goa', 11
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'goa' AND `venue_city` = 'goa' AND `venue_slug` = 'taj-cidade-de-goa-horizon-goa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'guwahati', 'guwahati', 'mayfair-spring-valley-resort-guwahati', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'guwahati' AND `venue_city` = 'guwahati' AND `venue_slug` = 'mayfair-spring-valley-resort-guwahati');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'guwahati', 'guwahati', 'radisson-blu-hotel-guwahati', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'guwahati' AND `venue_city` = 'guwahati' AND `venue_slug` = 'radisson-blu-hotel-guwahati');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'gwalior', 'gwalior', 'taj-usha-kiran-palace-gwalior', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'gwalior' AND `venue_city` = 'gwalior' AND `venue_slug` = 'taj-usha-kiran-palace-gwalior');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'hyderabad', 'hyderabad', 'hyatt-hyderabad-gachibowli', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'hyderabad' AND `venue_city` = 'hyderabad' AND `venue_slug` = 'hyatt-hyderabad-gachibowli');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'hyderabad', 'hyderabad', 'hyderabad-marriott-hotel-and-convention-centre', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'hyderabad' AND `venue_city` = 'hyderabad' AND `venue_slug` = 'hyderabad-marriott-hotel-and-convention-centre');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'hyderabad', 'hyderabad', 'itc-kakatiya-a-luxury-collection-hotel-hyderabad', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'hyderabad' AND `venue_city` = 'hyderabad' AND `venue_slug` = 'itc-kakatiya-a-luxury-collection-hotel-hyderabad');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'hyderabad', 'hyderabad', 'itc-kohenur-a-luxury-collection-hotel-hyderabad', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'hyderabad' AND `venue_city` = 'hyderabad' AND `venue_slug` = 'itc-kohenur-a-luxury-collection-hotel-hyderabad');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'hyderabad', 'hyderabad', 'le-meridien-hyderabad', 4
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'hyderabad' AND `venue_city` = 'hyderabad' AND `venue_slug` = 'le-meridien-hyderabad');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'hyderabad', 'hyderabad', 'novotel-hyderabad-convention-centre', 5
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'hyderabad' AND `venue_city` = 'hyderabad' AND `venue_slug` = 'novotel-hyderabad-convention-centre');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'hyderabad', 'hyderabad', 'radisson-blu-plaza-hotel-hyderabad-banjara-hills', 6
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'hyderabad' AND `venue_city` = 'hyderabad' AND `venue_slug` = 'radisson-blu-plaza-hotel-hyderabad-banjara-hills');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'hyderabad', 'hyderabad', 'sheraton-hyderabad-hotel', 7
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'hyderabad' AND `venue_city` = 'hyderabad' AND `venue_slug` = 'sheraton-hyderabad-hotel');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'hyderabad', 'hyderabad', 'taj-deccan-hyderabad', 8
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'hyderabad' AND `venue_city` = 'hyderabad' AND `venue_slug` = 'taj-deccan-hyderabad');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'hyderabad', 'hyderabad', 'taj-falaknuma-palace-hyderabad', 9
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'hyderabad' AND `venue_city` = 'hyderabad' AND `venue_slug` = 'taj-falaknuma-palace-hyderabad');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'hyderabad', 'hyderabad', 'taj-krishna-hyderabad', 10
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'hyderabad' AND `venue_city` = 'hyderabad' AND `venue_slug` = 'taj-krishna-hyderabad');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'hyderabad', 'hyderabad', 'the-leela-hyderabad', 11
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'hyderabad' AND `venue_city` = 'hyderabad' AND `venue_slug` = 'the-leela-hyderabad');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'indore', 'indore', 'indore-marriott-hotel', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'indore' AND `venue_city` = 'indore' AND `venue_slug` = 'indore-marriott-hotel');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'indore', 'indore', 'radisson-blu-hotel-indore', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'indore' AND `venue_city` = 'indore' AND `venue_slug` = 'radisson-blu-hotel-indore');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'indore', 'indore', 'sheraton-grand-palace-indore', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'indore' AND `venue_city` = 'indore' AND `venue_slug` = 'sheraton-grand-palace-indore');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'indore', 'indore', 'the-park-indore', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'indore' AND `venue_city` = 'indore' AND `venue_slug` = 'the-park-indore');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaipur', 'jaipur', 'alila-fort-bishangarh-jaipur', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaipur' AND `venue_city` = 'jaipur' AND `venue_slug` = 'alila-fort-bishangarh-jaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaipur', 'jaipur', 'taj-amer-jaipur', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaipur' AND `venue_city` = 'jaipur' AND `venue_slug` = 'taj-amer-jaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaipur', 'jaipur', 'ananta-spa-and-resort-jaipur', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaipur' AND `venue_city` = 'jaipur' AND `venue_slug` = 'ananta-spa-and-resort-jaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaipur', 'jaipur', 'bhanwar-singh-palace-jaipur', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaipur' AND `venue_city` = 'jaipur' AND `venue_slug` = 'bhanwar-singh-palace-jaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaipur', 'jaipur', 'buena-vista-luxury-garden-spa-resort', 4
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaipur' AND `venue_city` = 'jaipur' AND `venue_slug` = 'buena-vista-luxury-garden-spa-resort');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaipur', 'jaipur', 'chomu-palace-hotel-jaipur', 5
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaipur' AND `venue_city` = 'jaipur' AND `venue_slug` = 'chomu-palace-hotel-jaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaipur', 'jaipur', 'doubletree-by-hilton-jaipur-amer', 6
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaipur' AND `venue_city` = 'jaipur' AND `venue_slug` = 'doubletree-by-hilton-jaipur-amer');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaipur', 'jaipur', 'fairmont-jaipur', 7
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaipur' AND `venue_city` = 'jaipur' AND `venue_slug` = 'fairmont-jaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaipur', 'jaipur', 'hyatt-regency-jaipur-mansarovar', 8
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaipur' AND `venue_city` = 'jaipur' AND `venue_slug` = 'hyatt-regency-jaipur-mansarovar');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaipur', 'jaipur', 'indana-palace-jaipur', 9
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaipur' AND `venue_city` = 'jaipur' AND `venue_slug` = 'indana-palace-jaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaipur', 'jaipur', 'intercontinental-jaipur-tonk-road-by-ihg', 10
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaipur' AND `venue_city` = 'jaipur' AND `venue_slug` = 'intercontinental-jaipur-tonk-road-by-ihg');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaipur', 'jaipur', 'itc-rajputana-jaipur', 11
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaipur' AND `venue_city` = 'jaipur' AND `venue_slug` = 'itc-rajputana-jaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaisalmer', 'jaisalmer', 'suryagarh-palace-jaisalmer', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaisalmer' AND `venue_city` = 'jaisalmer' AND `venue_slug` = 'suryagarh-palace-jaisalmer');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaisalmer', 'jaisalmer', 'fort-rajwada-jaisalmer', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaisalmer' AND `venue_city` = 'jaisalmer' AND `venue_slug` = 'fort-rajwada-jaisalmer');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaisalmer', 'jaisalmer', 'gobindgarh-jaisalmer', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaisalmer' AND `venue_city` = 'jaisalmer' AND `venue_slug` = 'gobindgarh-jaisalmer');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaisalmer', 'jaisalmer', 'jaisalmer-marriott-resort-and-spa', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaisalmer' AND `venue_city` = 'jaisalmer' AND `venue_slug` = 'jaisalmer-marriott-resort-and-spa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaisalmer', 'jaisalmer', 'storii-by-itc-hotels-jaisalmer', 4
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaisalmer' AND `venue_city` = 'jaisalmer' AND `venue_slug` = 'storii-by-itc-hotels-jaisalmer');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jaisalmer', 'jaisalmer', 'taj-gorbandh-palace-jaisalmer', 5
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jaisalmer' AND `venue_city` = 'jaisalmer' AND `venue_slug` = 'taj-gorbandh-palace-jaisalmer');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jim-corbett', 'jim-corbett', 'aahana-resort-luxury-resorts-in-jim-corbett', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jim-corbett' AND `venue_city` = 'jim-corbett' AND `venue_slug` = 'aahana-resort-luxury-resorts-in-jim-corbett');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jim-corbett', 'jim-corbett', 'lemon-tree-premier-jim-corbett', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jim-corbett' AND `venue_city` = 'jim-corbett' AND `venue_slug` = 'lemon-tree-premier-jim-corbett');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jim-corbett', 'jim-corbett', 'namah-jim-corbett', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jim-corbett' AND `venue_city` = 'jim-corbett' AND `venue_slug` = 'namah-jim-corbett');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jim-corbett', 'jim-corbett', 'resorts-by-the-baagh-jim-corbett', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jim-corbett' AND `venue_city` = 'jim-corbett' AND `venue_slug` = 'resorts-by-the-baagh-jim-corbett');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jim-corbett', 'jim-corbett', 'taj-corbett-resort-and-spa-jim-corbett', 4
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jim-corbett' AND `venue_city` = 'jim-corbett' AND `venue_slug` = 'taj-corbett-resort-and-spa-jim-corbett');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jim-corbett', 'jim-corbett', 'tarangi-jim-corbett-resort-and-spa', 5
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jim-corbett' AND `venue_city` = 'jim-corbett' AND `venue_slug` = 'tarangi-jim-corbett-resort-and-spa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jim-corbett', 'jim-corbett', 'the-riverview-retreat-jim-corbett', 6
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jim-corbett' AND `venue_city` = 'jim-corbett' AND `venue_slug` = 'the-riverview-retreat-jim-corbett');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jim-corbett', 'jim-corbett', 'welcomhotel-by-itc-hotels-jim-corbett', 7
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jim-corbett' AND `venue_city` = 'jim-corbett' AND `venue_slug` = 'welcomhotel-by-itc-hotels-jim-corbett');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jim-corbett', 'jim-corbett', 'zana-a-luxury-escape-dhikuli-jim-corbet', 8
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jim-corbett' AND `venue_city` = 'jim-corbett' AND `venue_slug` = 'zana-a-luxury-escape-dhikuli-jim-corbet');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jodhpur', 'jodhpur', 'indana-palace-jodhpur', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jodhpur' AND `venue_city` = 'jodhpur' AND `venue_slug` = 'indana-palace-jodhpur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jodhpur', 'jodhpur', 'radisson-hotel-jodhpur', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jodhpur' AND `venue_city` = 'jodhpur' AND `venue_slug` = 'radisson-hotel-jodhpur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jodhpur', 'jodhpur', 'ranbanka-palace-jodhpur', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jodhpur' AND `venue_city` = 'jodhpur' AND `venue_slug` = 'ranbanka-palace-jodhpur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jodhpur', 'jodhpur', 'taj-hari-mahal-jodhpur', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jodhpur' AND `venue_city` = 'jodhpur' AND `venue_slug` = 'taj-hari-mahal-jodhpur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jodhpur', 'jodhpur', 'umaid-bhawan-palace-jodhpur', 4
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jodhpur' AND `venue_city` = 'jodhpur' AND `venue_slug` = 'umaid-bhawan-palace-jodhpur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jodhpur', 'jodhpur', 'welcomheritage-bal-samand-lake-palace-jodhpur', 5
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jodhpur' AND `venue_city` = 'jodhpur' AND `venue_slug` = 'welcomheritage-bal-samand-lake-palace-jodhpur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'jodhpur', 'jodhpur', 'welcomhotel-by-itc-hotels-jodhpur', 6
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'jodhpur' AND `venue_city` = 'jodhpur' AND `venue_slug` = 'welcomhotel-by-itc-hotels-jodhpur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'karnal', 'karnal', 'noormahal-palace-karnal', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'karnal' AND `venue_city` = 'karnal' AND `venue_slug` = 'noormahal-palace-karnal');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'karnataka', 'karnataka', 'coorg-marriott-resort-and-spa', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'karnataka' AND `venue_city` = 'karnataka' AND `venue_slug` = 'coorg-marriott-resort-and-spa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'karnataka', 'karnataka', 'gateway-coorg-karnataka', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'karnataka' AND `venue_city` = 'karnataka' AND `venue_slug` = 'gateway-coorg-karnataka');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'karnataka', 'karnataka', 'taj-madikeri-resort-and-spa', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'karnataka' AND `venue_city` = 'karnataka' AND `venue_slug` = 'taj-madikeri-resort-and-spa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'kasauli', 'kasauli', 'fortune-select-forest-hill-mahiya-kasauli', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'kasauli' AND `venue_city` = 'kasauli' AND `venue_slug` = 'fortune-select-forest-hill-mahiya-kasauli');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'kerala', 'kerala', 'taj-bekal-resort-and-spa-kerala', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'kerala' AND `venue_city` = 'kerala' AND `venue_slug` = 'taj-bekal-resort-and-spa-kerala');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'kerala', 'kerala', 'taj-kumarakom-resort-and-spa-kerala', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'kerala' AND `venue_city` = 'kerala' AND `venue_slug` = 'taj-kumarakom-resort-and-spa-kerala');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'kerala', 'kerala', 'taj-wayanad-resort-and-spa-kerala', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'kerala' AND `venue_city` = 'kerala' AND `venue_slug` = 'taj-wayanad-resort-and-spa-kerala');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'khimsar', 'khimsar', 'welcomhotel-by-itc-hotels-fort-and-dunes-khimsar', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'khimsar' AND `venue_city` = 'khimsar' AND `venue_slug` = 'welcomhotel-by-itc-hotels-fort-and-dunes-khimsar');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'kochi', 'kochi', 'courtyard-by-marriott-kochi-airport', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'kochi' AND `venue_city` = 'kochi' AND `venue_slug` = 'courtyard-by-marriott-kochi-airport');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'kochi', 'kochi', 'grand-hyatt-kochi-bolgatty', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'kochi' AND `venue_city` = 'kochi' AND `venue_slug` = 'grand-hyatt-kochi-bolgatty');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'kochi', 'kochi', 'le-meridien-kochi', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'kochi' AND `venue_city` = 'kochi' AND `venue_slug` = 'le-meridien-kochi');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'kochi', 'kochi', 'radisson-blu-kochi', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'kochi' AND `venue_city` = 'kochi' AND `venue_slug` = 'radisson-blu-kochi');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'kolkata', 'kolkata', 'hyatt-regency-kolkata', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'kolkata' AND `venue_city` = 'kolkata' AND `venue_slug` = 'hyatt-regency-kolkata');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'kolkata', 'kolkata', 'itc-sonar-a-luxury-collection-hotel-kolkata', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'kolkata' AND `venue_city` = 'kolkata' AND `venue_slug` = 'itc-sonar-a-luxury-collection-hotel-kolkata');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'kolkata', 'kolkata', 'jw-marriott-hotel-kolkata', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'kolkata' AND `venue_city` = 'kolkata' AND `venue_slug` = 'jw-marriott-hotel-kolkata');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'kolkata', 'kolkata', 'novotel-kolkata-hotel-and-residences', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'kolkata' AND `venue_city` = 'kolkata' AND `venue_slug` = 'novotel-kolkata-hotel-and-residences');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'kolkata', 'kolkata', 'taj-bengal-kolkata', 4
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'kolkata' AND `venue_city` = 'kolkata' AND `venue_slug` = 'taj-bengal-kolkata');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'kovalam', 'kovalam', 'the-leela-kovalam-a-raviz-hotel', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'kovalam' AND `venue_city` = 'kovalam' AND `venue_slug` = 'the-leela-kovalam-a-raviz-hotel');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'lucknow', 'lucknow', 'hyatt-regency-lucknow', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'lucknow' AND `venue_city` = 'lucknow' AND `venue_slug` = 'hyatt-regency-lucknow');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'lucknow', 'lucknow', 'novotel-lucknow-gomti-nagar', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'lucknow' AND `venue_city` = 'lucknow' AND `venue_slug` = 'novotel-lucknow-gomti-nagar');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'lucknow', 'lucknow', 'taj-mahal-lucknow', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'lucknow' AND `venue_city` = 'lucknow' AND `venue_slug` = 'taj-mahal-lucknow');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'mumbai', 'mumbai', 'courtyard-by-marriott-mumbai-international-airport', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'mumbai' AND `venue_city` = 'mumbai' AND `venue_slug` = 'courtyard-by-marriott-mumbai-international-airport');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'mumbai', 'mumbai', 'fairmont-mumbai', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'mumbai' AND `venue_city` = 'mumbai' AND `venue_slug` = 'fairmont-mumbai');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'mumbai', 'mumbai', 'four-seasons-hotel-mumbai', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'mumbai' AND `venue_city` = 'mumbai' AND `venue_slug` = 'four-seasons-hotel-mumbai');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'mumbai', 'mumbai', 'grand-hyatt-mumbai-hotel-and-residences', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'mumbai' AND `venue_city` = 'mumbai' AND `venue_slug` = 'grand-hyatt-mumbai-hotel-and-residences');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'mumbai', 'mumbai', 'intercontinental-marine-drive-mumbai-by-ihg', 4
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'mumbai' AND `venue_city` = 'mumbai' AND `venue_slug` = 'intercontinental-marine-drive-mumbai-by-ihg');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'mumbai', 'mumbai', 'itc-maratha-mumbai', 5
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'mumbai' AND `venue_city` = 'mumbai' AND `venue_slug` = 'itc-maratha-mumbai');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'mumbai', 'mumbai', 'jw-marriott-mumbai-juhu', 6
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'mumbai' AND `venue_city` = 'mumbai' AND `venue_slug` = 'jw-marriott-mumbai-juhu');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'mumbai', 'mumbai', 'jw-marriott-mumbai-sahar', 7
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'mumbai' AND `venue_city` = 'mumbai' AND `venue_slug` = 'jw-marriott-mumbai-sahar');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'mumbai', 'mumbai', 'novotel-mumbai-juhu-beach', 8
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'mumbai' AND `venue_city` = 'mumbai' AND `venue_slug` = 'novotel-mumbai-juhu-beach');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'mumbai', 'mumbai', 'radisson-blu-mumbai-international-airport', 9
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'mumbai' AND `venue_city` = 'mumbai' AND `venue_slug` = 'radisson-blu-mumbai-international-airport');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'mumbai', 'mumbai', 'sofitel-mumbai-bkc', 10
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'mumbai' AND `venue_city` = 'mumbai' AND `venue_slug` = 'sofitel-mumbai-bkc');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'mumbai', 'mumbai', 'taj-lands-end-mumbai', 11
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'mumbai' AND `venue_city` = 'mumbai' AND `venue_slug` = 'taj-lands-end-mumbai');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'mussoorie', 'mussoorie', 'jaypee-residency-manor', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'mussoorie' AND `venue_city` = 'mussoorie' AND `venue_slug` = 'jaypee-residency-manor');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'mussoorie', 'mussoorie', 'jw-marriott-mussoorie-walnut-grove-resort-and-spa', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'mussoorie' AND `venue_city` = 'mussoorie' AND `venue_slug` = 'jw-marriott-mussoorie-walnut-grove-resort-and-spa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'mussoorie', 'mussoorie', 'royal-orchid-fort-resort-mussoorie', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'mussoorie' AND `venue_city` = 'mussoorie' AND `venue_slug` = 'royal-orchid-fort-resort-mussoorie');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'mussoorie', 'mussoorie', 'welcomhotel-by-itc-hotels-the-savoy', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'mussoorie' AND `venue_city` = 'mussoorie' AND `venue_slug` = 'welcomhotel-by-itc-hotels-the-savoy');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'noida', 'noida', 'crown-plaza-greater-noida-by-ihg', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'noida' AND `venue_city` = 'noida' AND `venue_slug` = 'crown-plaza-greater-noida-by-ihg');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'pune', 'pune', 'conrad-pune', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'pune' AND `venue_city` = 'pune' AND `venue_slug` = 'conrad-pune');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'pune', 'pune', 'jw-marriott-hotel-pune', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'pune' AND `venue_city` = 'pune' AND `venue_slug` = 'jw-marriott-hotel-pune');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'pune', 'pune', 'radisson-blu-hotel-pune-kharadi', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'pune' AND `venue_city` = 'pune' AND `venue_slug` = 'radisson-blu-hotel-pune-kharadi');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'pune', 'pune', 'sheraton-grand-pune-bund-garden-hotel', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'pune' AND `venue_city` = 'pune' AND `venue_slug` = 'sheraton-grand-pune-bund-garden-hotel');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'pune', 'pune', 'the-ritz-carlton-pune', 4
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'pune' AND `venue_city` = 'pune' AND `venue_slug` = 'the-ritz-carlton-pune');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'pune', 'pune', 'the-westin-pune-koregaon-park', 5
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'pune' AND `venue_city` = 'pune' AND `venue_slug` = 'the-westin-pune-koregaon-park');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'pushkar', 'pushkar', 'ananta-resort-pushkar', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'pushkar' AND `venue_city` = 'pushkar' AND `venue_slug` = 'ananta-resort-pushkar');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'pushkar', 'pushkar', 'pushkara-resort-and-spa', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'pushkar' AND `venue_city` = 'pushkar' AND `venue_slug` = 'pushkara-resort-and-spa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'pushkar', 'pushkar', 'regenta-spa-and-resort-pushkar', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'pushkar' AND `venue_city` = 'pushkar' AND `venue_slug` = 'regenta-spa-and-resort-pushkar');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'raipur', 'raipur', 'courtyard-by-marriott-raipur', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'raipur' AND `venue_city` = 'raipur' AND `venue_slug` = 'courtyard-by-marriott-raipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'raipur', 'raipur', 'mayfair-lake-resort-raipur', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'raipur' AND `venue_city` = 'raipur' AND `venue_slug` = 'mayfair-lake-resort-raipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'ranthambore', 'ranthambore', 'nahargarh-ranthambhore', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'ranthambore' AND `venue_city` = 'ranthambore' AND `venue_slug` = 'nahargarh-ranthambhore');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'ranthambore', 'ranthambore', 'ranthambore-bagh-palace', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'ranthambore' AND `venue_city` = 'ranthambore' AND `venue_slug` = 'ranthambore-bagh-palace');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'ranthambore', 'ranthambore', 'taj-sawai-ranthambore', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'ranthambore' AND `venue_city` = 'ranthambore' AND `venue_slug` = 'taj-sawai-ranthambore');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'ranthambore', 'ranthambore', 'zana-forest-resort-ranthambore', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'ranthambore' AND `venue_city` = 'ranthambore' AND `venue_slug` = 'zana-forest-resort-ranthambore');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'rishikesh', 'rishikesh', 'taj-rishikesh-resort-and-spa', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'rishikesh' AND `venue_city` = 'rishikesh' AND `venue_slug` = 'taj-rishikesh-resort-and-spa');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'rishikesh', 'rishikesh', 'the-westin-resort-and-spa-himalayas', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'rishikesh' AND `venue_city` = 'rishikesh' AND `venue_slug` = 'the-westin-resort-and-spa-himalayas');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'shimla', 'shimla', 'taj-theog-resort-and-spa-shimla', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'shimla' AND `venue_city` = 'shimla' AND `venue_slug` = 'taj-theog-resort-and-spa-shimla');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'surat', 'surat', 'hilton-garden-inn-surat-city-centre', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'surat' AND `venue_city` = 'surat' AND `venue_slug` = 'hilton-garden-inn-surat-city-centre');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'trivandrum', 'trivandrum', 'hilton-garden-inn-trivandrum', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'trivandrum' AND `venue_city` = 'trivandrum' AND `venue_slug` = 'hilton-garden-inn-trivandrum');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'udaipur', 'udaipur', 'fairmont-udaipur-palace', 0
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'udaipur' AND `venue_city` = 'udaipur' AND `venue_slug` = 'fairmont-udaipur-palace');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'udaipur', 'udaipur', 'the-leela-palace-udaipur', 1
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'udaipur' AND `venue_city` = 'udaipur' AND `venue_slug` = 'the-leela-palace-udaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'udaipur', 'udaipur', 'aurika-udaipur', 2
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'udaipur' AND `venue_city` = 'udaipur' AND `venue_slug` = 'aurika-udaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'udaipur', 'udaipur', 'chunda-palace-udaipur', 3
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'udaipur' AND `venue_city` = 'udaipur' AND `venue_slug` = 'chunda-palace-udaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'udaipur', 'udaipur', 'holymont-udaipur', 4
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'udaipur' AND `venue_city` = 'udaipur' AND `venue_slug` = 'holymont-udaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'udaipur', 'udaipur', 'hotel-lakend-udaipur', 5
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'udaipur' AND `venue_city` = 'udaipur' AND `venue_slug` = 'hotel-lakend-udaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'udaipur', 'udaipur', 'justa-sajjangarh-resort-and-spa-udaipur', 6
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'udaipur' AND `venue_city` = 'udaipur' AND `venue_slug` = 'justa-sajjangarh-resort-and-spa-udaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'udaipur', 'udaipur', 'labh-garh-palace-resort-and-spa-udaipur', 7
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'udaipur' AND `venue_city` = 'udaipur' AND `venue_slug` = 'labh-garh-palace-resort-and-spa-udaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'udaipur', 'udaipur', 'mementos-by-itc-hotels-ekaaya-udaipur', 8
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'udaipur' AND `venue_city` = 'udaipur' AND `venue_slug` = 'mementos-by-itc-hotels-ekaaya-udaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'udaipur', 'udaipur', 'raajsa-resort-kumbhalgarh-ihcl-seleqtions-udaipur', 9
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'udaipur' AND `venue_city` = 'udaipur' AND `venue_slug` = 'raajsa-resort-kumbhalgarh-ihcl-seleqtions-udaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'udaipur', 'udaipur', 'raas-devigarh-udaipur', 10
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'udaipur' AND `venue_city` = 'udaipur' AND `venue_slug` = 'raas-devigarh-udaipur');
--> statement-breakpoint
INSERT INTO `city_listings` (`city`, `venue_city`, `venue_slug`, `position`)
SELECT 'udaipur', 'udaipur', 'radisson-blu-palace-resort-and-spa-udaipur', 11
WHERE NOT EXISTS (SELECT 1 FROM `city_listings` WHERE `city` = 'udaipur' AND `venue_city` = 'udaipur' AND `venue_slug` = 'radisson-blu-palace-resort-and-spa-udaipur');
