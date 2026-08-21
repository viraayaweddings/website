/**
 * Applies bundled PostgreSQL migrations (no filesystem access required on Vercel).
 */
import { sql } from "drizzle-orm";
import migration0000 from "../../drizzle-pg/0000_magenta_dust.sql?raw";
import type { Db } from "./client";
import { splitStatements } from "./migrations";

const PG_MIGRATIONS: ReadonlyArray<{ name: string; sql: string }> = [
  { name: "0000_magenta_dust", sql: migration0000 },
];

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const parts = [error.message];
  if (error.cause) parts.push(String(error.cause));
  return parts.join(" ");
}

function isAlreadyAppliedError(error: unknown): boolean {
  const text = errorText(error);
  return /already exists|duplicate key|42P07|42710/i.test(text);
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

async function appliedMigrationNames(db: Db): Promise<Set<string>> {
  try {
    const rows = await db.execute<{ name: string }>(sql`SELECT name FROM __migrations`);
    const list = Array.isArray(rows) ? rows : [];
    return new Set(list.map((row) => row.name));
  } catch {
    return new Set();
  }
}

async function markMigrationApplied(db: Db, name: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO __migrations (name)
    VALUES (${name})
    ON CONFLICT (name) DO NOTHING
  `);
}

export async function applyPgMigrations(db: Db): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS __migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const applied = await appliedMigrationNames(db);

  for (const migration of PG_MIGRATIONS) {
    if (applied.has(migration.name)) continue;

    // Build-time drizzle migrate may have created the schema already.
    if (migration.name === "0000_magenta_dust" && (await usersTableExists(db))) {
      await markMigrationApplied(db, migration.name);
      continue;
    }

    for (const statement of splitStatements(migration.sql)) {
      try {
        await db.execute(sql.raw(statement));
      } catch (error) {
        if (!isAlreadyAppliedError(error)) throw error;
      }
    }

    await markMigrationApplied(db, migration.name);
  }
}
