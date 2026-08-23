/**
 * Checks that nothing a page shows still comes from a file.
 *
 * The pages were detached from hardcoded values in three places at once:
 * the source markup under site-public, the shells in `page_templates`, and the
 * whole pages in `static_pages`. The first is a code change and lands with a
 * deploy; the other two are rows, and a deploy does not touch them -- they need
 * scripts/migrate-stored-pages.mjs, which the Vercel build runs.
 *
 * Forgetting either leaves a page quoting a tax rate nobody can edit, or
 * showing a city list that ignores the admin panel, and it looks completely
 * normal. This is what turns that into a red line.
 *
 *   node --env-file=.env.local scripts/audit-page-data-sources.mjs
 *
 * Exits non-zero on any finding, so it can gate a deploy.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { BAKED_CITY_OPTIONS, BAKED_WEDDING_TYPES, BANNED_PATTERNS } from "./lib/page-data-transform.mjs";

const problems = [];
const notes = [];

/* --------------------------------------------------------- source files --- */

function scan(html, where) {
  // The same patterns the transform removes. A picker whose <select> still
  // carries city rows is a second source for a list the panel now owns.
  for (const [pattern, label] of BANNED_PATTERNS) {
    if (pattern.test(html)) problems.push(`${where}: ${label}`);
  }
  if (BAKED_CITY_OPTIONS.test(html)) problems.push(`${where}: baked city <option> list`);
  if (BAKED_WEDDING_TYPES.test(html)) problems.push(`${where}: baked wedding-type checkboxes`);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (entry.endsWith(".html")) out.push(path);
  }
  return out;
}

let scanned = 0;
for (const file of walk("site-public")) {
  scan(readFileSync(file, "utf8"), file);
  scanned += 1;
}
notes.push(`scanned ${scanned} source pages under site-public`);

// The static JSON copies must not come back.
for (const path of ["site-public/data/calculator", "site-public/data/hotel-listing-data.json"]) {
  try {
    statSync(path);
    problems.push(`${path} exists again; that data is served from the database`);
  } catch {
    notes.push(`no ${path} on disk`);
  }
}

const { PAGE_TEMPLATES } = await import("../worker/db/page-templates.generated.ts");
for (const template of PAGE_TEMPLATES) scan(template.html, `generated shell ${template.key}`);
notes.push(`scanned ${PAGE_TEMPLATES.length} generated shells`);

/* -------------------------------------------------------------- database --- */

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  console.log(problems.length ? "" : "[page-data] source files clean.");
  for (const note of notes) console.log(`  - ${note}`);
  for (const problem of problems) console.error(`  ! ${problem}`);
  console.log("\n[page-data] no DATABASE_URL: the stored copies were not checked.");
  process.exit(problems.length ? 1 : 0);
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });

try {
  for (const row of await sql`select key, html from page_templates`) {
    scan(row.html, `page_templates/${row.key}`);
  }
  for (const row of await sql`select path, html from static_pages`) {
    scan(row.html, `static_pages${row.path}`);
  }
  notes.push("scanned every stored shell and page");

  // --- the data itself ----------------------------------------------------
  const [taxes, cities, hotels, priced, currencies] = await Promise.all([
    sql`select code, label, percent, published from calculator_taxes order by position, code`,
    sql`select count(*)::int as total, sum(published)::int as shown from calculator_cities`,
    sql`select count(*)::int as total, sum(published)::int as shown from calculator_hotels`,
    sql`select count(distinct hotel_id)::int as total from calculator_prices where room_price <> '0.00'`,
    sql`select count(*)::int as total, sum(is_default)::int as defaults from calculator_currencies`,
  ]);

  const live = taxes.filter((tax) => tax.published === 1);
  if (!taxes.length) {
    problems.push("calculator_taxes is empty; migration 0007 has not run");
  } else if (!live.length) {
    notes.push("no published tax line: every quote shows its subtotal as the total");
  } else {
    const total = live.reduce((sum, tax) => sum + Number(tax.percent), 0);
    notes.push(`tax: ${live.map((t) => `${t.label} ${Number(t.percent)}%`).join(" + ")} = ${total}%`);
  }

  if (!Number(cities[0].shown)) problems.push("no published city; every picker is empty");
  if (!Number(hotels[0].shown)) problems.push("no published hotel; nothing can be priced");
  if (Number(currencies[0].total) === 0) problems.push("no currency; prices cannot be formatted");
  else if (Number(currencies[0].defaults) !== 1) problems.push("exactly one currency must be the default");

  notes.push(
    `${cities[0].shown}/${cities[0].total} cities shown, ` +
      `${hotels[0].shown}/${hotels[0].total} hotels shown, ` +
      `${priced[0].total} with a room rate`,
  );

  // --- the venue listing ---------------------------------------------------
  const [venueTypeRows, untagged, unplaced] = await Promise.all([
    sql`select id, slug, label, published from venue_types order by position, label`,
    sql`select count(*)::int as total from hotels where status = 'published' and wedding_types = '[]'`,
    sql`select count(*)::int as total from hotels where status = 'published' and listing_position = 9999`,
  ]);

  if (!venueTypeRows.length) {
    problems.push("venue_types is empty; migration 0008 has not run");
  } else {
    const shown = venueTypeRows.filter((row) => row.published === 1);
    if (!shown.length) notes.push("no published wedding type: /hotel-listing shows no Wedding Type filter");
    else notes.push(`wedding types: ${shown.map((row) => row.slug).join(", ")}`);
  }

  if (Number(untagged[0].total)) {
    notes.push(`${untagged[0].total} published venue(s) carry no wedding type; no type filter will find them`);
  }
  if (Number(unplaced[0].total)) {
    notes.push(`${unplaced[0].total} published venue(s) have no listing position; they sort to the end`);
  }

  // --- venue pages linked to the calculator -------------------------------
  const unlinked = await sql`
    select h.city, h.slug, h.external_hotel_id
    from hotels h
    where h.status = 'published'
      and (
        h.external_hotel_id = ''
        or not exists (select 1 from calculator_hotels c where c.id::text = h.external_hotel_id)
      )
    order by h.city, h.slug
  `;
  for (const row of unlinked) {
    problems.push(
      `/destination-wedding/${row.city}/${row.slug}: hotel id ` +
        `${row.external_hotel_id ? `"${row.external_hotel_id}" is not in the calculator` : "is blank"}` +
        " -- its calculator quotes zero",
    );
  }

  // A linked venue with no rate quotes zero too, but the "Price on request"
  // overlay catches that one, so it is a note rather than a failure.
  const unpriced = await sql`
    select h.city, h.slug
    from hotels h
    where h.status = 'published'
      and h.external_hotel_id <> ''
      and not exists (
        select 1 from calculator_prices p
        where p.hotel_id::text = h.external_hotel_id and p.room_price <> '0.00'
      )
  `;
  if (unpriced.length) {
    notes.push(`${unpriced.length} published venue(s) have no room rate; they show "Price on request"`);
  }
} finally {
  await sql.end({ timeout: 5 });
}

/* ----------------------------------------------------------------- report --- */

for (const note of notes) console.log(`  - ${note}`);

if (problems.length) {
  console.error(`\n[calculator] ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ! ${problem}`);
  process.exit(1);
}

console.log("\n[calculator] every calculator value comes from the database.");
