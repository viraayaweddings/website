/**
 * Imports legacy SQLite seed SQL into Postgres (hotels, blogs, hero, settings, etc.).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import type { Db } from "./client";
import { splitStatements } from "./migrations";
import { seedPageTemplates } from "./seed-templates";

/** Data-only migrations from the old D1/SQLite bundle, in order. */
export const CONTENT_SEED_FILES = [
  "0002_seed_hero_slides.sql",
  "0004_seed_blog_posts.sql",
  "0006_seed_hotels.sql",
  "0008_seed_venue_listings.sql",
  "0010_seed_venue_category.sql",
  "0012_seed_card_pax.sql",
  "0014_seed_blog_listings.sql",
  "0016_seed_page_assignments.sql",
  "0018_seed_city_totals.sql",
  "0020_seed_hotel_video.sql",
  "0021_seed_contact_details.sql",
  "0023_seed_site_labels.sql",
  "0024_fix_excerpt_entities.sql",
  "0026_fix_weeding_planning_slug.sql",
] as const;

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

export async function seedSiteContent(db: Db, root = process.cwd()): Promise<SeedSiteContentResult> {
  const errors: string[] = [];
  let statementsRun = 0;
  let ignoredErrors = 0;

  for (const file of CONTENT_SEED_FILES) {
    const raw = await readFile(join(root, "drizzle", file), "utf8");
    const converted = sqliteToPostgres(raw);

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
        errors.push(`${file}: ${message.slice(0, 240)}`);
      }
    }
  }

  await seedPageTemplates(db);

  return {
    files: CONTENT_SEED_FILES.length,
    statementsRun,
    ignoredErrors,
    errors: errors.slice(0, 25),
  };
}
