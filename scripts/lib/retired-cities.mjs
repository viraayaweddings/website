/**
 * Takes a retired city out of the markup that names it.
 *
 * Eight cities were withdrawn from the site along with their venues. Their
 * pages and rows are dealt with elsewhere -- both the files and database rows
 * are deleted -- but three things spell the city out in markup that every other
 * page carries, and none of them are rendered from the database:
 *
 *   1. the header mega-menu's city tab, `<li>` with `id="city-tab-<id>"`;
 *   2. that tab's panel, `<div class="tab-pane" id="city-<id>">`, which lists
 *      the city's venues by name and link;
 *   3. the `#cityMultiSelect` filter on /hotel-listing and the 53 city index
 *      pages, which carries one `<option>` per city.
 *
 * A retired city left in any of them is a live link to a page that now 404s, on
 * all 367 pages at once.
 *
 * The same markup exists in three places that must not drift, and each is
 * reached differently -- the reason this transform lives on its own rather than
 * inside either pass:
 *
 *   - site-public/**\/*.html                   scripts/retire-cities.mjs
 *   - worker/db/page-templates.generated.ts    (same script)
 *   - page_templates / static_pages rows       scripts/retire-cities-db.mjs
 *
 * `transform` is idempotent and reports rather than throws: it rewrites markup
 * the first time and is a no-op afterwards, and it edits in place rather than
 * replacing the page, so an admin's own edits survive.
 */

/**
 * The withdrawn cities.
 *
 * `id` is the `calculator_cities` id, which is also the mega-menu's tab id and
 * the `#cityMultiSelect` option value. It is the original dataset's id and is
 * never renumbered, so matching on it is exact in a way matching on the printed
 * name is not -- two of these are spelled lowercase in the data ("kochi"), and
 * Bengaluru's venues are named both "Bengaluru" and "Bangalore".
 */
export const RETIRED_CITIES = [
  { slug: "amritsar", id: 31, name: "Amritsar" },
  { slug: "bengaluru", id: 17, name: "Bengaluru" },
  { slug: "chennai", id: 18, name: "Chennai" },
  { slug: "hyderabad", id: 27, name: "Hyderabad" },
  { slug: "kochi", id: 19, name: "kochi" },
  { slug: "pune", id: 16, name: "Pune" },
  { slug: "mumbai", id: 26, name: "Mumbai" },
  { slug: "trivandrum", id: 22, name: "Trivandrum" },
];

export const RETIRED_SLUGS = RETIRED_CITIES.map((city) => city.slug);
export const RETIRED_IDS = RETIRED_CITIES.map((city) => city.id);

/** Cheap test for "worth transforming at all", so untouched pages are skipped. */
export const RETIRED_CITY_MARKER = new RegExp(
  RETIRED_CITIES.map((city) => `id="city-tab-${city.id}"`).join("|") +
    "|" +
    RETIRED_SLUGS.map((slug) => `/destination-wedding/${slug}[/"]`).join("|"),
);

/**
 * Cuts the element starting at `open`, which must be the `<` of a `<tag`.
 *
 * Counts nested opens and closes rather than matching to the first `</tag>`:
 * a tab panel is four levels of `<div>` deep, so a lazy match stops at its
 * first child's closing tag and leaves the page three closing tags heavy.
 * Returns the index just past the element's own closing tag, or -1 when the
 * markup does not balance.
 */
function endOfElement(html, open, tag) {
  const scan = new RegExp(`<${tag}\\b|</${tag}\\s*>`, "g");
  scan.lastIndex = open;
  let depth = 0;
  let match;
  while ((match = scan.exec(html))) {
    if (match[0][1] === "/") {
      depth -= 1;
      if (depth === 0) return scan.lastIndex;
    } else {
      depth += 1;
    }
  }
  return -1;
}

/** Start of the innermost `<tag` at or before `from`. */
function startOfElement(html, from, tag) {
  return html.lastIndexOf(`<${tag}`, from);
}

/**
 * Removes the element containing `marker`, plus the whitespace run in front of
 * it, so the surrounding indentation is left as it was.
 */
