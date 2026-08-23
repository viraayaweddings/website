/**
 * Seeds and refreshes the page shells in `page_templates`.
 *
 * worker/db/seed-templates.ts only ever inserts what is missing, deliberately:
 * a shell is content an admin's edits are rendered into, and re-running the
 * seed must not undo a fix. That leaves no way to push a change *to* a shell,
 * which is what a change to the calculator or listing scripts is -- the home
 * page, all 259 venue pages and all 53 city index pages are rebuilt from eight
 * shells, and editing the site-public originals alone reaches none of them.
 *
 *   node --env-file=.env.local scripts/seed-page-templates.mjs
 *       insert missing shells only (what the build already does)
 *
 *   node --env-file=.env.local scripts/seed-page-templates.mjs --refresh home
 *       overwrite one shell from worker/db/page-templates.generated.ts
 *
 *   node --env-file=.env.local scripts/seed-page-templates.mjs --refresh-calculators
 *       overwrite every shell carrying a calculator or a listing filter, matched
 *       on the shell's own contents rather than a key list so it cannot go stale
 *
 * `--apply` writes; without it this is a dry run.
 * `--if-configured` exits 0 rather than failing when there is no database.
 */
import postgres from "postgres";

const apply = process.argv.includes("--apply");
const ifConfigured = process.argv.includes("--if-configured");
const refreshCalculators = process.argv.includes("--refresh-calculators");

const refreshKeys = new Set(
  process.argv.reduce((keys, arg, index) => {
    if (arg === "--refresh" && process.argv[index + 1]) keys.push(process.argv[index + 1]);
    return keys;
  }, []),
);

/** What makes a shell one the injection writes into. */
const CALCULATOR_MARKER = /ViraayaTax|id="citySelect"|id="hotelId"|id="weddingType"/;

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  if (ifConfigured) {
    console.log("[templates] no database here; nothing to do.");
    process.exit(0);
  }
  console.error("Set DATABASE_URL.");
  process.exit(1);
}

const { PAGE_TEMPLATES } = await import("../worker/db/page-templates.generated.ts");

if (refreshCalculators) {
  for (const template of PAGE_TEMPLATES) {
    if (CALCULATOR_MARKER.test(template.html)) refreshKeys.add(template.key);
  }
  console.log(`[templates] --refresh-calculators matched ${refreshKeys.size} shell(s)`);
}

for (const key of refreshKeys) {
  if (!PAGE_TEMPLATES.some((template) => template.key === key)) {
    console.warn(`[templates] --refresh ${key}: no generated shell with that key`);
  }
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });

try {
  const stored = new Set((await sql`select key from page_templates`).map((row) => row.key));
  const missing = PAGE_TEMPLATES.filter((template) => !stored.has(template.key));
  const refreshing = PAGE_TEMPLATES.filter(
    (template) => refreshKeys.has(template.key) && stored.has(template.key),
  );

  console.log(
    `[templates] generated: ${PAGE_TEMPLATES.length}, stored: ${stored.size}, ` +
      `to insert: ${missing.length}, to overwrite: ${refreshing.length}`,
  );

  if (!apply) {
    missing.forEach((template) => console.log(`   would insert ${template.key}`));
    refreshing.forEach((template) => console.log(`   would overwrite ${template.key}`));
    console.log("[templates] dry run: nothing written to the database");
  } else {
    for (const template of [...missing, ...refreshing]) {
      // One at a time: a shell is roughly 290KB, and several in one statement
      // is more than the driver binds comfortably.
      await sql`
        insert into page_templates (key, kind, html, updated_at)
        values (${template.key}, ${template.kind}, ${template.html}, now())
        on conflict (key) do update
          set kind = excluded.kind, html = excluded.html, updated_at = now()
      `;
      console.log(`[templates] wrote ${template.key}`);
    }

    // Other instances hold these shells in a five-minute cache; without this
    // the change is invisible until that lapses.
    await sql`
      insert into content_version (id, version, updated_at)
      values (1, 1, now())
      on conflict (id) do update
        set version = content_version.version + 1, updated_at = now()
    `;
    console.log("[templates] bumped content_version");
  }
} finally {
  await sql.end({ timeout: 5 });
}
