/**
 * Ordered migration list.
 *
 * The hosting platform applies `dist/.openai/drizzle` on deploy, but local
 * dev (Miniflare) and preview databases have no such step, so the worker
 * applies anything outstanding itself on first use. Applying twice is a
 * no-op: every applied name is recorded in `__migrations`.
 *
 * Add each new drizzle-kit output here, in order.
 */
import migration0000 from "../../drizzle/0000_admin_foundation.sql?raw";
import migration0001 from "../../drizzle/0001_site_settings.sql?raw";
import migration0002 from "../../drizzle/0002_seed_hero_slides.sql?raw";
import migration0003 from "../../drizzle/0003_blog_posts.sql?raw";
import migration0004 from "../../drizzle/0004_seed_blog_posts.sql?raw";
import migration0005 from "../../drizzle/0005_hotels.sql?raw";
import migration0006 from "../../drizzle/0006_seed_hotels.sql?raw";
import migration0007 from "../../drizzle/0007_venue_listings.sql?raw";
import migration0008 from "../../drizzle/0008_seed_venue_listings.sql?raw";
import migration0009 from "../../drizzle/0009_venue_category.sql?raw";
import migration0010 from "../../drizzle/0010_seed_venue_category.sql?raw";
import migration0011 from "../../drizzle/0011_card_pax.sql?raw";
import migration0012 from "../../drizzle/0012_seed_card_pax.sql?raw";
import migration0013 from "../../drizzle/0013_blog_listings.sql?raw";
import migration0014 from "../../drizzle/0014_seed_blog_listings.sql?raw";
import migration0015 from "../../drizzle/0015_page_templates.sql?raw";
import migration0016 from "../../drizzle/0016_seed_page_assignments.sql?raw";
import migration0017 from "../../drizzle/0017_city_totals.sql?raw";
import migration0018 from "../../drizzle/0018_seed_city_totals.sql?raw";
import migration0019 from "../../drizzle/0019_hotel_video.sql?raw";
import migration0020 from "../../drizzle/0020_seed_hotel_video.sql?raw";
import migration0021 from "../../drizzle/0021_seed_contact_details.sql?raw";
import migration0022 from "../../drizzle/0022_site_labels.sql?raw";
import migration0023 from "../../drizzle/0023_seed_site_labels.sql?raw";
import migration0024 from "../../drizzle/0024_fix_excerpt_entities.sql?raw";
import migration0025 from "../../drizzle/0025_rate_limits.sql?raw";
import migration0026 from "../../drizzle/0026_fix_weeding_planning_slug.sql?raw";

export const MIGRATIONS: ReadonlyArray<{ name: string; sql: string }> = [
  { name: "0000_admin_foundation", sql: migration0000 },
  { name: "0001_site_settings", sql: migration0001 },
  { name: "0002_seed_hero_slides", sql: migration0002 },
  { name: "0003_blog_posts", sql: migration0003 },
  { name: "0004_seed_blog_posts", sql: migration0004 },
  { name: "0005_hotels", sql: migration0005 },
  { name: "0006_seed_hotels", sql: migration0006 },
  { name: "0007_venue_listings", sql: migration0007 },
  { name: "0008_seed_venue_listings", sql: migration0008 },
  { name: "0009_venue_category", sql: migration0009 },
  { name: "0010_seed_venue_category", sql: migration0010 },
  { name: "0011_card_pax", sql: migration0011 },
  { name: "0012_seed_card_pax", sql: migration0012 },
  { name: "0013_blog_listings", sql: migration0013 },
  { name: "0014_seed_blog_listings", sql: migration0014 },
  { name: "0015_page_templates", sql: migration0015 },
  { name: "0016_seed_page_assignments", sql: migration0016 },
  { name: "0017_city_totals", sql: migration0017 },
  { name: "0018_seed_city_totals", sql: migration0018 },
  { name: "0019_hotel_video", sql: migration0019 },
  { name: "0020_seed_hotel_video", sql: migration0020 },
  { name: "0021_seed_contact_details", sql: migration0021 },
  { name: "0022_site_labels", sql: migration0022 },
  { name: "0023_seed_site_labels", sql: migration0023 },
  { name: "0024_fix_excerpt_entities", sql: migration0024 },
  { name: "0025_rate_limits", sql: migration0025 },
  { name: "0026_fix_weeding_planning_slug", sql: migration0026 },
];

/** drizzle-kit separates statements with this marker. */
export const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

export function splitStatements(sql: string): string[] {
  return sql
    .split(STATEMENT_BREAKPOINT)
    .map((statement) => statement.trim())
    .filter(Boolean);
}
