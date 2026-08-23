/**
 * Applies the PostgreSQL migrations in drizzle-pg/.
 *
 * This is the only place schema changes are applied. The runtime used to do it
 * on the first request into every cold lambda; it now only checks that this
 * script has run, so DDL never lands on the request path and the runtime role
 * does not need CREATE.
 *
 * The `__migrations` table is shared with worker/db/apply-pg-migrations.ts, so
 * a database migrated by either route is understood by both.
 *
 *   node scripts/db-migrate.mjs                  apply, fail if no database
 *   node scripts/db-migrate.mjs --if-configured  apply, skip quietly if none
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

/**
 * The separator drizzle-kit writes between statements.
 *
 * worker/db/migrations.ts cannot be imported here: it pulls in .sql?raw, which
 * only Vite resolves. The separator is a constant, so the split is repeated --
 * the same trade tests/migration-statements.test.mjs makes.
 */
const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

function splitStatements(sql) {
  return sql
    .split(STATEMENT_BREAKPOINT)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const optional = process.argv.includes("--if-configured");

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!url) {
  const message =
    "No Postgres URL found. Link Neon to the Vercel project or set DATABASE_URL / POSTGRES_URL.";
  if (optional) {
    console.log(`[db:migrate] skipped — ${message}`);
    process.exit(0);
  }
  console.error(message);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const folder = join(root, "drizzle-pg");

const files = readdirSync(folder)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const sql = postgres(url, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL_NO_VERIFY === "true" ? "require" : { rejectUnauthorized: true },
  connect_timeout: 20,
});

/** Concurrent builds of the same project can both reach this. */
const LOCK_KEY = 842_001;

try {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS __migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await sql`SELECT pg_advisory_lock(${LOCK_KEY})`;

  try {
    const applied = new Set((await sql`SELECT name FROM __migrations`).map((row) => row.name));
    let count = 0;

    for (const file of files) {
      const name = file.replace(/\.sql$/, "");
      if (applied.has(name)) continue;

      for (const statement of splitStatements(readFileSync(join(folder, file), "utf8"))) {
        await sql.unsafe(statement);
      }

      await sql`INSERT INTO __migrations (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
      console.log(`[db:migrate] applied ${name}`);
      count += 1;
    }

    console.log(
      count === 0
        ? `[db:migrate] up to date (${files.length} migrations)`
        : `[db:migrate] applied ${count} migration${count === 1 ? "" : "s"}`,
    );
  } finally {
    await sql`SELECT pg_advisory_unlock(${LOCK_KEY})`.catch(() => undefined);
  }
} finally {
  await sql.end({ timeout: 5 });
}
