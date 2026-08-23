import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  RETIRED_CITIES,
  RETIRED_SLUGS,
  findLeftovers,
  transform,
} from "../scripts/lib/retired-cities.mjs";

/**
 * Eight cities were withdrawn along with their venues.
 *
 * The pages and database rows are gone, but the header mega-menu and the
 * venue filter named every city in markup rather than reading them from the
 * database, so the removal had to be made in the markup of all 367 pages, the
 * 16 generated shells, and the rows already stored. These guard the two ways
 * that quietly comes undone: a page reacquiring a retired city, and the
 * transform itself losing the ability to make the edit -- which is what the
 * database pass runs on every deploy.
 *
 * They read files only, so they run in CI with no database.
 */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (entry.endsWith(".html")) out.push(path);
  }
  return out;
}

const PAGES = walk("site-public");

test("the calculator seed cannot restore a retired city", async () => {
  const { calculatorData } = await import("../worker/calculator-data.ts");
  const retiredIds = new Set(RETIRED_CITIES.map((city) => city.id));

  assert.deepEqual(
    calculatorData.cities.filter((city) => retiredIds.has(Number(city.id))),
    [],
  );
  for (const id of retiredIds) {
    assert.equal(calculatorData.hotelsByCity[String(id)], undefined);
    assert.equal(calculatorData.compareHotelsByCity[String(id)], undefined);
  }

  const mappedHotelIds = new Set(
    [calculatorData.hotelsByCity, calculatorData.compareHotelsByCity]
      .flatMap((byCity) => Object.values(byCity))
      .flat()
      .map((hotel) => Number(hotel.id)),
  );
  for (const hotel of calculatorData.hotels) {
    assert.ok(mappedHotelIds.has(Number(hotel.id)), `orphan seed hotel ${hotel.id}`);
  }
  for (const hotelId of Object.keys(calculatorData.prices)) {
    assert.ok(mappedHotelIds.has(Number(hotelId)), `orphan seed price hotel ${hotelId}`);
  }
});

test("the sitemap and generated route inventory exclude retired paths", async () => {
  const sitemap = readFileSync("site-public/sitemap.xml", "utf8");
  const { STATIC_PUBLIC_ROUTES } = await import("../worker/site/static-routes.generated.ts");

  for (const slug of RETIRED_SLUGS) {
    const path = `/destination-wedding/${slug}`;
    assert.doesNotMatch(sitemap, new RegExp(`${path}(?:<|/)`));
    assert.equal(STATIC_PUBLIC_ROUTES.some((route) => route.startsWith(`${path}/`)), false);
  }
});

test("no retired city has a page of its own", () => {
  for (const slug of RETIRED_SLUGS) {
    assert.throws(
      () => statSync(join("site-public", "destination-wedding", slug)),
      `/destination-wedding/${slug} on disk is what keeps the pages live: ` +
        "a missing database city falls through to the file it shipped with",
    );
  }
});

test("no page still offers a retired city", () => {
  const offenders = PAGES.filter((file) => findLeftovers(readFileSync(file, "utf8")).length > 0);
  assert.deepEqual(offenders, [], "run npm run cities:retire");
});

test("no generated shell still offers a retired city", async () => {
  const { PAGE_TEMPLATES } = await import("../worker/db/page-templates.generated.ts");
  const stale = PAGE_TEMPLATES.filter((template) => findLeftovers(template.html).length > 0)
    .map((template) => template.key);
  assert.deepEqual(stale, [], "run npm run cities:retire");
});

/**
 * The transform itself, against the markup as it was before the change.
 *
 * scripts/retire-cities-db.mjs runs this over rows that a deploy never touches,
 * so it has to keep working long after every file on disk is already clean --
 * and the checks above cannot see that pass at all. One fixture per shape, in
 * the CRLF the stored rows actually carry.
 */
const AMRITSAR = RETIRED_CITIES.find((city) => city.slug === "amritsar");
const KEPT_ID = 8; // Agra, which must survive every one of these.

