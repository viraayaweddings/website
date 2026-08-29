/**
 * Applies bundled PostgreSQL migrations (no filesystem access required on Vercel).
 */
import { sql } from "drizzle-orm";
import type postgres from "postgres";
import migration0000 from "../../drizzle-pg/0000_magenta_dust.sql?raw";
import migration0001 from "../../drizzle-pg/0001_calculator.sql?raw";
import migration0002 from "../../drizzle-pg/0002_static_pages.sql?raw";
import migration0003 from "../../drizzle-pg/0003_media_dimensions.sql?raw";
import migration0004 from "../../drizzle-pg/0004_seed_site_labels.sql?raw";
import migration0005 from "../../drizzle-pg/0005_city_page_publishing.sql?raw";
import migration0006 from "../../drizzle-pg/0006_integrity_and_provenance.sql?raw";
import migration0007 from "../../drizzle-pg/0007_calculator_taxes.sql?raw";
import migration0008 from "../../drizzle-pg/0008_venue_wedding_types.sql?raw";
import migration0009 from "../../drizzle-pg/0009_hide_nonoperational_cities.sql?raw";
import type { Db } from "./client";
import { splitStatements } from "./migrations";

const PG_MIGRATIONS: ReadonlyArray<{ name: string; sql: string }> = [
  { name: "0000_magenta_dust", sql: migration0000 },
  { name: "0001_calculator", sql: migration0001 },
  { name: "0002_static_pages", sql: migration0002 },
  { name: "0003_media_dimensions", sql: migration0003 },
  { name: "0004_seed_site_labels", sql: migration0004 },
  { name: "0005_city_page_publishing", sql: migration0005 },
  { name: "0006_integrity_and_provenance", sql: migration0006 },
  { name: "0007_calculator_taxes", sql: migration0007 },
  { name: "0008_venue_wedding_types", sql: migration0008 },
  { name: "0009_hide_nonoperational_cities", sql: migration0009 },
];

const MIGRATION_LOCK_KEY = 842_001;

/** The migrations this build expects the database to already have. */
export const PG_MIGRATION_NAMES: ReadonlyArray<string> = PG_MIGRATIONS.map((migration) => migration.name);

/**
 * Which bundled migrations the database has not recorded yet.
 *
 * Read-only on purpose: this runs on the request path, and the request path
 * must not issue DDL. A missing `__migrations` table means nothing has been
 * applied, which is a pending list, not an error.
 */
export async function pendingMigrationNames(sqlClient: postgres.Sql): Promise<string[]> {
  const applied = await appliedMigrationNames(sqlClient);
  return PG_MIGRATIONS.filter((migration) => !applied.has(migration.name)).map((m) => m.name);
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const parts = [error.message];
  if (error.cause) parts.push(String(error.cause));
  const code = (error as { code?: string }).code;
  if (code) parts.push(code);
  return parts.join(" ");
}

function isAlreadyAppliedError(error: unknown): boolean {
  const code = error && typeof error === "object" ? (error as { code?: string }).code : undefined;
  if (code === "42P07" || code === "42710") return true;
  const text = errorText(error);
  return /already exists|duplicate key|42P07|42710/i.test(text);
}

/** Concurrent Vercel lambdas can both run bundled DDL on cold start. */
function idempotentStatement(statement: string): string {
  const trimmed = statement.trim();
  // A migration that already says IF NOT EXISTS would otherwise get a second
  // one bolted on, and `CREATE INDEX IF NOT EXISTS IF NOT EXISTS` fails to
  // parse -- taking every later migration, and the database client with it.
  if (/^CREATE (?:TABLE|(?:UNIQUE )?INDEX) IF NOT EXISTS /i.test(trimmed)) return trimmed;
  if (/^CREATE TABLE /i.test(trimmed)) {
    return trimmed.replace(/^CREATE TABLE /i, "CREATE TABLE IF NOT EXISTS ");
  }
  if (/^CREATE UNIQUE INDEX /i.test(trimmed)) {
    return trimmed.replace(/^CREATE UNIQUE INDEX /i, "CREATE UNIQUE INDEX IF NOT EXISTS ");
  }
  if (/^CREATE INDEX /i.test(trimmed)) {
    return trimmed.replace(/^CREATE INDEX /i, "CREATE INDEX IF NOT EXISTS ");
  }
  return trimmed;
}

async function usersTableExists(db: Db): Promise<boolean> {
  try {
    const rows = await db.execute<{ table_name: string }>(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
      LIMIT 1
    `);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

async function appliedMigrationNames(sql: postgres.Sql): Promise<Set<string>> {
  try {
    const rows = await sql<{ name: string }[]>`
      SELECT name FROM __migrations
    `;
    return new Set(rows.map((row) => row.name));
  } catch {
    return new Set();
  }
}

export async function applyPgMigrations(db: Db, sqlClient: postgres.Sql): Promise<void> {
  await sqlClient.unsafe(`
    CREATE TABLE IF NOT EXISTS __migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const applied = await appliedMigrationNames(sqlClient);
  if (PG_MIGRATIONS.every((migration) => applied.has(migration.name))) {
    return;
  }

  if (
    !applied.has("0000_magenta_dust") &&
    (await usersTableExists(db))
  ) {
    await sqlClient`
      INSERT INTO __migrations (name)
      VALUES (${"0000_magenta_dust"})
      ON CONFLICT (name) DO NOTHING
    `;
    return;
  }

  const lockRows = await sqlClient<{ locked: boolean }[]>`
    SELECT pg_try_advisory_lock(${MIGRATION_LOCK_KEY}) AS locked
  `;
  const locked = lockRows[0]?.locked === true;

  if (!locked) {
    // Another cold start is migrating; don't block this request for minutes.
    if (await usersTableExists(db)) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (await usersTableExists(db)) return;
  }

  try {
    const pending = await appliedMigrationNames(sqlClient);

    for (const migration of PG_MIGRATIONS) {
      if (pending.has(migration.name)) continue;

      if (migration.name === "0000_magenta_dust" && (await usersTableExists(db))) {
        await sqlClient`
          INSERT INTO __migrations (name)
          VALUES (${migration.name})
          ON CONFLICT (name) DO NOTHING
        `;
        continue;
      }

      for (const statement of splitStatements(migration.sql)) {
        try {
          await sqlClient.unsafe(idempotentStatement(statement));
        } catch (error) {
          if (!isAlreadyAppliedError(error)) throw error;
        }
      }

      await sqlClient`
        INSERT INTO __migrations (name)
        VALUES (${migration.name})
        ON CONFLICT (name) DO NOTHING
      `;
    }
  } finally {
    if (locked) {
      await sqlClient.unsafe(`SELECT pg_advisory_unlock(${MIGRATION_LOCK_KEY})`).catch(() => undefined);
    }
  }
}
