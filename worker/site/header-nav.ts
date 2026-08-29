/**
 * Puts Home back in the header nav, on every page.
 *
 * Only the homepage was cloned with a Home link in its header. On the other
 * 291 pages the nav simply starts at WEDDING PACKAGES -- the `<li>` is not
 * hidden or faded, it was never written -- so the one item that takes a
 * visitor back to the start vanishes the moment they leave the start. The
 * footer's "Explore" list does keep a Home link everywhere, which is why the
 * link reads as fading out rather than going.
 *
 * Restored here rather than in 292 files because the same nav is also stored
 * in the page_templates rows an admin edits, and files and rows would drift
 * apart the first time one of those was saved.
 */

/** The header nav's list. Absent on pages with no header, which are left alone. */
const NAV_LIST = /<ul class="navbar-nav me-auto">/i;

/** A Home item already in the nav -- the homepage has one, so it is not doubled. */
const NAV_HOME_LINK = /<a class="nav-link[^"]*" href="\/">Home<\/a>/i;

const NAV_HOME_ITEM = '<li class="nav-item"><a class="nav-link" href="/">Home</a></li>';
const NAV_HOME_ITEM_ACTIVE =
  '<li class="nav-item"><a class="nav-link active" href="/">Home</a></li>';

/**
 * WEDDING PACKAGES claims to be the current page on every page.
 *
 * The clone wrote the class twice -- `class="nav-link active" ... class="active"`
 * -- and a parser drops the duplicate attribute, so the first wins and the item
 * renders highlighted site-wide. Left alone, restoring Home above it would put
 * two "you are here" markers in one nav, so the marker goes back where it
 * belongs: on this item only when the visitor is actually on it.
 */
const NAV_PACKAGES_LINK = /<a class="nav-link active" href="\/wedding-packages" class="active">/gi;

/**
 * Returns `html` with a Home item at the head of the header nav and exactly one
 * item marked current.
 *
 * Idempotent, so it is safe on markup that has already been through it: a page
 * that already has a Home nav link only has the WEDDING PACKAGES marker
 * corrected.
 */
export function restoreHomeNavItem(html: string, pathname: string): string {
  const onHome = pathname === "" || pathname === "/" || pathname === "/index.html";
  const onPackages =
    pathname === "/wedding-packages" || pathname.startsWith("/wedding-packages/");

  const next = html.replace(
    NAV_PACKAGES_LINK,
    onPackages
      ? '<a class="nav-link active" href="/wedding-packages">'
      : '<a class="nav-link" href="/wedding-packages">',
  );

  if (NAV_HOME_LINK.test(next)) return next;
  return next.replace(NAV_LIST, (list) => list + (onHome ? NAV_HOME_ITEM_ACTIVE : NAV_HOME_ITEM));
}
