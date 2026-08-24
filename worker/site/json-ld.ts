/**
 * Schema.org JSON-LD helpers for injected public pages.
 */
import type { BlogPost, Hotel } from "../db/schema";
import type { SiteSettings } from "./settings";
import { parseFaqs } from "./blog";

/**
 * ISO publish date for an article.
 *
 * There is no `publishedAt` column -- this used to read one, so every article
 * shipped its structured data without a `datePublished` at all. The date an
 * editor actually controls is `publishedLabel` ("August 07, 2026"), which is
 * what readers see, so that wins; `createdAt` is the fallback when it is blank
 * or not a date anyone can parse.
 */
function publishedIso(post: BlogPost): string | undefined {
  if (post.publishedLabel) {
    const labelled = new Date(post.publishedLabel);
    if (!Number.isNaN(labelled.getTime())) return labelled.toISOString();
  }
  return post.createdAt instanceof Date ? post.createdAt.toISOString() : undefined;
}

function absolute(origin: string, path: string): string {
  if (!path) return origin;
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * The logo, as R2 serves it.
 *
 * Written out rather than looked up: structured data is emitted on every page
 * and must not wait on a query. The key is a content hash, so it only changes
 * if the logo file itself does -- and the file is not something the panel
 * edits.
 */
const LOGO_PATH = "/media/42da0fe0873624df76066e15bf7632b7656368f5cecefe5f18a74fddd75794e4.png";

/**
 * Splits the stored address lines into the fields a PostalAddress actually has.
 *
 * The whole address used to go into `streetAddress`, which leaves a consumer no
 * way to place the business. The lines are edited as free text, so this parses
 * rather than assumes: the last line carries the pincode ("Delhi - 110074"), the
 * one before it the locality, and whatever precedes them is the street.
 */
function postalAddress(addressLines: string[]) {
  const lines = addressLines.map((line) => line.replace(/,\s*$/, "").trim()).filter(Boolean);

  const pincodeLine = lines.findIndex((line) => /\b\d{6}\b/.test(line));
  const postalCode = pincodeLine === -1 ? "" : (lines[pincodeLine].match(/\b\d{6}\b/) || [""])[0];
  const region =
    pincodeLine === -1 ? "" : lines[pincodeLine].replace(/[-–]\s*\d{6}\b/, "").replace(/,\s*$/, "").trim();

  const remaining = pincodeLine === -1 ? lines : lines.slice(0, pincodeLine);
  // The locality is the tail of the line before the pincode ("Satbari, New Delhi").
  const localityLine = remaining[remaining.length - 1] || "";
  const localityParts = localityLine.split(",").map((part) => part.trim()).filter(Boolean);
  const locality = localityParts[localityParts.length - 1] || "";

  const street = [...remaining.slice(0, -1), ...localityParts.slice(0, -1)].join(", ");

  return {
    "@type": "PostalAddress",
    streetAddress: street || localityLine,
    addressLocality: locality || undefined,
    addressRegion: region || undefined,
    postalCode: postalCode || undefined,
    addressCountry: "IN",
  };
}

/**
 * A stable identifier for the business entity.
 *
 * Every page emits the organisation, so without an `@id` a consumer has no way
 * to know the 288 copies describe one thing. Answer engines reconcile on this.
 */
function organizationId(origin: string): string {
  return `${origin}/#organization`;
}

export function organizationJsonLd(settings: SiteSettings, origin: string) {
  const digits = settings.whatsappNumber.replace(/\D/g, "");

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organizationId(origin),
    name: "Viraaya Weddings",
    url: origin,
    logo: absolute(origin, LOGO_PATH),
    image: absolute(origin, LOGO_PATH),
    email: settings.email,
    telephone: settings.phone,
    address: postalAddress(settings.addressLines),
    areaServed: { "@type": "Country", name: "India" },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: settings.phone,
      email: settings.email,
      areaServed: "IN",
      availableLanguage: ["en", "hi"],
    },
    sameAs: [
      settings.instagramUrl,
      settings.linkedinUrl,
      digits ? `https://wa.me/${digits}` : "",
    ].filter(Boolean),
  };
}

