/**
 * Imports legacy SQLite seed SQL into Postgres (hotels, blogs, hero, settings, etc.).
 * SQL is bundled at build time so seeding works on Vercel without filesystem access.
 */
import { sql } from "drizzle-orm";
import type { Db } from "./client";
import { splitStatements } from "./migrations";
import { seedPageTemplates } from "./seed-templates";
import seed0002 from "../../drizzle/0002_seed_hero_slides.sql?raw";
import seed0004 from "../../drizzle/0004_seed_blog_posts.sql?raw";
import seed0006 from "../../drizzle/0006_seed_hotels.sql?raw";
import seed0008 from "../../drizzle/0008_seed_venue_listings.sql?raw";
import seed0010 from "../../drizzle/0010_seed_venue_category.sql?raw";
import seed0012 from "../../drizzle/0012_seed_card_pax.sql?raw";
import seed0014 from "../../drizzle/0014_seed_blog_listings.sql?raw";
import seed0016 from "../../drizzle/0016_seed_page_assignments.sql?raw";
import seed0018 from "../../drizzle/0018_seed_city_totals.sql?raw";
import seed0020 from "../../drizzle/0020_seed_hotel_video.sql?raw";
import seed0021 from "../../drizzle/0021_seed_contact_details.sql?raw";
import seed0023 from "../../drizzle/0023_seed_site_labels.sql?raw";
import seed0024 from "../../drizzle/0024_fix_excerpt_entities.sql?raw";
import seed0026 from "../../drizzle/0026_fix_weeding_planning_slug.sql?raw";

/** Data-only migrations from the old D1/SQLite bundle, in order. */
const CONTENT_SEEDS: ReadonlyArray<{ name: string; sql: string }> = [
  { name: "0002_seed_hero_slides", sql: seed0002 },
  { name: "0004_seed_blog_posts", sql: seed0004 },
  { name: "0006_seed_hotels", sql: seed0006 },
  { name: "0008_seed_venue_listings", sql: seed0008 },
  { name: "0010_seed_venue_category", sql: seed0010 },
  { name: "0012_seed_card_pax", sql: seed0012 },
  { name: "0014_seed_blog_listings", sql: seed0014 },
  { name: "0016_seed_page_assignments", sql: seed0016 },
  { name: "0018_seed_city_totals", sql: seed0018 },
  { name: "0020_seed_hotel_video", sql: seed0020 },
  { name: "0021_seed_contact_details", sql: seed0021 },
  { name: "0023_seed_site_labels", sql: seed0023 },
  { name: "0024_fix_excerpt_entities", sql: seed0024 },
  { name: "0026_fix_weeding_planning_slug", sql: seed0026 },
];

export function sqliteToPostgres(sqlText: string): string {
  return sqlText.replace(/`([^`]+)`/g, '"$1"');
}

function isDataStatement(statement: string): boolean {
  const head = statement.trimStart().toUpperCase();
  return head.startsWith("INSERT") || head.startsWith("UPDATE") || head.startsWith("DELETE");
}

function isIgnorableSeedError(message: string): boolean {
  return /duplicate key|unique constraint|already exists|23505/i.test(message);
}

export interface SeedSiteContentResult {
  files: number;
  statementsRun: number;
  ignoredErrors: number;
  errors: string[];
}

export async function seedSiteContent(db: Db): Promise<SeedSiteContentResult> {
  const errors: string[] = [];
  let statementsRun = 0;
  let ignoredErrors = 0;

  for (const file of CONTENT_SEEDS) {
    const converted = sqliteToPostgres(file.sql);

    for (const statement of splitStatements(converted)) {
      if (!isDataStatement(statement)) continue;

      try {
        await db.execute(sql.raw(statement));
        statementsRun += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isIgnorableSeedError(message)) {
          ignoredErrors += 1;
          continue;
        }
        errors.push(`${file.name}: ${message.slice(0, 240)}`);
      }
    }
  }

  await seedPageTemplates(db);

  return {
    files: CONTENT_SEEDS.length,
    statementsRun,
    ignoredErrors,
    errors: errors.slice(0, 25),
  };
}
