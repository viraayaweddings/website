/**
 * Pages that still answer at their URL but are kept out of search and off the
 * site's own links until their content is ready.
 *
 * `/faqs` carries placeholder answers (Lorem Ipsum) in its stored copy. It is
 * served with `x-robots-tag: noindex`, left out of the sitemap and dropped
 * from the footer; the page itself is untouched so it can be fixed in the
 * panel and brought back by removing it here.
 */
export const HELD_BACK_PATHS: ReadonlySet<string> = new Set(["/faqs"]);

export function isHeldBack(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return HELD_BACK_PATHS.has(path);
}
