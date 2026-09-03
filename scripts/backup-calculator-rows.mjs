/**
 * Takes a restore point for the calculator markup that lives in the database.
 *
 * Git covers the files. It does not cover the rows, and the rows are what the
 * site actually renders: the home page and all 259 venue pages are rebuilt from
 * `page_templates`, and /hotel-cost-calculator, /compare-hotel and the ten
 * `destination-wedding-in-<city>` pages are stored whole in `static_pages`.
 * Pushing a calculator change overwrites those rows -- that is what
 * `seed-page-templates.mjs --refresh-calculators` and
 * `seed-static-pages.mjs --refresh-calculators` do -- and a `git revert`
 * afterwards restores the source files while leaving every visitor still
 * looking at the new markup. This is the missing half of that revert.
 *
 * What it captures, and why only this:
 *
 *   page_templates      the shells the change rewrites
 *   static_pages        the stored pages the change rewrites
 *   calculator_cities   \
 *   calculator_hotels    |  not rewritten by the change, but they are what the
 *   calculator_prices    |  restored markup has to price against, so a restore
 *   calculator_taxes     |  from a drifted dataset is not the same site
 *   calculator_budgets   |
 *   calculator_currencies/
 *
 * `leads`, `users`, `sessions` and `audit_log` are deliberately NOT captured.
 * The change does not touch them, and a dump of them would put customer
 * contact details and password hashes in a file on someone's laptop for no
 * gain.
 *
 * Written with the `postgres` package already in package.json rather than
 * pg_dump, because pg_dump is not installed on the machines this gets run from.
 *
 *   node --env-file=.env.local scripts/backup-calculator-rows.mjs
 *       take a restore point into .backups/
 *
 *   node --env-file=.env.local scripts/backup-calculator-rows.mjs \
 *       --restore .backups/db-calculator-rows-<stamp>.json.gz
 *       report what restoring would change; writes nothing
 *
 *   node --env-file=.env.local scripts/backup-calculator-rows.mjs \
 *       --restore .backups/db-calculator-rows-<stamp>.json.gz --apply
 *
 * `--if-configured` exits 0 rather than failing when there is no database, so
 * this can sit in a build command.
 */
import { gunzipSync, gzipSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const argv = process.argv.slice(2);
const apply = argv.includes("--apply");
const ifConfigured = argv.includes("--if-configured");
const restoreFrom = argv[argv.indexOf("--restore") + 1] && argv.includes("--restore")
  ? argv[argv.indexOf("--restore") + 1]
  : null;

/**
 * Every table in the restore point, with the column that identifies a row.
 *
 * The key matters on restore: these are updated in place by key rather than
 * replaced wholesale, so a page an admin added after the backup was taken is
 * reported rather than silently deleted.
 */
const TABLES = [
  { name: "page_templates", key: "key" },
  { name: "static_pages", key: "path" },
  { name: "calculator_cities", key: "id" },
  { name: "calculator_hotels", key: "id" },
  { name: "calculator_prices", key: "id" },
  { name: "calculator_taxes", key: "code" },
  { name: "calculator_budgets", key: "code" },
  { name: "calculator_currencies", key: "code" },
];

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  if (ifConfigured) {
    console.log("[backup] no database here; nothing to do.");
    process.exit(0);
  }
  console.error(
    "Set DATABASE_URL. Either export it, or put it in .env.local and run with\n" +
      "  node --env-file=.env.local scripts/backup-calculator-rows.mjs",
  );
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });

/** `2026-08-31T21-36-04Z`: sorts chronologically and is safe in a filename. */
function stamp() {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z").replace(/:/g, "-");
}

