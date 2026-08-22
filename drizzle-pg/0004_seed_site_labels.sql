INSERT INTO "site_labels" ("key", "value", "emphasis", "updated_by")
VALUES
  ('venue.amenities', 'Hotel', 'Amenities', 'seed'),
  ('venue.faq', 'Frequently Asked', 'Questions', 'seed'),
  ('venue.similar', 'Browse Similar', 'Hotels', 'seed'),
  ('venue.gallery', 'Event Spaces', 'Gallery', 'seed'),
  ('venue.glance', 'AT A', 'GLANCE', 'seed'),
  ('venue.glance.rooms', 'Total Room Inventory', '', 'seed'),
  ('venue.glance.indoor', 'Indoor Venues', '', 'seed'),
  ('venue.glance.outdoor', 'Outdoor Venues', '', 'seed'),
  ('venue.glance.guests', 'Total Guest Capacity', '', 'seed'),
  ('venue.glance.reception', 'Max. Reception Capacity', '', 'seed'),
  ('venue.viewMore', 'View More', '', 'seed'),
  ('venue.airport', 'Airport', '', 'seed'),
  ('venue.station', 'Railway Station', '', 'seed'),
  ('card.details', 'DETAILS', '', 'seed'),
  ('card.availability', 'CHECK AVAILABILITY', '', 'seed'),
  ('card.readMore', 'Read More', '', 'seed'),
  ('blog.toc', 'Table of Contents', '', 'seed'),
  ('blog.faq', 'Frequently Asked', 'Questions', 'seed')
ON CONFLICT ("key") DO NOTHING;
