-- The Event Spaces Gallery, as data an editor owns.
--
-- The gallery was never stored. renderGallery() in worker/site/hotel.ts built
-- it on every request from the banner image followed by one figure per
-- highlight, and took its captions from the highlight titles. So a picture
-- could only reach the gallery by being attached to a highlight, could not be
-- reordered, recaptioned, or removed, and the gallery could not hold a picture
-- that was not also shown somewhere else on the page.
--
-- It is a JSON array of { image, caption } in display order, in a text column,
-- like `highlights` and `faqs` either side of it. The venue load already reads
-- the whole row, so this costs no extra query.
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "gallery" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
-- Backfill each venue with exactly what it renders today, so the deploy is a
-- no-op on screen and every editor opens the panel to the pictures already
-- live rather than to an empty list.
--
-- Row by row in PL/pgSQL rather than one set-based UPDATE because `highlights`
-- is text, not jsonb: a single malformed row would abort a set-based cast and
-- take the whole migration with it. Here a row that will not parse falls back
-- to its banner alone, and the runtime keeps the old derivation for anything
-- still empty (see renderGallery), so no venue can lose its gallery.
--
-- Guarded on `gallery = '[]'`, so re-running cannot overwrite an editor's work.
DO $backfill$
DECLARE
	venue RECORD;
	entries jsonb;
	parsed jsonb;
	item jsonb;
BEGIN
	FOR venue IN SELECT "id", "name", "banner_image", "highlights" FROM "hotels" WHERE "gallery" = '[]' LOOP
		entries := '[]'::jsonb;

		IF coalesce(venue.banner_image, '') <> '' THEN
			entries := entries || jsonb_build_array(jsonb_build_object(
				'image', venue.banner_image,
				'caption', venue.name || ' header image'
			));
		END IF;

		BEGIN
			parsed := venue.highlights::jsonb;
		EXCEPTION WHEN others THEN
			parsed := '[]'::jsonb;
		END;

		IF jsonb_typeof(parsed) = 'array' THEN
			FOR item IN SELECT * FROM jsonb_array_elements(parsed) LOOP
				IF coalesce(item->>'image', '') <> '' THEN
					entries := entries || jsonb_build_array(jsonb_build_object(
						'image', item->>'image',
						'caption', coalesce(item->>'title', '')
					));
				END IF;
			END LOOP;
		END IF;

		UPDATE "hotels" SET "gallery" = entries::text WHERE "id" = venue.id;
	END LOOP;
END
$backfill$;
