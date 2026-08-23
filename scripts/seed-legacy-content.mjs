/**
 * Imports the legacy data-only seed files into Postgres from the filesystem.
 *
 * The runtime seed module imports `*.sql?raw`, which only the app bundler
 * understands. This script is for local/admin migrations where Node reads the
 * SQL files directly.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

const CONTENT_SEEDS = [
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
];

function splitStatements(sqlText) {
  return sqlText
    .split(STATEMENT_BREAKPOINT)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function sqliteToPostgres(sqlText) {
  return sqlText.replace(/`([^`]+)`/g, '"$1"');
}

function isDataStatement(statement) {
  const head = statement.trimStart().toUpperCase();
  return head.startsWith("INSERT") || head.startsWith("UPDATE") || head.startsWith("DELETE");
}

function isIgnorableSeedError(message) {
  return /duplicate key|unique constraint|already exists|23505/i.test(message);
}

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!databaseUrl) {
  console.error("Set DATABASE_URL or POSTGRES_URL.");
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL_NO_VERIFY === "true" ? "require" : { rejectUnauthorized: true },
  connect_timeout: 20,
});

let statementsRun = 0;
let ignoredErrors = 0;
const errors = [];

try {
  for (const file of CONTENT_SEEDS) {
    const converted = sqliteToPostgres(readFileSync(join(process.cwd(), "drizzle", file), "utf8"));

    for (const statement of splitStatements(converted)) {
      if (!isDataStatement(statement)) continue;

      try {
        await sql.unsafe(statement);
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

  console.log(
    `[legacy-seed] ran ${statementsRun} data statement${statementsRun === 1 ? "" : "s"}` +
      (ignoredErrors ? `, ignored ${ignoredErrors} duplicate${ignoredErrors === 1 ? "" : "s"}` : ""),
  );

  if (errors.length) {
    console.error("[legacy-seed] errors:");
    for (const error of errors.slice(0, 25)) console.error(`  - ${error}`);
    process.exitCode = 1;
  }
} finally {
  await sql.end({ timeout: 5 });
}
