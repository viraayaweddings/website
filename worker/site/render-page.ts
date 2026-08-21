/**
 * Renders the public pages an admin can edit.
 *
 * Two paths lead here. A page the database owns is rebuilt from its stored
 * shell, so an edit in the panel is live on the next request. Everything else
 * keeps its original site-public markup and only has the admin-managed pieces
 * -- contact details, social links -- swapped into it.
 *
 * Both fall back to the untouched page rather than erroring: a database that is
 * unreachable, or a shell that was never seeded, should cost the visitor
 * freshness, not the page.
 */
import { enhancePublicHtml } from "./public-html";
import { injectManagedContent, isHtmlResponse, needsInjection } from "./inject";
import { resolvePage } from "./resolve-page";
import { templateResponse, loadCityPage } from "./template";
import { loadSiteSettings } from "./settings";
import { loadHeroSlides } from "./hero";
import { loadLabels } from "./labels";
import {
  BLOG_LISTING_PATHS,
  blogSlugFromPath,
  blogTaxonomyFromPath,
  loadPublishedPosts,
  postsForTaxonomy,
} from "./blog";
import { hotelPathFrom, loadHotels } from "./hotel";
import { cityFromListingPath, venuesForCity } from "./venue-listing";

/** Managed pages are cached briefly so an edit shows up quickly. */
const MANAGED_CACHE_CONTROL = "public, max-age=30";

/** Paths whose content the database owns. Kept in step with `resolvePage`. */
export function isDatabaseOwnedPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/index.html") return true;
  if (pathname === "/contact" || pathname.startsWith("/contact/")) return true;
  if (pathname === "/blogs" || pathname.startsWith("/blogs/")) return true;
  if (pathname.startsWith("/destination-wedding/")) return true;
  return false;
}

/**
 * Rebuilds a page from its stored shell. Returns null when this path is not one
 * the database owns, or when its shell has not been seeded.
 */
export async function renderFromDatabase(pathname: string, origin: string): Promise<Response | null> {
  let resolved;
  try {
    resolved = await resolvePage({}, pathname);
  } catch {
    return null;
  }
  if (!resolved) return null;

  const injected = injectManagedContent(
    templateResponse(resolved.html),
    resolved.pathname,
    resolved.input,
    origin,
  );
  const enhanced = await enhancePublicHtml(injected, resolved.pathname);

  return withCacheControl(enhanced, MANAGED_CACHE_CONTROL);
}

/**
 * Swaps admin-managed pieces into a page's original markup. Non-HTML responses
 * are returned untouched.
 */
export async function applyManagedContent(
  response: Response,
  pathname: string,
  origin: string,
): Promise<Response> {
  if (!isHtmlResponse(response)) return response;

  let input;
  try {
    input = await loadManagedContent(pathname);
  } catch {
    return response;
  }

  const applyChanges = needsInjection(pathname, input);
  const injected = injectManagedContent(response, pathname, input, origin, applyChanges);
  const enhanced = await enhancePublicHtml(injected, pathname);

  return applyChanges ? withCacheControl(enhanced, MANAGED_CACHE_CONTROL) : enhanced;
}

function withCacheControl(response: Response, value: string): Response {
  const headers = new Headers(response.headers);
  headers.set("cache-control", value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Only the data a given page can actually use is fetched: hero slides are
 * homepage-only and posts are blog-only, so most pages cost a single lookup.
 */
async function loadManagedContent(pathname: string) {
  const env = {};
  const wantsHero = pathname === "/" || pathname === "/index.html";
  const slug = blogSlugFromPath(pathname);
  const taxonomy = blogTaxonomyFromPath(pathname);
  const wantsPosts = Boolean(slug) || Boolean(taxonomy) || BLOG_LISTING_PATHS.has(pathname);
  const hotelPath = hotelPathFrom(pathname);
  const listingCity = cityFromListingPath(pathname);

  const [settings, heroSlides, blogPosts, venues, labels] = await Promise.all([
    loadSiteSettings(env),
    wantsHero ? loadHeroSlides(env) : Promise.resolve([]),
    wantsPosts ? loadPublishedPosts(env) : Promise.resolve([]),
    hotelPath || listingCity ? loadHotels(env) : Promise.resolve([]),
    loadLabels(env),
  ]);

  return {
    settings,
    heroSlides,
    blogPosts,
    blogPost: slug ? blogPosts.find((post) => post.slug === slug) ?? null : null,
    taxonomyPosts: taxonomy ? await postsForTaxonomy(env, taxonomy, blogPosts) : [],
    hotel: hotelPath
      ? venues.find((venue) => venue.city === hotelPath.city && venue.slug === hotelPath.slug) ?? null
      : null,
    venues,
    cityVenues: listingCity ? await venuesForCity(env, listingCity, venues) : [],
    cityPage: listingCity
      ? await loadCityPage(env, listingCity)
      : hotelPath
        ? await loadCityPage(env, hotelPath.city)
        : null,
    labels,
  };
}