async function existingTables() {
  const rows = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public'
  `;
  return new Set(rows.map((row) => row.table_name));
}

async function backup() {
  const present = await existingTables();
  const captured = {};
  const summary = [];

  for (const table of TABLES) {
    if (!present.has(table.name)) {
      // A table that does not exist yet is not a failure: calculator_taxes
      // post-dates some databases, and calculator_budgets post-dates all of
      // them. Recording the absence is what tells a restore to leave it alone.
      captured[table.name] = null;
      summary.push(`  ${table.name.padEnd(22)} absent`);
      continue;
    }
    const rows = await sql`select * from ${sql(table.name)}`;
    captured[table.name] = rows.map((row) => ({ ...row }));
    const bytes = Buffer.byteLength(JSON.stringify(captured[table.name]));
    summary.push(
      `  ${table.name.padEnd(22)} ${String(rows.length).padStart(6)} rows  ${(bytes / 1024).toFixed(0)} KB`,
    );
  }

  const payload = {
    takenAt: new Date().toISOString(),
    reason: "restore point before the calculator change (place / optional hotel / dates / budget)",
    keys: Object.fromEntries(TABLES.map((table) => [table.name, table.key])),
    tables: captured,
  };

  mkdirSync(".backups", { recursive: true });
  const path = `.backups/db-calculator-rows-${stamp()}.json.gz`;
  writeFileSync(path, gzipSync(Buffer.from(JSON.stringify(payload)), { level: 9 }));

  console.log("[backup] captured:");
  for (const line of summary) console.log(line);
  console.log(`\n[backup] wrote ${path}`);
  console.log("[backup] restore with:");
  console.log(`  node --env-file=.env.local scripts/backup-calculator-rows.mjs --restore ${path} --apply`);
}

function readPayload(path) {
  const raw = readFileSync(path);
  // Written gzipped, but accept a plain .json so a hand-edited copy still works.
  const text = path.endsWith(".gz") ? gunzipSync(raw).toString("utf8") : raw.toString("utf8");
  const payload = JSON.parse(text);
  if (!payload || typeof payload.tables !== "object") {
    throw new Error(`${path} is not a restore point taken by this script`);
  }
  return payload;
}

async function restore(path) {
  const payload = readPayload(path);
  const present = await existingTables();

  console.log(`[restore] ${path}`);
  console.log(`[restore] taken ${payload.takenAt}`);
  if (payload.reason) console.log(`[restore] reason: ${payload.reason}`);
  console.log("");

  const writes = [];
  const notes = [];

  for (const table of TABLES) {
    const rows = payload.tables[table.name];
    if (rows === null || rows === undefined) {
      notes.push(`${table.name}: absent when the backup was taken; left untouched`);
      continue;
    }
    if (!present.has(table.name)) {
      notes.push(`${table.name}: in the backup but not in this database; skipped`);
      continue;
    }

    const key = payload.keys?.[table.name] ?? table.key;
    const live = await sql`select * from ${sql(table.name)}`;
    const liveByKey = new Map(live.map((row) => [String(row[key]), row]));
    const backedUpKeys = new Set(rows.map((row) => String(row[key])));

    let differing = 0;
    let missing = 0;
    for (const row of rows) {
      const current = liveByKey.get(String(row[key]));
      if (!current) {
        missing += 1;
        writes.push({ table: table.name, key, row, kind: "reinsert" });
        continue;
      }
      // updated_at moves on its own; comparing it would mark every row dirty.
      const changed = Object.keys(row).some(
        (column) => column !== "updated_at" && String(current[column]) !== String(row[column]),
      );
      if (changed) {
        differing += 1;
        writes.push({ table: table.name, key, row, kind: "revert" });
      }
    }

    // Reported, never deleted: a row added after the backup is somebody's work,
    // and this script's job is to undo one change, not to roll the site back to
    // a point in time.
    const added = live.filter((row) => !backedUpKeys.has(String(row[key]))).map((row) => String(row[key]));

    console.log(
      `  ${table.name.padEnd(22)} ${String(differing).padStart(5)} changed, ` +
        `${String(missing).padStart(4)} deleted, ${String(added.length).padStart(4)} added since`,
    );
    if (added.length > 0) {
      notes.push(
        `${table.name}: ${added.length} row(s) added since the backup are left in place ` +
          `(${added.slice(0, 5).join(", ")}${added.length > 5 ? ", ..." : ""})`,
      );
    }
  }

  console.log("");
  for (const note of notes) console.log(`  ! ${note}`);
  if (notes.length > 0) console.log("");

  if (writes.length === 0) {
    console.log("[restore] the database already matches the restore point; nothing to write.");
    return;
  }

  if (!apply) {
    console.log(`[restore] dry run: ${writes.length} row(s) would be written back. Nothing written.`);
    console.log("[restore] re-run with --apply to write.");
    return;
  }

  // One row at a time: a shell is roughly 290KB, more than the driver binds
  // comfortably in a batch. This is the same reason migrate-stored-pages.mjs
  // writes serially.
  for (const write of writes) {
    const { table, key, row } = write;
    const columns = Object.keys(row).filter((column) => column !== key);
    await sql`
      insert into ${sql(table)} ${sql(row)}
      on conflict (${sql(key)}) do update set ${sql(
        Object.fromEntries(columns.map((column) => [column, row[column]])),
      )}
    `;
  }

  // Other instances cache these for up to five minutes; without the bump the
  // restore is invisible until the longest of them lapses.
  await sql`
    insert into content_version (id, version, updated_at)
    values (1, 1, now())
    on conflict (id) do update
      set version = content_version.version + 1, updated_at = now()
  `;

  console.log(`[restore] wrote ${writes.length} row(s) and bumped content_version.`);
  console.log("[restore] the new calculator table, if it was created, is dropped separately:");
  console.log("  drop table if exists calculator_budgets;");
}

try {
  if (restoreFrom) await restore(restoreFrom);
  else await backup();
} finally {
  await sql.end({ timeout: 5 });
}
