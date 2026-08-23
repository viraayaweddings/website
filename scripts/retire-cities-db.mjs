/**
 * Permanently removes retired destination cities and their hotels.
 *
 * The public markup names destinations in shared menu/filter HTML, while the
 * actual city, venue and calculator records live in separate database tables.
 * Both have to change together or a removed route can remain discoverable.
 *
 *   node --env-file=.env.local scripts/retire-cities-db.mjs
 *       audit only
 *
 *   node --env-file=.env.local scripts/retire-cities-db.mjs --apply
 *       rewrite shared markup and delete the retired records transactionally
 *
 * `--if-configured` exits 0 when no database URL is available, so the command
 * can safely run at the end of every deployment.
 */
import postgres from "postgres";
import {
  RETIRED_CITY_MARKER,
  RETIRED_IDS,
  RETIRED_SLUGS,
  findLeftovers,
  transform,
} from "./lib/retired-cities.mjs";

const apply = process.argv.includes("--apply");
const ifConfigured = process.argv.includes("--if-configured");

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  if (ifConfigured) {
    console.log("[retired-cities] no database here; nothing to do.");
    process.exit(0);
  }
  console.error("Set DATABASE_URL.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });

function convert(html, where, problems) {
  if (!RETIRED_CITY_MARKER.test(html)) return null;
  const result = transform(html);
  for (const problem of result.problems) problems.push(`${where}: ${problem}`);
  for (const leftover of findLeftovers(result.html)) {
    problems.push(`${where}: ${leftover} survived the transform`);
  }
  return result.changed ? result.html : null;
}

async function inspect(db) {
  const problems = [];
  const updates = { pageTemplates: [], staticPages: [], blogPosts: [] };

  for (const row of await db`select key, html from page_templates`) {
    const next = convert(row.html, `page_templates/${row.key}`, problems);
    if (next) updates.pageTemplates.push({ id: row.key, html: next });
  }

  for (const row of await db`select path, html from static_pages`) {
    const next = convert(row.html, `static_pages${row.path}`, problems);
    if (next) updates.staticPages.push({ id: row.path, html: next });
  }

  // Preserve editorial mentions, but unwrap links that would point to removed
  // venue pages. The words in the article remain unchanged.
  for (const row of await db`select slug, body_html from blog_posts`) {
    const next = convert(row.body_html, `blog_posts/${row.slug}`, problems);
    if (next) updates.blogPosts.push({ id: row.slug, html: next });
  }

  const [cityPages, hotels, cityListings, calculatorCities, calculatorHotels, calculatorPrices] =
    await Promise.all([
      db`select count(*)::int n from city_pages where city = any(${RETIRED_SLUGS})`,
      db`select count(*)::int n from hotels where city = any(${RETIRED_SLUGS})`,
      db`select count(*)::int n from city_listings
          where city = any(${RETIRED_SLUGS}) or venue_city = any(${RETIRED_SLUGS})`,
      db`select count(*)::int n from calculator_cities where id = any(${RETIRED_IDS})`,
      db`select count(*)::int n from calculator_hotels where city_id = any(${RETIRED_IDS})`,
      db`select count(*)::int n from calculator_prices
          where hotel_id in (
            select id from calculator_hotels where city_id = any(${RETIRED_IDS})
          )`,
    ]);

  return {
    problems,
    updates,
    counts: {
      cityPages: cityPages[0].n,
      hotels: hotels[0].n,
      cityListings: cityListings[0].n,
      calculatorCities: calculatorCities[0].n,
      calculatorHotels: calculatorHotels[0].n,
      calculatorPrices: calculatorPrices[0].n,
    },
  };
}

function totalChanges(state) {
  const markup = Object.values(state.updates).reduce((sum, rows) => sum + rows.length, 0);
  const records = Object.values(state.counts).reduce((sum, count) => sum + count, 0);
  return { markup, records };
}

function assertCleanInspection(state) {
  if (!state.problems.length) return;
  for (const problem of state.problems) console.error(`  ! ${problem}`);
  throw new Error(`${state.problems.length} retired-city markup replacement(s) failed`);
}

function report(state, prefix) {
  const { markup, records } = totalChanges(state);
  console.log(
    `[retired-cities] ${prefix}: ${state.counts.cityPages} city page(s), ` +
      `${state.counts.hotels} website hotel(s), ${state.counts.cityListings} listing row(s), ` +
      `${state.counts.calculatorCities} calculator city(ies), ` +
      `${state.counts.calculatorHotels} calculator hotel(s), ` +
      `${state.counts.calculatorPrices} price row(s), ${markup} markup row(s)`,
  );
  return markup + records;
}

try {
  if (!apply) {
    const state = await inspect(sql);
    assertCleanInspection(state);
    const changes = report(state, "audit");
    if (changes === 0) {
      console.log(`[retired-cities] fully removed: ${RETIRED_SLUGS.join(", ")}.`);
    } else {
      console.log("[retired-cities] dry run only; pass --apply to remove these records.");
      process.exitCode = 1;
    }
  } else {
    const state = await sql.begin(async (tx) => {
      const current = await inspect(tx);
      assertCleanInspection(current);

      for (const row of current.updates.pageTemplates) {
        await tx`update page_templates set html = ${row.html}, updated_at = now() where key = ${row.id}`;
      }
      for (const row of current.updates.staticPages) {
        await tx`update static_pages set html = ${row.html}, updated_at = now() where path = ${row.id}`;
      }
      for (const row of current.updates.blogPosts) {
        await tx`update blog_posts set body_html = ${row.html}, updated_at = now() where slug = ${row.id}`;
      }

      // city_listings deliberately has no foreign keys, so remove both pages
      // owned by a retired city and cross-city cards that point at its venues.
      await tx`delete from city_listings
        where city = any(${RETIRED_SLUGS}) or venue_city = any(${RETIRED_SLUGS})`;
      await tx`delete from hotels where city = any(${RETIRED_SLUGS})`;
      await tx`delete from city_pages where city = any(${RETIRED_SLUGS})`;

      // calculator_hotels and calculator_prices cascade from the city row.
      await tx`delete from calculator_cities where id = any(${RETIRED_IDS})`;

      await tx`
        insert into content_version (id, version, updated_at)
        values (1, 1, now())
        on conflict (id) do update
          set version = content_version.version + 1, updated_at = now()
      `;
      return current;
    });

    report(state, "removed");

    const verification = await inspect(sql);
    assertCleanInspection(verification);
    const remaining = report(verification, "verification");
    if (remaining !== 0) throw new Error(`${remaining} retired-city record(s) remain after deletion`);
    console.log(`[retired-cities] fully removed: ${RETIRED_SLUGS.join(", ")}.`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
