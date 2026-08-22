/**
 * Maps a request path to the stored shell and content that render it.
 *
 * This is what makes the managed pages database-only: nothing here reads from
 * site-public. Anything it cannot resolve returns null, and the worker falls
 * back to serving the original file, so a database problem degrades to the old
 * behaviour instead of losing the page.
 */
import type { DatabaseEnv } from "../db/client";
import type { BlogPost, CityPage, Hotel, StaticPage } from "../db/schema";
import {
  BLOG_LISTING_PATHS,
  blogSlugFromPath,
  blogTaxonomyFromPath,
  findPostBySlug,
  loadPublishedPosts,
  postsForTaxonomy,
} from "./blog";
import { findHotelByPath, hotelPathFrom, loadHotels } from "./hotel";
import { loadHeroSlides } from "./hero";
import { loadSiteSettings } from "./settings";
import { cityFromListingPath, venuesForCity } from "./venue-listing";
import { loadCityPage, loadTemplate } from "./template";
import { loadLabels, type ResolvedLabels } from "./labels";
import { loadStaticPage, normalizeStaticPath } from "./static-pages";

export interface ResolvedPage {
  /** Shell markup from page_templates. */
  html: string;
  /** Path the injection handlers should treat this as. */
  pathname: string;
  input: {
    settings: Awaited<ReturnType<typeof loadSiteSettings>>;
    heroSlides: Awaited<ReturnType<typeof loadHeroSlides>>;
    blogPosts: BlogPost[];
    taxonomyPosts: BlogPost[];
    blogPost: BlogPost | null;
    hotel: Hotel | null;
    venues: Hotel[];
    cityVenues: Hotel[];
    cityPage: CityPage | null;
    labels: ResolvedLabels;
    /** Set only for a stored page; carries its SEO fields. */
    staticPage: StaticPage | null;
  };
}

const EMPTY = {
  heroSlides: [] as Awaited<ReturnType<typeof loadHeroSlides>>,
  blogPosts: [] as BlogPost[],
  taxonomyPosts: [] as BlogPost[],
  blogPost: null,
  hotel: null,
  venues: [] as Hotel[],
  cityVenues: [] as Hotel[],
  cityPage: null,
  staticPage: null,
};

function isHomepage(pathname: string): boolean {
  return pathname === "/" || pathname === "/index.html";
}

function isContactPage(pathname: string): boolean {
  return pathname === "/contact" || pathname === "/contact/" || pathname === "/contact/index.html";
}

/**
 * Returns everything needed to render the page, or null when this path is not
 * one the database owns.
 */
export interface ResolveOptions {
  /**
   * Include unpublished content. Only ever set for a signed-in admin, and the
   * response is then served uncached and noindex.
   */
  preview?: boolean;
}

export async function resolvePage(
  env: DatabaseEnv,
  pathname: string,
  options: ResolveOptions = {},
): Promise<ResolvedPage | null> {
  const settings = await loadSiteSettings(env);
  const labels = await loadLabels(env);
  const base = { settings, labels, ...EMPTY };

  // Checked before the pattern matches below: a stored page is an exact path,
  // and one of them (/destination-wedding-in-goa) sits close enough to the venue
  // patterns that order matters.
  const stored = await loadStaticPage(env, pathname);
  if (stored) {
    return {
      html: stored.html,
      pathname: normalizeStaticPath(pathname),
      input: { ...base, staticPage: stored },
    };
  }

  if (isHomepage(pathname)) {
    const html = await loadTemplate(env, "home");
    if (!html) return null;
    return { html, pathname: "/", input: { ...base, heroSlides: await loadHeroSlides(env) } };
  }

  if (isContactPage(pathname)) {
    const html = await loadTemplate(env, "contact");
    if (!html) return null;
    return { html, pathname: "/contact/", input: base };
  }

  const venuePath = hotelPathFrom(pathname);
  if (venuePath) {
    const venues = await loadHotels(env);
    // A draft is not in the published list, so preview looks it up directly.
    const hotel =
      venues.find((v) => v.city === venuePath.city && v.slug === venuePath.slug) ??
      (options.preview ? await findHotelByPath(env, venuePath) : null);
    if (!hotel) return null;

    const html = await loadTemplate(env, hotel.shellKey);
    if (!html) return null;
    return {
      html,
      pathname: `/destination-wedding/${venuePath.city}/${venuePath.slug}`,
      // The city record supplies the numeric id the "View All" link filters by.
      input: { ...base, hotel, venues, cityPage: await loadCityPage(env, venuePath.city) },
    };
  }

  const listingCity = cityFromListingPath(pathname);
  if (listingCity) {
    const cityPage = await loadCityPage(env, listingCity);
    if (!cityPage) return null;

    const html = await loadTemplate(env, cityPage.shellKey);
    if (!html) return null;

    const venues = await loadHotels(env);
    return {
      html,
      pathname: `/destination-wedding/${listingCity}/`,
      input: {
        ...base,
        venues,
        cityPage,
        cityVenues: await venuesForCity(env, listingCity, venues),
      },
    };
  }

  const taxonomy = blogTaxonomyFromPath(pathname);
  if (taxonomy) {
    const html = await loadTemplate(env, `blog-tax:${taxonomy.taxonomy}:${taxonomy.slug}`);
    if (!html) return null;

    const blogPosts = await loadPublishedPosts(env);
    return {
      html,
      pathname: `/blogs/${taxonomy.taxonomy}/${taxonomy.slug}/`,
      input: { ...base, blogPosts, taxonomyPosts: await postsForTaxonomy(env, taxonomy, blogPosts) },
    };
  }

  if (BLOG_LISTING_PATHS.has(pathname)) {
    const html = await loadTemplate(env, "blog-listing");
    if (!html) return null;
    return { html, pathname: "/blogs/", input: { ...base, blogPosts: await loadPublishedPosts(env) } };
  }

  const slug = blogSlugFromPath(pathname);
  if (slug) {
    const blogPosts = await loadPublishedPosts(env);
    const blogPost =
      blogPosts.find((post) => post.slug === slug) ??
      (options.preview ? await findPostBySlug(env, slug) : null);
    if (!blogPost) return null;

    const html = await loadTemplate(env, blogPost.shellKey);
    if (!html) return null;
    return { html, pathname: `/blogs/${slug}`, input: { ...base, blogPosts, blogPost } };
  }

  return null;
}