export function websiteJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    name: "Viraaya Weddings",
    url: origin,
    publisher: { "@id": organizationId(origin) },
    inLanguage: "en-IN",
    // The site has a working venue search; without this declared the sitelinks
    // searchbox can never appear.
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${origin}/hotel-listing?city_search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Human label for a URL segment, e.g. "delhi-ncr" -> "Delhi NCR". */
function segmentLabel(segment: string): string {
  const words = segment.split("-").filter(Boolean);
  return words
    .map((word) =>
      word.length <= 3 && word === word.toLowerCase() && /^(ncr|itc|jw|the|and|by)$/.test(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

/**
 * Breadcrumbs derived from the URL, with an optional label for the leaf.
 *
 * The catalogue is three levels deep and had no breadcrumb markup on any page,
 * which costs the SERP trail and leaves a crawler to infer the hierarchy. The
 * path already encodes it, so nothing needs to be stored to emit this.
 */
export function breadcrumbJsonLd(
  pathname: string,
  origin: string,
  leafName?: string,
): Record<string, unknown> | null {
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return null;

  const items = segments.map((segment, index) => {
    const isLeaf = index === segments.length - 1;
    const url = `${origin}/${segments.slice(0, index + 1).join("/")}`;
    return {
      "@type": "ListItem",
      position: index + 2,
      name: isLeaf && leafName ? leafName : segmentLabel(segment),
      item: url,
    };
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
      ...items,
    ],
  };
}

export function articleJsonLd(post: BlogPost, origin: string) {
  const url = absolute(origin, `/blogs/${post.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: post.heading,
    name: post.seoTitle,
    description: post.metaDescription,
    image: post.ogImage ? absolute(origin, post.ogImage) : undefined,
    url,
    mainEntityOfPage: url,
    isPartOf: { "@id": `${origin}/#website` },
    datePublished: publishedIso(post),
    dateModified: post.updatedAt instanceof Date ? post.updatedAt.toISOString() : undefined,
    author: { "@id": organizationId(origin) },
    publisher: { "@id": organizationId(origin) },
  };
}

/**
 * The hotels table stores each venue's own copy, not this data -- `city` on a
 * `hotels` row is just the URL segment ("goa"), and there is no numeric room
 * count, star rating or coordinate anywhere on it. `containedInPlace` is the
 * one property here built from real, reliably structured data; the rest
 * (`priceRange`, `geo`, capacity) would need the calculator's own tables
 * joined in, which this function does not have.
 */
export function hotelJsonLd(hotel: Hotel, origin: string) {
  const url = absolute(origin, `/destination-wedding/${hotel.city}/${hotel.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "@id": `${url}#hotel`,
    name: hotel.name,
    description: hotel.metaDescription,
    image: hotel.ogImage ? absolute(origin, hotel.ogImage) : undefined,
    url,
    address: hotel.address,
    containedInPlace: {
      "@type": "City",
      name: hotel.cityLabel || segmentLabel(hotel.city),
    },
  };
}

export function faqJsonLd(faqsJson: string) {
  const faqs = parseFaqs(faqsJson).filter((faq) => faq.question && faq.answer);
  if (!faqs.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      },
    })),
  };
}

export function jsonLdScripts(blocks: Array<Record<string, unknown> | null>): string {
  return blocks
    .filter((block): block is Record<string, unknown> => Boolean(block))
    .map((block) => `<script type="application/ld+json">${JSON.stringify(block)}</script>`)
    .join("");
}

/**
 * Appends JSON-LD blocks into the page's head.
 *
 * A handful of blog shells carry a second, invalid `<head>` tag lower in the
 * body -- a leftover style block that should never have been wrapped in one.
 * HTMLRewriter streams tokens rather than a parsed tree, so it has no notion
 * that a second `<head>` is malformed and matches it just the same, which is
 * how every block here ended up doubled on those pages. The guard below
 * appends once regardless of how many `head`-tagged tokens the stream
 * contains, so a shell defect degrades to "ignored" rather than "duplicated
 * structured data."
 */
export function appendJsonLd(rewriter: HTMLRewriter, blocks: Array<Record<string, unknown> | null>): void {
  const html = jsonLdScripts(blocks);
  if (!html) return;

  let appended = false;
  rewriter.on("head", {
    element(element) {
      if (appended) return;
      appended = true;
      element.append(html, { html: true });
    },
  });
}
