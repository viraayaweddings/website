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

async function appliedMigrationNames(db: Db): Promise<Set<string>> {
  try {
    const rows = await db.execute<{ name: string }>(sql`SELECT name FROM __migrations`);
    const list = Array.isArray(rows) ? rows : [];
    return new Set(list.map((row) => row.name));
  } catch {
    return new Set();
  }
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

    for (const statement of splitStatements(migration.sql)) {
      try {
        await db.execute(sql.raw(statement));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/already exists/i.test(message)) throw error;
      }
    }

    await db.execute(sql`
      INSERT INTO __migrations (name)
      VALUES (${migration.name})
      ON CONFLICT (name) DO NOTHING
    `);
  }
}
