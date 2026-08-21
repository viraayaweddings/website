/**
 * Applies bundled PostgreSQL migrations (no filesystem access required on Vercel).
 */
import { sql } from "drizzle-orm";
import type postgres from "postgres";
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

  for (const migration of PG_MIGRATIONS) {
    if (applied.has(migration.name)) continue;

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
        await sqlClient.unsafe(statement);
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
}