function cut(html, marker, tag, problems, what) {
  const at = html.indexOf(marker);
  if (at === -1) return html;

  const open = startOfElement(html, at, tag);
  if (open === -1) {
    problems.push(`${what}: no enclosing <${tag}> for ${marker}`);
    return html;
  }

  const close = endOfElement(html, open, tag);
  if (close === -1) {
    problems.push(`${what}: <${tag}> holding ${marker} does not balance`);
    return html;
  }

  const element = html.slice(open, close);
  // The first tab and its panel carry `active` -- the panel on its own opening
  // tag, the tab on the `<button>` just inside it. Removing either leaves the
  // menu opening on a panel that is not there. None of the retired cities is
  // the active one, so a hit here means the markup is not what we think it is.
  if (/class="[^"]*\bactive\b[^"]*"/.test(element.slice(0, 300))) {
    problems.push(`${what}: ${marker} is the active tab; refusing to remove it`);
    return html;
  }

  let before = open;
  while (before > 0 && /\s/.test(html[before - 1])) before -= 1;
  return html.slice(0, before) + html.slice(close);
}

/** The `#cityMultiSelect` element, whose options are the only ones we touch. */
const CITY_MULTI_SELECT = /<select[^>]*\bid="cityMultiSelect"[^>]*>[\s\S]*?<\/select>/;

/**
 * Drops one city's `<option>` from the venue filter.
 *
 * Scoped to `#cityMultiSelect` rather than run over the whole page: the same
 * ids appear as option values in `#citySelect`, which the calculator fills from
 * `calculator_cities` on every request and which must stay as the empty
 * container it was detached into.
 */
function dropOption(html, id) {
  return html.replace(CITY_MULTI_SELECT, (select) =>
    select.replace(
      new RegExp(`\\s*<option value="${id}"[\\s\\S]*?</option>`),
      "",
    ),
  );
}

/**
 * Anything still linking to a retired page once the mega-menu has gone.
 *
 * Two blog articles name a Mumbai venue mid-sentence and link it. Deleting the
 * sentence would edit the article; leaving the link would put a 404 in the
 * middle of a published piece. The anchor is unwrapped instead, so the venue is
 * still named and the words are untouched.
 */
const RETIRED_LINK = new RegExp(
  `<a\\b[^>]*href="/destination-wedding/(?:${RETIRED_SLUGS.join("|")})(?:/[^"]*)?"[^>]*>([\\s\\S]*?)</a>`,
  "g",
);

function unwrapLinks(html) {
  return html.replace(RETIRED_LINK, (whole, text) => text);
}

/**
 * Returns `{ html, changed, problems }`.
 *
 * `problems` non-empty means the markup did not look the way this expects; the
 * callers stop rather than write a partly-converted page.
 */
export function transform(input) {
  const problems = [];
  let html = input;

  for (const city of RETIRED_CITIES) {
    html = cut(html, `id="city-tab-${city.id}"`, "li", problems, city.slug);
    html = cut(html, `id="city-${city.id}"`, "div", problems, city.slug);
    html = dropOption(html, city.id);
  }

  // After the cuts, not before: the mega-menu's own venue links match this too,
  // and unwrapping them first would leave the panel full of bare venue names.
  html = unwrapLinks(html);

  return { html, changed: html !== input, problems };
}

/**
 * Every retired reference still in `html`, for the callers' verification pass.
 *
 * Links are counted only as anchors. A venue shell also carries the path of the
 * page it was cloned from in its `og:url`, its canonical tag and the enquiry
 * forms' `source_page` -- placeholders the injection handlers overwrite with
 * whichever venue is being rendered, and one of the six was cloned from a
 * Mumbai page. Treating those as leftovers would block the whole pass over a
 * value no visitor ever sees.
 */
export function findLeftovers(html) {
  const found = [];
  for (const city of RETIRED_CITIES) {
    if (html.includes(`id="city-tab-${city.id}"`)) found.push(`tab city-tab-${city.id}`);
    if (html.includes(`id="city-${city.id}"`)) found.push(`panel city-${city.id}`);
    const select = html.match(CITY_MULTI_SELECT);
    if (select && select[0].includes(`<option value="${city.id}"`)) {
      found.push(`filter option ${city.id}`);
    }
  }
  RETIRED_LINK.lastIndex = 0;
  for (const match of html.matchAll(RETIRED_LINK)) {
    found.push(`link ${match[0].slice(0, 80)}`);
  }
  return found;
}
