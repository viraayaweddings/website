import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { OPERATIONAL_CITY_IDS, isOperationalCity } from "../worker/db/operational-cities.ts";
import { filterCityMarkup } from "../worker/site/city-menu.ts";
import { restoreHomeNavItem } from "../worker/site/header-nav.ts";

/**
 * Twenty-nine cities were taken out of the pickers without being retired.
 *
 * A hidden city keeps everything -- hotels, prices, its own pages -- and is one
 * click in /admin/calculator away from coming back, so `published` in the
 * database is the only switch. That leaves two things to guard: the two city
 * lists that are markup rather than data and so cannot read that switch
 * directly, and the seed, which is what a database rebuilt from scratch would
 * otherwise use to publish all 45 again.
 *
 * These read files only, so they run in CI with no database.
 */

const MIGRATION = "drizzle-pg/0009_hide_nonoperational_cities.sql";

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (entry.endsWith(".html")) out.push(path);
  }
  return out;
}

/** The ids the migration hides, read out of the SQL rather than restated. */
function hiddenIdsFromMigration() {
  const sql = readFileSync(MIGRATION, "utf8");
  const list = sql.slice(sql.indexOf('WHERE "id" IN ('), sql.indexOf(") AND"));
  return new Set([...list.matchAll(/^\s*(\d+),?\s*--/gm)].map((match) => Number(match[1])));
}

test("the seed and the migration describe the same 45 cities", async () => {
  const { calculatorData } = await import("../worker/calculator-data.ts");
  const seeded = calculatorData.cities.map((city) => Number(city.id));
  const hidden = hiddenIdsFromMigration();

  // Every bundled city is accounted for exactly once: published by the seed's
  // list, or hidden by the migration. A city in neither would come up
  // published on a rebuilt database and hidden on the live one.
  for (const id of seeded) {
    assert.equal(
      isOperationalCity(id) !== hidden.has(id),
      true,
      `city ${id} is ${isOperationalCity(id) ? "operational" : "not operational"} in the seed but ${
        hidden.has(id) ? "" : "not "
      }hidden by ${MIGRATION}`,
    );
  }

  assert.equal(OPERATIONAL_CITY_IDS.length + hidden.size, seeded.length);
  for (const id of [...hidden, ...OPERATIONAL_CITY_IDS]) {
    assert.ok(seeded.includes(id), `${id} is named but is not a city in the seed`);
  }
});

test("the migration hides rather than deletes", () => {
  // Comments stripped first: the prose explains why this is not a delete, and
  // matching on the whole file would find the word there.
  const sql = readFileSync(MIGRATION, "utf8").replace(/^\s*--.*$/gm, "");
  // A DELETE here would take the hotels and prices with it and make the admin
  // panel's re-publish button a lie.
  assert.doesNotMatch(sql, /\bDELETE\b/i);
  assert.match(sql, /UPDATE "calculator_cities"[\s\S]*SET "published" = 0/);
});

