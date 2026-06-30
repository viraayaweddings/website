-- Extra PostgreSQL indexes for production venue read paths.
-- Prisma schema tracks the B-tree indexes; the trigram GIN index is kept here
-- because Prisma schema does not model pg_trgm operator classes.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Venue_searchText_trgm_idx"
  ON "Venue"
  USING gin ("searchText" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Venue_city_partner_rating_order_idx"
  ON "Venue" ("citySlug", "isBhPartner" DESC, "userRating" DESC, "listingOrder" ASC);

CREATE INDEX IF NOT EXISTS "VenueMedia_venueId_position_idx"
  ON "VenueMedia" ("venueId", "position" ASC);

-- Photographer and Decorator listings also run `searchText ILIKE '%...%'`
-- (Prisma `contains`, mode insensitive). Without a trigram GIN index these are
-- sequential scans; mirror the Venue index for both.
CREATE INDEX IF NOT EXISTS "Photographer_searchText_trgm_idx"
  ON "Photographer"
  USING gin ("searchText" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Decorator_searchText_trgm_idx"
  ON "Decorator"
  USING gin ("searchText" gin_trgm_ops);
