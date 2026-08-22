import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";

// migrations.ts cannot be imported here: it pulls in .sql?raw, which only Vite
// resolves. The separator is a constant, so the split is repeated instead.
const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

function splitStatements(sql) {
  return sql.split(STATEMENT_BREAKPOINT).map((statement) => statement.trim()).filter(Boolean);
}

/**
 * The runner rewrites bare DDL to add IF NOT EXISTS, because two cold starts
 * can run the same migration at once. A migration that already says it gets a
 * second one bolted on, and `CREATE INDEX IF NOT EXISTS IF NOT EXISTS` does not
 * parse -- which takes out every later migration and the database client with
 * it, so the whole site falls back to its cloned markup.
 */
test("no Postgres migration writes IF NOT EXISTS itself", async () => {
  const dir = "drizzle-pg";
  const files = (await readdir(dir)).filter((name) => name.endsWith(".sql"));
  assert.ok(files.length > 0, "expected migrations to check");

  for (const file of files) {
    for (const statement of splitStatements(await readFile(`${dir}/${file}`, "utf8"))) {
      assert.doesNotMatch(
        statement,
        /^CREATE\s+(?:TABLE|(?:UNIQUE\s+)?INDEX)\s+IF\s+NOT\s+EXISTS/i,
        `${file}: the runner adds IF NOT EXISTS; writing it here doubles it`,
      );
    }
  }
});
