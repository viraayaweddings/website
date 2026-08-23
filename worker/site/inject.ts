/**
 * Streams managed content into the static site-public HTML at request time.
 *
 * The pages keep shipping their original markup; only the specific nodes an
 * admin controls are swapped. When nothing has been customised the response is
 * passed straight through, so an unmanaged site stays byte-for-byte unchanged.
 */
import "../html-rewriter.ts";
import type { BlogPost, HeroSlide, Hotel } from "../db/schema";
import { escapeHtml, renderHeroSlides } from "./hero";
import { whatsappHref, type ResolvedSettings } from "./settings";
import { BLOG_LISTING_PATHS, blogSlugFromPath, blogTaxonomyFromPath, renderTaxonomyGrid } from "./blog";
import { applyListingHandlers, applyPostHandlers } from "./blog-inject";
import { hotelPathFrom } from "./hotel";
import { applyCalculatorHandlers } from "./calculator-inject";
import type { CalculatorConfig } from "./calculator-store";
import { applyVenueListingHandlers } from "./venue-listing-inject";
import type { VenueTypeOption } from "./venue-types";
import { applyHotelHandlers } from "./hotel-inject";
import {
  appendJsonLd,
  articleJsonLd,
  faqJsonLd,
  hotelJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "./json-ld";
import {
  cityFromListingPath,
  renderCityHeading,
  renderCityCards,
  renderPagination,
  renderResultsSummary,
} from "./venue-listing";
import type { CityPage, StaticPage } from "../db/schema";
import type { ResolvedLabels } from "./labels";

export interface InjectionInput {
  settings: ResolvedSettings;
  heroSlides: HeroSlide[];
  /** The article being served, when the path names one that is published. */
  blogPost: BlogPost | null;
  /** Published posts, for the listing grid. */
  blogPosts: BlogPost[];
  /** Posts a category or tag page lists, in order. */
  taxonomyPosts: BlogPost[];
  /** The venue being served, when the path names one that is published. */
  hotel: Hotel | null;
  /** Every published venue, for resolving listing cards. */
  venues: Hotel[];
  /** The venues a city index page lists, in order. */
  cityVenues: Hotel[];
  /** Per-city fields for a city index page. */
  cityPage: CityPage | null;
  /** Editable section headings and field labels. */
  labels?: ResolvedLabels;
  /** Set only for a page stored whole in static_pages. */
  staticPage?: StaticPage | null;
  /**
   * Cities, tax rates and currencies for the calculators.
   *
   * Null only where the caller has no database at all; an unreadable database
   * yields a config with `loaded: false`, which the handlers skip.
   */
  calculator?: CalculatorConfig | null;
  /** The wedding-type vocabulary the listing filters offer. */
  venueTypes?: VenueTypeOption[];
}

/** Labels on the contact page, matched against the <h3> above each value. */
const CONTACT_LABELS = new Set(["phone", "email", "address"]);

function isContactPage(pathname: string): boolean {
  return pathname.startsWith("/contact") || pathname.startsWith("/get_in_touch");
}

function isHomepage(pathname: string): boolean {
  return pathname === "/" || pathname === "/index.html";
}

function isBlogListing(pathname: string): boolean {
  return BLOG_LISTING_PATHS.has(pathname);
}

function absoluteUrl(origin: string, value: string): string {
  if (!value) return origin;
  if (/^https?:\/\//i.test(value)) return value;
  return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
}

function publicCanonical(origin: string, pathname: string): string {
  const clean = pathname === "/" || pathname === "/index.html" ? "/" : pathname.replace(/\/$/, "");
  return absoluteUrl(origin, clean || "/");
}

export function needsInjection(pathname: string, input: InjectionInput): boolean {
  if (input.settings.hasStoredValues) return true;
  // A page with a calculator has data to receive even when nothing else on it
  // is admin-managed: /hotel-cost-calculator has no stored settings of its own.
  if (input.calculator?.loaded) return true;
  if (input.venueTypes?.length) return true;
  if (isHomepage(pathname) && input.heroSlides.length > 0) return true;
  if (isBlogListing(pathname) && input.blogPosts.length > 0) return true;
  if (blogSlugFromPath(pathname) && input.blogPost) return true;
  // A taxonomy page with no posts still renders its own empty state, so the
  // loaded post list is what tells us the database is actually available.
  if (blogTaxonomyFromPath(pathname) && input.blogPosts.length > 0) return true;
  if (hotelPathFrom(pathname) && input.hotel) return true;
  if (cityFromListingPath(pathname) && input.cityPage) return true;
  if (input.staticPage) return true;
  return false;
}

export function injectManagedContent(
  response: Response,
  pathname: string,
  input: InjectionInput,
  origin = "",
  applyChanges = true,
): Response {
  if (typeof HTMLRewriter === "undefined") return response;

  const { values } = input.settings;
  const rewriter = new HTMLRewriter();

  if (applyChanges) {
  if (input.settings.hasStoredValues) {
    // Floating WhatsApp button, present on almost every page.
    rewriter.on("a.whatsapp-btn", {
      element(element) {
        element.setAttribute("href", whatsappHref(values));
      },
    });

    // Footer social icons. The selector matches the original markup, so it
    // keeps working after the stored URL is changed to something else.
    rewriter.on('.social-icon a[href*="instagram.com"]', {
      element(element) {
        element.setAttribute("href", values.instagramUrl);
      },
    });
    rewriter.on('.social-icon a[href*="linkedin.com"]', {
      element(element) {
        element.setAttribute("href", values.linkedinUrl);
      },
    });

    if (isContactPage(pathname)) {
      // The phone/email/address blocks carry no ids, so each value is matched
      // by the <h3> label that immediately precedes it in the source.
      let heading = "";
      let pendingLabel = "";

      rewriter.on(".details h3", {
        text(chunk) {
          heading += chunk.text;
          if (!chunk.lastInTextNode) return;
          const label = heading.trim().toLowerCase();
          pendingLabel = CONTACT_LABELS.has(label) ? label : "";
          heading = "";
        },
      });

      rewriter.on(".details p", {
        element(element) {
          const label = pendingLabel;
          pendingLabel = "";

          if (label === "phone") element.setInnerContent(escapeHtml(values.phone));
          else if (label === "email") element.setInnerContent(escapeHtml(values.email));
          else if (label === "address") {
            element.setInnerContent(values.addressLines.map(escapeHtml).join("<br>"), { html: true });
          }
        },
      });
    }
  }

  if (isHomepage(pathname) && input.heroSlides.length > 0) {
    rewriter.on("div.slider-banner", {
      element(element) {
        element.setInnerContent(renderHeroSlides(input.heroSlides), { html: true });
      },
    });
  }

  if (isBlogListing(pathname) && input.blogPosts.length > 0) {
    applyListingHandlers(rewriter, input.blogPosts, input.labels);
  }

  if (blogTaxonomyFromPath(pathname) && input.blogPosts.length > 0) {
    rewriter.on(".blog-wrapper .container > .row", {
      element(element) {
        element.setInnerContent(renderTaxonomyGrid(input.taxonomyPosts, input.labels), { html: true });
      },
    });
  }

  if (input.blogPost && blogSlugFromPath(pathname) === input.blogPost.slug) {
    applyPostHandlers(rewriter, input.blogPost, input.labels);
  }

  const hotelPath = hotelPathFrom(pathname);
  if (input.hotel && hotelPath?.slug === input.hotel.slug && hotelPath.city === input.hotel.city) {
    applyHotelHandlers(
      rewriter,
      input.hotel,
      input.venues,
      input.cityPage?.cityId ?? "",
      input.labels,
      input.calculator,
    );
  }

  // Gated on the city record rather than on it having venues: a city that
  // lists none still needs its own title, filter value and empty grid, instead
  // of inheriting whatever the shared shell happens to carry.
  if (cityFromListingPath(pathname) && input.cityPage) {
    const cityPage = input.cityPage;
    // Cities with more than a page of venues carry a pager; the shell may not,
    // so it is rendered from the stored total rather than copied.
    const total = cityPage.totalVenues || input.cityVenues.length;

    rewriter.on(".row.g-3.change-colm", {
      element(element) {
        element.setInnerContent(renderCityCards(input.cityVenues, input.labels), { html: true });
        // The pager sits after the grid, not inside it.
        const pager = renderPagination(total, cityPage.cityId);
        if (pager) element.after(pager, { html: true });
      },
    });

    rewriter.on('[id$="ummary"].text-muted', {
      element(element) {
        // The shell ships one city's wording; restate it for this one.
        element.setInnerContent(renderResultsSummary(total));
      },
    });

    // The shell ships one city's heading ("Luxury Hotels"). A stored one
    // replaces it; both halves empty leaves the shipped wording alone.
    if (cityPage.heading || cityPage.headingEmphasis) {
      rewriter.on("h1.all-heading", {
        element(element) {
          element.setInnerContent(renderCityHeading(cityPage), { html: true });
        },
      });
    }

    rewriter.on("title", {
      element(element) {
        element.setInnerContent(cityPage.seoTitle);
      },
    });
    rewriter.on('meta[name="description"]', {
      element(element) {
        element.setAttribute("content", cityPage.metaDescription);
      },
    });
    rewriter.on('input[name="city_ids[]"]', {
      element(element) {
        element.setAttribute("value", cityPage.cityId);
      },
    });
    // The shell carries every city as an option; mark this one as chosen.
    // Only touch options that actually change: rewriting an untouched tag
    // reserialises it and loses the original spacing.
    // Only touch options that actually change: rewriting an untouched tag
    // reserialises it and loses the original spacing.
    rewriter.on("select option", {
      element(element) {
        const isChosen = element.getAttribute("value") === cityPage.cityId;
        const wasChosen = element.hasAttribute("selected");
        if (isChosen && !wasChosen) element.setAttribute("selected", "selected");
        else if (!isChosen && wasChosen) element.removeAttribute("selected");
      },
    });
  }
  }

  // A stored page carries its own title and description. The markup came from
  // the clone and already has both; these make them editable rather than frozen.
  if (input.staticPage) {
    const page = input.staticPage;
    if (page.title) {
      rewriter.on("title", {
        element(element) {
          element.setInnerContent(page.title);
        },
      });
    }
    if (page.metaDescription) {
      rewriter.on('meta[name="description"]', {
        element(element) {
          element.setAttribute("content", page.metaDescription);
        },
      });
    }
  }

  // Outside the `applyChanges` gate: the calculator config is the page's own
  // data, not an admin override of it, and a page that skipped the rest still
  // needs its dropdown and its tax rates.
  if (input.calculator) applyCalculatorHandlers(rewriter, input.calculator);
  // Same reasoning: the filter list is the page's own data, and the selector
  // only matches the 54 pages that carry the filter.
  if (input.venueTypes) applyVenueListingHandlers(rewriter, input.venueTypes);

  const siteOrigin = origin || "https://viraayaweddings.com";
  const canonical = publicCanonical(siteOrigin, pathname);
  rewriter.on('link[rel="canonical"]', {
    element(element) {
      element.setAttribute("href", canonical);
    },
  });
  rewriter.on('meta[property="og:url"]', {
    element(element) {
      element.setAttribute("content", canonical);
    },
  });
  rewriter.on('meta[property="og:image"], meta[name="twitter:image"]', {
    element(element) {
      const value = element.getAttribute("content");
      if (value) element.setAttribute("content", absoluteUrl(siteOrigin, value));
    },
  });

  const structuredData = [
    organizationJsonLd(values, siteOrigin),
    isHomepage(pathname) ? websiteJsonLd(siteOrigin) : null,
    input.blogPost ? articleJsonLd(input.blogPost, siteOrigin) : null,
    input.blogPost ? faqJsonLd(input.blogPost.faqs) : null,
    input.hotel ? hotelJsonLd(input.hotel, siteOrigin) : null,
    input.hotel ? faqJsonLd(input.hotel.faqs) : null,
  ];
  appendJsonLd(rewriter, structuredData);

  return rewriter.transform(response);
}

/** Only text/html responses can be rewritten. */
export function isHtmlResponse(response: Response): boolean {
  return (response.headers.get("content-type") || "").toLowerCase().includes("text/html");
}
