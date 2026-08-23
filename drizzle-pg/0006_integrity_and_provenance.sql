-- Referential integrity for the calculator and listing tables, plus the
-- provenance column the pages screen needs to stop "reset" from deleting a
-- page that was never imported from disk.
--
-- Orphans are cleared before each constraint goes on, because these tables have
-- been running without one: deleting a calculator city left its hotels behind,
-- and deleting a hotel left twelve months of price rows nothing could reach.

--> statement-breakpoint
DELETE FROM calculator_prices
WHERE hotel_id NOT IN (SELECT id FROM calculator_hotels);
--> statement-breakpoint
DELETE FROM calculator_hotels
WHERE city_id NOT IN (SELECT id FROM calculator_cities);
--> statement-breakpoint
ALTER TABLE calculator_hotels
  ADD CONSTRAINT calculator_hotels_city_id_fk
  FOREIGN KEY (city_id) REFERENCES calculator_cities(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE calculator_prices
  ADD CONSTRAINT calculator_prices_hotel_id_fk
  FOREIGN KEY (hotel_id) REFERENCES calculator_hotels(id) ON DELETE CASCADE;

-- city_listings and blog_listings reference content by slug rather than by id,
-- deliberately: a curated listing has to survive a venue moving city. A foreign
-- key would force a composite target that does not exist, so these get indexes
-- to find orphans quickly and a scheduled reconciliation instead.
-- (The runner adds IF NOT EXISTS to CREATE INDEX itself; see worker/db/apply-pg-migrations.ts.)
--> statement-breakpoint
CREATE INDEX city_listings_venue_idx
  ON city_listings (venue_city, venue_slug);
--> statement-breakpoint
CREATE INDEX blog_listings_post_slug_idx
  ON blog_listings (post_slug);

-- Where a stored page came from. "import" pages have a file on disk behind
-- them and reset means "serve that file again"; "panel" pages exist only as
-- this row, and reset used to delete them outright with no way back.
--> statement-breakpoint
ALTER TABLE static_pages
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'import';

-- Optimistic concurrency needs a column that changes on every write and can be
-- compared cheaply. updated_at already exists on the content tables; leads and
-- users get one where it was missing.
--> statement-breakpoint
CREATE INDEX audit_log_action_idx ON audit_log (action);
--> statement-breakpoint
CREATE INDEX leads_updated_at_idx ON leads (updated_at);

--> statement-breakpoint
ALTER TABLE city_pages
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- One row, one counter. Bumped by every content write so instances other than
-- the one that handled the save know to drop their caches; see
-- worker/site/content-version.ts.
--> statement-breakpoint
CREATE TABLE content_version (
  id integer PRIMARY KEY,
  version bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
INSERT INTO content_version (id, version) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;