const MENU_BEFORE = [
  '<ul class="nav nav-tabs mb-3" id="hotelTabs" role="tablist">',
  '    <li class="nav-item" role="presentation">',
  '        <button class="nav-link active" id="city-tab-4" data-bs-target="#city-4" type="button" role="tab">',
  "            Delhi NCR",
  "        </button>",
  "    </li>",
  '    <li class="nav-item" role="presentation">',
  `        <button class="nav-link " id="city-tab-${AMRITSAR.id}" data-bs-target="#city-${AMRITSAR.id}" type="button" role="tab">`,
  "            Amritsar",
  "        </button>",
  "    </li>",
  "</ul>",
  '<div class="tab-content">',
  '    <div class="tab-pane fade show active" id="city-4" role="tabpanel">',
  '        <div class="megamenu-links"><ul class="list-unstyled row">',
  '            <li class="col-6"><a href="/destination-wedding/agra/taj-agra">Taj Agra</a></li>',
  "        </ul></div>",
  "    </div>",
  `    <div class="tab-pane fade " id="city-${AMRITSAR.id}" role="tabpanel">`,
  '        <div class="megamenulink-wrapper">',
  '            <div class="d-flex"><h6>Amritsar</h6>',
  '                <a href="/hotel-listing?city_search=Amritsar">View All</a>',
  "            </div>",
  '            <div class="megamenu-links"><ul class="list-unstyled row">',
  '                <li class="col-6"><a href="/destination-wedding/amritsar/taj-swarna-amritsar">Taj Swarna Amritsar</a></li>',
  "            </ul></div>",
  "        </div>",
  "    </div>",
  "</div>",
].join("\r\n");

test("the mega-menu loses the retired city's tab and its panel together", () => {
  const { html, changed, problems } = transform(MENU_BEFORE);

  assert.deepEqual(problems, []);
  assert.ok(changed);
  assert.deepEqual(findLeftovers(html), []);

  // The kept city is untouched, tab and panel alike.
  assert.match(html, /id="city-tab-4"/);
  assert.match(html, /id="city-4"/);
  assert.match(html, /href="\/destination-wedding\/agra\/taj-agra"/);

  // The panel was four levels of <div> deep; a lazy match would have stopped at
  // the first child's closing tag and left the page three tags heavy.
  const opens = (html.match(/<div\b/g) || []).length;
  const closes = (html.match(/<\/div\s*>/g) || []).length;
  assert.equal(opens, closes, "the markup must still balance");
  assert.equal((html.match(/<li\b/g) || []).length, (html.match(/<\/li\s*>/g) || []).length);

  assert.equal(transform(html).changed, false, "the transform must be idempotent");
});

const FILTER_BEFORE = [
  '<select id="cityMultiSelect" multiple style="width:100%;">',
  `    <option value="${KEPT_ID}"`,
  "        selected>",
  "        Agra",
  "    </option>",
  `    <option value="${AMRITSAR.id}"`,
  "        >",
  "        Amritsar",
  "    </option>",
  "</select>",
  '<select id="citySelect"></select>',
].join("\r\n");

test("the venue filter loses the retired city's option and keeps the rest", () => {
  const { html, problems } = transform(FILTER_BEFORE);

  assert.deepEqual(problems, []);
  assert.deepEqual(findLeftovers(html), []);
  assert.match(html, new RegExp(`<option value="${KEPT_ID}"`));
  assert.doesNotMatch(html, new RegExp(`<option value="${AMRITSAR.id}"`));
  // #citySelect is filled from calculator_cities on every request and must stay
  // the empty container it was detached into.
  assert.match(html, /<select id="citySelect"><\/select>/);
  assert.equal(transform(html).changed, false);
});

const ARTICLE_BEFORE =
  "<p>hosted entirely at " +
  '<a href="/destination-wedding/mumbai/taj-lands-end-mumbai"><strong>Taj Lands End in Mumbai</strong></a>' +
  ", followed by a reception.</p>";

test("a retired venue named mid-sentence keeps its words and loses its link", () => {
  const { html, problems } = transform(ARTICLE_BEFORE);

  assert.deepEqual(problems, []);
  assert.deepEqual(findLeftovers(html), []);
  assert.equal(
    html,
    "<p>hosted entirely at <strong>Taj Lands End in Mumbai</strong>, followed by a reception.</p>",
  );
});

test("removing the active tab is refused rather than done", () => {
  // Reversing the roles: the retired city is now the one the menu opens on.
  const inverted = MENU_BEFORE.replace('class="nav-link active" id="city-tab-4"', 'class="nav-link " id="city-tab-4"')
    .replace(`class="nav-link " id="city-tab-${AMRITSAR.id}"`, `class="nav-link active" id="city-tab-${AMRITSAR.id}"`)
    .replace('class="tab-pane fade show active" id="city-4"', 'class="tab-pane fade " id="city-4"')
    .replace(`class="tab-pane fade " id="city-${AMRITSAR.id}"`, `class="tab-pane fade show active" id="city-${AMRITSAR.id}"`);

  const { problems } = transform(inverted);
  assert.equal(problems.length, 2, "both the tab and its panel must be reported");
  for (const problem of problems) assert.match(problem, /active/);
});
