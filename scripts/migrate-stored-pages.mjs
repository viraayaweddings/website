/**
 * Applies the page-data detach to the pages already in the database.
 *
 * The shells in `page_templates` and the whole pages in `static_pages` are rows,
 * not files: a deploy replaces the code but leaves them exactly as they were.
 * Without this pass, every venue page and every stored calculator page would go
 * on quoting the 9% + 9% that was compiled into it, showing the 53-city list
 * baked into its markup, and offering the six wedding-type filters baked into
 * the city index pages -- while the source files, the tests and the
 * admin panel all said otherwise. It would look entirely normal.
 *
 * It edits the stored markup in place rather than replacing the row from its
 * file, so an admin's own edits to those pages survive. The transform is
 * idempotent and reports rather than guesses, which is why this is safe to run
 * on every deploy: it rewrites each row once and is a no-op afterwards.
 *
 *   node --env-file=.env.local scripts/migrate-stored-pages.mjs
 *       report what would change
 *
 *   node --env-file=.env.local scripts/migrate-stored-pages.mjs --apply
 *
 * `--if-configured` exits 0 rather than failing when there is no database, so
 * it can sit in the build command.
 */
import postgres from "postgres";
import { PAGE_DATA_MARKER, transform } from "./lib/page-data-transform.mjs";

const apply = process.argv.includes("--apply");
const ifConfigured = process.argv.includes("--if-configured");

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  if (ifConfigured) {
    console.log("[page-data] no database here; nothing to do.");
    process.exit(0);
  }
  console.error("Set DATABASE_URL.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });

let failures = 0;
const updates = { page_templates: [], static_pages: [] };

function convert(html, where) {
  if (!PAGE_DATA_MARKER.test(html)) return null;
  const result = transform(html);
  for (const problem of result.problems) {
    console.error(`  ! ${where}: ${problem}`);
    failures += 1;
  }
  return result.changed ? result.html : null;
}

try {
  for (const row of await sql`select key, html from page_templates`) {
    const next = convert(row.html, `page_templates/${row.key}`);
    if (next) updates.page_templates.push({ id: row.key, html: next });
  }

  for (const row of await sql`select path, html from static_pages`) {
    const next = convert(row.html, `static_pages${row.path}`);
    if (next) updates.static_pages.push({ id: row.path, html: next });
  }

  const total = updates.page_templates.length + updates.static_pages.length;

  if (failures) {
    console.error(`\n[page-data] ${failures} replacement(s) did not match. Nothing was written.`);
    process.exit(1);
  }

  if (total === 0) {
    console.log("[page-data] stored pages already read their values from the database.");
  } else if (!apply) {
    for (const row of updates.page_templates) console.log(`   would rewrite shell ${row.id}`);
    for (const row of updates.static_pages) console.log(`   would rewrite page ${row.id}`);
    console.log(`[page-data] dry run: ${total} row(s) would change, nothing written`);
  } else {
    // One at a time: a shell is roughly 290KB, more than the driver binds
    // comfortably in a batch.
    for (const row of updates.page_templates) {
      await sql`update page_templates set html = ${row.html}, updated_at = now() where key = ${row.id}`;
      console.log(`[page-data] rewrote shell ${row.id}`);
    }
    for (const row of updates.static_pages) {
      await sql`update static_pages set html = ${row.html}, updated_at = now() where path = ${row.id}`;
      console.log(`[page-data] rewrote page ${row.id}`);
    }

    // Other instances hold these in caches of up to five minutes; without this
    // the change is invisible until the longest of them lapses.
    await sql`
      insert into content_version (id, version, updated_at)
      values (1, 1, now())
      on conflict (id) do update
        set version = content_version.version + 1, updated_at = now()
    `;
    console.log(`[page-data] rewrote ${total} row(s) and bumped content_version`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
