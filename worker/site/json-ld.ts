/**
 * Schema.org JSON-LD helpers for injected public pages.
 */
import type { BlogPost, Hotel } from "../db/schema";
import type { SiteSettings } from "./settings";
import { parseFaqs } from "./blog";

function absolute(origin: string, path: string): string {
  if (!path) return origin;
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function organizationJsonLd(settings: SiteSettings, origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Viraaya Weddings",
    url: origin,
    logo: absolute(origin, "/user/assets/images/logo.png"),
    email: settings.email,
    telephone: settings.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.addressLines.join(", "),
    },
    sameAs: [settings.instagramUrl, settings.linkedinUrl].filter(Boolean),
  };
}

export function websiteJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Viraaya Weddings",
    url: origin,
  };
}

export function articleJsonLd(post: BlogPost, origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.heading,
    name: post.seoTitle,
    description: post.metaDescription,
    image: post.ogImage ? absolute(origin, post.ogImage) : undefined,
    url: absolute(origin, `/blogs/${post.slug}`),
    datePublished: post.publishedAt instanceof Date ? post.publishedAt.toISOString() : undefined,
    dateModified: post.updatedAt instanceof Date ? post.updatedAt.toISOString() : undefined,
    author: {
      "@type": "Organization",
      name: "Viraaya Weddings",
    },
    publisher: {
      "@type": "Organization",
      name: "Viraaya Weddings",
      logo: {
        "@type": "ImageObject",
        url: absolute(origin, "/user/assets/images/logo.png"),
      },
    },
  };
}

export function hotelJsonLd(hotel: Hotel, origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: hotel.name,
    description: hotel.metaDescription,
    image: hotel.ogImage ? absolute(origin, hotel.ogImage) : undefined,
    url: absolute(origin, `/destination-wedding/${hotel.city}/${hotel.slug}`),
    address: hotel.address,
    telephone: undefined,
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

/** Appends JSON-LD blocks before </head> on every rewritten page. */
export function appendJsonLd(rewriter: HTMLRewriter, blocks: Array<Record<string, unknown> | null>): void {
  const html = jsonLdScripts(blocks);
  if (!html) return;

  rewriter.on("head", {
    element(element) {
      element.append(html, { html: true });
    },
  });
}