test("the migration is registered, so it runs exactly once", async () => {
  const name = MIGRATION.replace(/^drizzle-pg\//, "").replace(/\.sql$/, "");

  // Two runners apply drizzle-pg: the deploy script reads the directory, and
  // the runtime carries the files bundled and must list them by hand. A file
  // missing from that hand-written list is applied on Vercel and nowhere else.
  const runtime = readFileSync("worker/db/apply-pg-migrations.ts", "utf8");
  assert.match(runtime, new RegExp(`name: "${name}"`), `${name} is not in PG_MIGRATIONS`);

  // Being recorded under that name is the whole of the run-once guarantee.
  // This is a one-time data edit, not a rule: re-running it by hand would hide
  // a city an admin had turned back on, which is why nothing may re-run it.
  assert.match(runtime, /__migrations|appliedMigrationNames/);
});

test("filterCityMarkup takes an unpublished city out of the menu and the filter", () => {
  const html = readFileSync("site-public/index.html", "utf8");
  const published = new Set(OPERATIONAL_CITY_IDS);
  const filtered = filterCityMarkup(html, published);

  const shown = [...filtered.matchAll(/id="city-tab-(\d+)"/g)].map((m) => Number(m[1]));
  assert.ok(shown.length > 0, "expected the mega-menu to survive");
  for (const id of shown) assert.ok(published.has(id), `tab ${id} is not published`);

  // Kolkata is the only hidden city with a tab today, so it is the one this
  // has to have removed -- panel, venue links and all.
  assert.match(html, /id="city-tab-25"/);
  assert.doesNotMatch(filtered, /id="city-tab-25"/);
  assert.doesNotMatch(filtered, /id="city-25"/);
  assert.doesNotMatch(filtered, /destination-wedding\/kolkata\//);
});

test("filterCityMarkup trims the venue filter to the published cities", () => {
  const html = readFileSync("site-public/hotel-listing/index.html", "utf8");
  const published = new Set(OPERATIONAL_CITY_IDS);
  const select = (markup) => markup.match(/<select[^>]*id="cityMultiSelect"[^>]*>[\s\S]*?<\/select>/)[0];

  assert.equal([...select(html).matchAll(/<option value="(\d+)"/g)].length, 45);

  const options = [...select(filterCityMarkup(html, published))
    .matchAll(/<option value="(\d+)"/g)]
    .map((m) => Number(m[1]));

  assert.deepEqual(options.sort((a, b) => a - b), [...published].sort((a, b) => a - b));
});

test("filterCityMarkup leaves the menu alone when the database did not answer", () => {
  const html = readFileSync("site-public/index.html", "utf8");
  // An empty published set means the config never loaded. Read as "no city is
  // published" it would strip the whole menu, turning a database blip into a
  // site with no navigation.
  assert.equal(filterCityMarkup(html, new Set()), html);
});

test("filterCityMarkup keeps a tab and a panel open", () => {
  const html = readFileSync("site-public/index.html", "utf8");
  // Hiding the city that holds `active` would leave the mega-menu opening on a
  // blank panel, so the first survivor has to take over.
  const withoutDelhi = new Set([...OPERATIONAL_CITY_IDS].filter((id) => id !== 4));
  const filtered = filterCityMarkup(html, withoutDelhi);

  assert.doesNotMatch(filtered, /id="city-tab-4"/);
  assert.match(filtered, /class="nav-link active"/);
  assert.match(filtered, /class="tab-pane fade show active"/);
});

test("filterCityMarkup is idempotent", () => {
  const html = readFileSync("site-public/index.html", "utf8");
  const published = new Set(OPERATIONAL_CITY_IDS);
  const once = filterCityMarkup(html, published);
  assert.equal(filterCityMarkup(once, published), once);
});

test("every page gets a Home link in the header nav", () => {
  const pages = walk("site-public").filter((path) =>
    readFileSync(path, "utf8").includes('<ul class="navbar-nav me-auto">'),
  );
  assert.ok(pages.length > 200, `expected the header nav on most pages, found ${pages.length}`);

  for (const path of pages) {
    const pathname = "/" + path.replace(/^site-public\//, "").replace(/(?:^|\/)index\.html$/, "");
    const restored = restoreHomeNavItem(readFileSync(path, "utf8"), pathname);
    assert.match(
      restored,
      /<a class="nav-link[^"]*" href="\/">Home<\/a>/,
      `${path} has no Home link in its header`,
    );
  }
});

test("exactly one header nav item is marked current", () => {
  const nav = (markup) =>
    markup.slice(markup.indexOf('<ul class="navbar-nav me-auto">'));

  const cases = [
    ["site-public/index.html", "/", 'href="/"'],
    ["site-public/wedding-packages/index.html", "/wedding-packages", 'href="/wedding-packages"'],
  ];

  for (const [path, pathname, expected] of cases) {
    const restored = restoreHomeNavItem(readFileSync(path, "utf8"), pathname);
    const active = [...nav(restored).matchAll(/<a class="nav-link active" ([^>]*)>/g)];
    assert.equal(active.length, 1, `${pathname}: ${active.length} nav items marked current`);
    assert.match(active[0][1], new RegExp(expected.replace(/[/]/g, "\\/")));
  }

  // Anywhere else, nothing in the nav claims to be the current page -- which is
  // the bug being fixed: WEDDING PACKAGES claimed it on all 291 other pages.
  const other = restoreHomeNavItem(readFileSync("site-public/about-us/index.html", "utf8"), "/about-us");
  assert.equal([...nav(other).matchAll(/<a class="nav-link active"/g)].length, 0);
});

test("restoreHomeNavItem does not add a second Home item", () => {
  const html = readFileSync("site-public/index.html", "utf8");
  const once = restoreHomeNavItem(html, "/");
  assert.equal(restoreHomeNavItem(once, "/"), once);
  assert.equal([...once.matchAll(/<a class="nav-link[^"]*" href="\/">Home<\/a>/g)].length, 1);
});
