/**
 * Unpublishes the wedding packages area without deleting it.
 *
 * The site owner asked for the three package tiers (Shresht / Siddhi /
 * Shobhana) to be off the website. The strip on the home page was cut out --
 * it was one section among many there. `/wedding-packages` and `/package` are
 * different: the tiers are the *whole* page on both, so removing them would
 * leave a banner over empty space, reached from the first item in the header
 * menu on every page.
 *
 * So the pages are unpublished rather than emptied or deleted:
 *
 *   1. the "WEDDING PACKAGES" item comes out of the header menu;
 *   2. the "Wedding Packages" link comes out of the footer markup;
 *   3. the five package pages get `noindex, nofollow`, so search stops sending
 *      people to a page the site no longer links to;
 *   4. the pages themselves are untouched and still answer at their URLs.
 *
 * Nothing is destroyed. Reversing this is reverting the commit -- which also
 * matters because the reason may be temporary: the cheapest tier reads
 * "1.00 CR starting price" while the new calculator offers a ₹70 Lakh band, and
 * a repriced packages page may well come back.
 *
 * The footer is a special case. `worker/site/footer.ts` renders it at request
 * time and its link lists are already updated, so this pass only has to reach
 * the markup underneath -- which is what a page falls back to when the
 * injection does not run.
 *
 * As with the calculator change, the same markup lives in three places:
 *
 *   - site-public/ ** /*.html                  scripts/unpublish-packages.mjs
 *   - worker/db/page-templates.generated.ts    (same script)
 *   - page_templates / static_pages rows       scripts/migrate-stored-pages.mjs
 *
 * `transform` is idempotent and reports rather than throws.
 */

/** Documents worth visiting: anything linking to the packages pages, or one of them. */
export const PACKAGES_MARKER = /href="\/(?:wedding-)?packages?"|href="\/wedding-packages\//;

/**
 * What must not survive: a *navigation* link to the packages area.
 *
 * Scoped to links inside a list item, which is what the header menu, the
 * footer columns and the 404 page's section list all are. Prose links in
 * article bodies are deliberately not covered -- see the note on
 * CONTENT_LINKS below.
 */
export const BANNED_PATTERNS = [
  [/<li[^>]*>\s*<a[^>]+href="\/(?:wedding-)?packages?"/, "a navigation link back to the packages pages"],
];

/**
 * The one link left pointing at the packages pages, and why it stays.
 *
 * A blog post ("destination-wedding-venue-checklist") links the phrase
 * "wedding package price list" mid-sentence. That is editorial copy, not
 * navigation: cutting the anchor would leave "look at a detailed before you
 * finalise anything", and cutting the sentence is an edit to a published
 * article that belongs to whoever writes them.
 *
 * It is also not this script's to change. Article bodies live in `blog_posts`
 * and are rendered into the shell at request time, so the copy under
 * site-public is a snapshot -- editing it would change nothing a visitor sees.
 * The live text is edited at /admin/blog.
 *
 * The link is not broken: unpublishing keeps the page answering at its URL.
 * It simply leads somewhere the site does not otherwise advertise.
 */
export const CONTENT_LINKS = [
  "site-public/blogs/destination-wedding-venue-checklist/index.html",
];

/** The pages that are unpublished, and so must carry a robots tag. */
export const NOINDEX_PATHS = [
  "/wedding-packages/",
  "/package/",
  "/wedding-packages/shresht/",
  "/wedding-packages/siddhi/",
  "/wedding-packages/shobhana/",
];

const ROBOTS_TAG = '<meta name="robots" content="noindex, nofollow">';

/**
 * The header menu item.
 *
 * Matched as the whole `<li>` so the list closes up cleanly rather than
 * leaving an empty bullet. The anchor carries two `class` attributes in the
 * cloned markup -- `class="nav-link active" href="..." class="active"` -- which
 * is invalid but is what every page ships, so the pattern tolerates anything
 * between the href and the closing bracket.
 */
const HEADER_ITEM =
  /\n[ \t]*<li class="nav-item">\s*\n[ \t]*<a[^>]*href="\/(?:wedding-)?packages?"[^>]*>[^<]*<\/a>\s*\n[ \t]*<\/li>/;

/** The footer link, as a whole `<li>` for the same reason. */
const FOOTER_ITEM =
  /\n[ \t]*<li>\s*\n[ \t]*<a href="\/(?:wedding-)?packages?">[^<]*<\/a>\s*\n[ \t]*<\/li>/;

/**
 * The same link written on one line.
 *
 * 404.html carries its section list as `<li><a href="...">Label</a></li>` with
 * no line breaks inside, which neither pattern above reaches. It is a
 * navigation list like the others and goes the same way.
 */
const INLINE_ITEM = /\n[ \t]*<li><a href="\/(?:wedding-)?packages?">[^<]*<\/a><\/li>/;

function removeHeaderItem(html, problems) {
  if (!/<li class="nav-item">\s*\n\s*<a[^>]*href="\/(?:wedding-)?packages?"/.test(html)) return html;
  if (!HEADER_ITEM.test(html)) {
    problems.push("the packages menu item is present but did not match");
    return html;
  }
  return html.replace(new RegExp(HEADER_ITEM.source, "g"), "");
}

function removeFooterItem(html, problems) {
  if (!/<li>\s*\n\s*<a href="\/(?:wedding-)?packages?">/.test(html)) return html;
  if (!FOOTER_ITEM.test(html)) {
    problems.push("the packages footer link is present but did not match");
    return html;
  }
  return html.replace(new RegExp(FOOTER_ITEM.source, "g"), "");
}

function removeInlineItem(html) {
  return html.replace(new RegExp(INLINE_ITEM.source, "g"), "");
}

/**
 * Adds `noindex, nofollow` to a page that is no longer linked.
 *
 * Placed immediately before the canonical link where there is one, so the
 * robots directive sits with the other indexing metadata rather than at a
 * random point in the head. An existing robots tag is replaced rather than
 * duplicated -- two of them is undefined behaviour, and a `index, follow`
 * left in place would contradict this one.
 */
function addNoindex(html, problems) {
  if (html.includes('content="noindex, nofollow"')) return html;

  const existing = /<meta\s+name="robots"[^>]*>/i;
  if (existing.test(html)) return html.replace(existing, ROBOTS_TAG);

  const canonical = /(\n[ \t]*)?<link rel="canonical"[^>]*>/i;
  if (canonical.test(html)) {
    return html.replace(canonical, (whole, indent) => `${indent ?? "\n"}${ROBOTS_TAG}${whole}`);
  }

  const head = /<head[^>]*>/i;
  if (!head.test(html)) {
    problems.push("no <head> to put the robots tag in");
    return html;
  }
  return html.replace(head, (whole) => `${whole}\n${ROBOTS_TAG}`);
}

/**
 * @param html   the document
 * @param isPackagesPage  true for the five pages being unpublished
 */
export function transform(html, isPackagesPage = false) {
  const problems = [];
  let next = removeHeaderItem(html, problems);
  next = removeFooterItem(next, problems);
  next = removeInlineItem(next);
  if (isPackagesPage) next = addNoindex(next, problems);

  return { html: next, changed: next !== html, problems };
}

/** True when a path is one of the pages being unpublished. */
export function isPackagesPath(path) {
  const clean = `/${String(path).replace(/^site-public/, "").replace(/index\.html$/, "").replace(/^\/+/, "")}`;
  return NOINDEX_PATHS.includes(clean.endsWith("/") ? clean : `${clean}/`);
}
