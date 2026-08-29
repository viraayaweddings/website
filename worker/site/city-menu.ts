/**
 * Keeps the two hardcoded city lists in step with `calculator_cities`.
 *
 * Every other city picker on the site reads the database: `#citySelect` on the
 * calculators is rebuilt by calculator-inject.ts, and /check-hotel-availability
 * and /compare-hotel fetch theirs. Two are markup instead, cloned into every
 * page, and so went on naming cities the panel had already hidden:
 *
 *   1. the header mega-menu -- a tab `<li>` holding `id="city-tab-<id>"` and a
 *      panel `<div id="city-<id>">` listing that city's venues, on all 292
 *      pages;
 *   2. `#cityMultiSelect`, the venue filter on /hotel-listing and the 45 city
 *      index pages, which carries one `<option>` per city.
 *
 * Rather than rewrite those on disk -- which is what retiring a city for good
 * does, and which cannot be undone from the admin panel -- they are filtered
 * here on the way out, against the same published set the database-backed
 * pickers use. Unpublishing a city in /admin/calculator therefore takes it out
 * of the menu and the filter too, and republishing puts it back, with no
 * deploy and no markup lost.
 *
 * Ids rather than names throughout: `city-tab-<id>` and the filter's option
 * values are `calculator_cities.id`, which is never renumbered.
 */

/** Cheap test for "this page has a mega-menu or a city filter at all". */
const CITY_MARKUP = /id="city-tab-\d+"|id="cityMultiSelect"/;

/** The tab strip and the panel stack, so a promotion is scoped to the menu. */
const TAB_LIST = /<ul\b[^>]*\bid="hotelTabs"[^>]*>[\s\S]*?<\/ul>/;
const TAB_CONTENT_OPEN = /<div\b[^>]*\bid="hotelTabsContent"[^>]*>/;

/** The venue filter, whose options are the only ones this touches. */
const CITY_MULTI_SELECT = /<select[^>]*\bid="cityMultiSelect"[^>]*>[\s\S]*?<\/select>/;

/**
 * Index just past the closing tag of the element opening at `open`.
 *
 * Counts nested opens and closes rather than matching the first `</tag>`: a
 * tab panel is four levels of `<div>` deep, so a lazy match stops at its first
 * child's closing tag and leaves the page three closing tags heavy. Returns -1
 * when the markup does not balance, which the callers treat as "leave it".
 */
function endOfElement(html: string, open: number, tag: string): number {
  const scan = new RegExp(`<${tag}\\b|</${tag}\\s*>`, "g");
  scan.lastIndex = open;
  let depth = 0;
  let match: RegExpExecArray | null;
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

/**
 * Removes the element containing `marker`, plus the whitespace run in front of
 * it, so the surrounding indentation is left as it was.
 */
function cut(html: string, marker: string, tag: string): string {
  const at = html.indexOf(marker);
  if (at === -1) return html;

  const open = html.lastIndexOf(`<${tag}`, at);
  if (open === -1) return html;

  const close = endOfElement(html, open, tag);
  if (close === -1) return html;

  let before = open;
  while (before > 0 && /\s/.test(html[before - 1])) before -= 1;
  return html.slice(0, before) + html.slice(close);
}

/** Rewrites the first `<ul id="hotelTabs">` through `edit`, if the page has one. */
function inTabList(html: string, edit: (list: string) => string): string {
  return html.replace(TAB_LIST, edit);
}

/**
 * Reopens the menu on a tab that still exists.
 *
 * Bootstrap shows whichever tab carries `active` and whichever panel carries
 * `show active`. Hiding the city that happened to hold them would leave the
 * mega-menu opening on nothing -- a blank panel with no way to tell it is not
 * broken -- so the first surviving tab takes over. Delhi NCR is the active one
 * today and is not hidden, which makes this a safety net rather than a path
 * that runs; it is here because which city is first is an admin's choice.
 */
function promoteFirstTab(html: string): string {
  let next = inTabList(html, (list) => {
    if (/class="nav-link[^"]*\bactive\b/.test(list)) return list;
    return list.replace(/class="nav-link\s*"/, 'class="nav-link active"');
  });

  const contentOpen = next.match(TAB_CONTENT_OPEN);
  if (!contentOpen || contentOpen.index === undefined) return next;

  const start = contentOpen.index;
  const end = endOfElement(next, start, "div");
  const content = end === -1 ? next.slice(start) : next.slice(start, end);
  if (/class="tab-pane[^"]*\bactive\b/.test(content)) return next;

  const promoted = content.replace(/class="tab-pane fade\s*"/, 'class="tab-pane fade show active"');
  if (promoted === content) return next;

  next = next.slice(0, start) + promoted + (end === -1 ? "" : next.slice(end));
  return next;
}

/** Drops one city's `<option>` from the venue filter, and only from there. */
function dropFilterOption(html: string, id: number): string {
  return html.replace(CITY_MULTI_SELECT, (select) =>
    select.replace(new RegExp(`\\s*<option value="${id}"[\\s\\S]*?</option>`), ""),
  );
}

/** Every city id the page's markup names, menu tabs and filter options alike. */
function cityIdsIn(html: string): Set<number> {
  const found = new Set<number>();
  for (const match of html.matchAll(/id="city-tab-(\d+)"/g)) found.add(Number(match[1]));
  const select = html.match(CITY_MULTI_SELECT);
  if (select) {
    for (const match of select[0].matchAll(/<option value="(\d+)"/g)) found.add(Number(match[1]));
  }
  return found;
}

/**
 * Takes every city the database does not publish out of `html`.
 *
 * `publishedIds` empty means the config never loaded -- an unreachable
 * database, or a build with no database at all -- and the page is returned
 * untouched. Filtering against an empty set would otherwise read as "no city
 * is published" and strip the entire menu, turning a transient database fault
 * into a site with no navigation. A stale menu is the better failure.
 */
export function filterCityMarkup(html: string, publishedIds: Set<number>): string {
  if (publishedIds.size === 0 || !CITY_MARKUP.test(html)) return html;

  const hidden = [...cityIdsIn(html)].filter((id) => !publishedIds.has(id));
  if (hidden.length === 0) return html;

  let next = html;
  for (const id of hidden) {
    next = cut(next, `id="city-tab-${id}"`, "li");
    next = cut(next, `id="city-${id}"`, "div");
    next = dropFilterOption(next, id);
  }

  return promoteFirstTab(next);
}
