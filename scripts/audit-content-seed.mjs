/**
 * Checks the database for the gaps a half-finished seed leaves behind.
 *
 * The content import can exceed the function's time limit on a cold database
 * and stop part-way. It is safe to run again, so the failure is quiet: rows
 * simply are not there. What that looks like on the site is a page that ignores
 * every admin edit, a venue count that contradicts the grid beneath it, or a
 * card with no picture -- none of which reads as "the seed did not finish".
 *
 * Every check here is one that has actually caught something.
 *
 * Usage:
 *   node --env-file=.env.local scripts/audit-content-seed.mjs
 *
 * Exits non-zero when anything is wrong, so it can gate a deploy.
 */
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  console.error("Set DATABASE_URL.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });

const problems = [];

function check(label, rows, describe) {
  if (!rows.length) {
    console.log(`  ok    ${label}`);
    return;
  }
  problems.push(label);
  console.log(`  FAIL  ${label}: ${rows.length}`);
  rows.slice(0, 8).forEach((row) => console.log(`          ${describe(row)}`));
  if (rows.length > 8) console.log(`          ... ${rows.length - 8} more`);
}

try {
  console.log("content seed audit\n");

  // A city with no row is served from its cloned file, so nothing an admin
  // changes reaches it -- not the pictures, not the wording, not the grid.
  check(
    "every city listed has a city_pages row",
    await sql`
      select distinct l.city from city_listings l
       where not exists (select 1 from city_pages p where p.city = l.city)
       order by l.city`,
    (row) => row.city,
  );

  // total_venues drives both the "Showing 1 - 12 of N" line and the pager. Left
  // at zero it falls back to the twelve on screen, so a city with thirty venues
  // claims to have twelve and loses its link to the rest.
  check(
    "no city under-reports its venue count",
    await sql`
      select p.city, p.total_venues, count(l.id)::int listed
        from city_pages p join city_listings l on l.city = p.city
       group by p.city, p.total_venues
      having p.total_venues = 0 and count(l.id) > 0
       order by p.city`,
    (row) => `${row.city}: total_venues=0 but ${row.listed} listed`,
  );

  check(
    "every listing resolves to a published venue",
    await sql`
      select l.city, l.venue_city, l.venue_slug from city_listings l
       where not exists (
         select 1 from hotels h
          where h.city = l.venue_city and h.slug = l.venue_slug and h.status = 'published')
       order by l.city`,
    (row) => `${row.city} -> ${row.venue_city}/${row.venue_slug}`,
  );

  check(
    "every venue has a card thumbnail",
    await sql`select city, slug from hotels where coalesce(thumbnail_image, '') = '' order by city, slug`,
    (row) => `${row.city}/${row.slug}`,
  );

  // Every image is in R2 now; a /storage path is one the migration missed.
  for (const [table, column] of [
    ["hero_slides", "image_key"],
    ["blog_posts", "og_image"],
    ["blog_posts", "banner_image"],
    ["blog_posts", "card_image"],
    ["hotels", "og_image"],
    ["hotels", "banner_image"],
    ["hotels", "thumbnail_image"],
  ]) {
    check(
      `${table}.${column} points at /media`,
      await sql.unsafe(
        `select ${column} as value from ${table} where ${column} <> '' and ${column} not like '/media/%' limit 20`,
      ),
      (row) => row.value,
    );
  }

  // Not just /storage: user/assets and vendor were migrated too, so any absolute
  // image path that is not /media is one something put back.
  const STATIC_IMAGE = /(?<=["'\s(=,])\/(?!media\/)[A-Za-z0-9_][^"'\s),]*?\.(?:jpg|jpeg|png|webp|avif|gif|svg)/i;
  check(
    "page shells hold no static image paths",
    (await sql`select key, html from page_templates order by key`).filter((row) =>
      STATIC_IMAGE.test(String(row.html)),
    ),
    (row) => row.key,
  );

  check(
    "hotels.highlights holds no static image paths",
    (await sql`select id, highlights from hotels where highlights <> ''`).filter((row) =>
      STATIC_IMAGE.test(String(row.highlights)),
    ),
    (row) => `hotel ${row.id}`,
  );

  const shells = await sql`select count(*)::int n from page_templates`;
  const media = await sql`select count(*)::int n from media`;
  console.log(`\n  page shells: ${shells[0].n}`);
  console.log(`  media rows:  ${media[0].n}`);

  if (problems.length) {
    console.log(`\n${problems.length} check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log("\nAll checks passed.");
  }
} finally {
  await sql.end({ timeout: 5 });
}
