/**
 * Works out where an uploaded image is used.
 *
 * References are computed from the content tables on demand rather than kept
 * in a counter, because a counter drifts the moment anything writes without
 * updating it. A query is cheap and always tells the truth.
 */
import type { Db } from "../db/client";
import { blogPosts, heroSlides, hotels, staticPages } from "../db/schema";

export interface ImageReference {
  /** Human description, e.g. "Venue banner". */
  what: string;
  /** Where to go and change it. */
  where: string;
  adminPath: string;
  /** Public page that renders the image, when there is one. */
  publicPath?: string;
}

/**
 * Where a single image is used.
 *
 * Built on top of buildImageUsage rather than querying per column: the
 * highlights field is JSON, and matching a 64-character key inside it with
 * LIKE is rejected by SQLite as too complex a pattern. Reading the three
 * content tables and matching in memory has no such limit, and keeps one
 * implementation of what counts as a reference.
 */
export async function findImageReferences(db: Db, key: string): Promise<ImageReference[]> {
  if (!key) return [];
  return (await buildImageUsage(db)).get(key) ?? [];
}

/**
 * Media keys written into stored markup by the rich text editor.
 *
 * Keys are a SHA-256 hex digest plus an extension, so they can be recognised
 * in a body of HTML without parsing it. Missing these would let the media
 * screen offer to delete a picture that is live inside an article.
 */
const INLINE_KEY = /\/media\/([A-Za-z0-9/_.-]+?\.(?:jpg|jpeg|png|webp|avif|gif|svg))/gi;

function mediaKey(value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  try {
    const url = raw.startsWith("http://") || raw.startsWith("https://") ? new URL(raw) : null;
    if (url?.pathname.startsWith("/media/")) return decodeURIComponent(url.pathname.slice("/media/".length));
  } catch {
    /* Invalid URLs are handled as plain stored values below. */
  }

  if (raw.startsWith("/media/")) return raw.slice("/media/".length);
  if (raw.startsWith("/")) return "";
  return raw;
}

function inlineKeys(...html: string[]): string[] {
  const keys = new Set<string>();
  for (const source of html) {
    if (!source) continue;
    for (const match of source.matchAll(INLINE_KEY)) keys.add(mediaKey(`/media/${match[1]}`));
  }
  return [...keys];
}

/**
 * Builds the usage map for every image in one pass.
 *
 * The media screen needs references for many files at once; querying per file
 * would be three round trips each. Reading the three content tables once and
 * matching in memory is a fixed cost no matter how many images there are.
 */
export async function buildImageUsage(db: Db): Promise<Map<string, ImageReference[]>> {
  const usage = new Map<string, ImageReference[]>();
  const add = (key: string, reference: ImageReference) => {
    const normalized = mediaKey(key);
    if (!normalized) return;
    const list = usage.get(normalized);
    if (list) list.push(reference);
    else usage.set(normalized, [reference]);
  };

  for (const slide of await db
    .select({ id: heroSlides.id, title: heroSlides.title, image: heroSlides.imageKey })
    .from(heroSlides)) {
    add(slide.image, {
      what: "Hero slide",
      where: slide.title || `Slide ${slide.id}`,
      adminPath: "/admin/hero",
      publicPath: "/",
    });
  }

  for (const post of await db
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      heading: blogPosts.heading,
      banner: blogPosts.bannerImage,
      card: blogPosts.cardImage,
      og: blogPosts.ogImage,
      body: blogPosts.bodyHtml,
      faqs: blogPosts.faqs,
    })
    .from(blogPosts)) {
    const where = post.heading || `Post ${post.id}`;
    const adminPath = `/admin/blogs/${post.id}`;
    const publicPath = `/blogs/${post.slug}`;
    add(post.banner, { what: "Blog banner image", where, adminPath, publicPath });
    add(post.card, { what: "Blog card image", where, adminPath, publicPath: "/blogs" });
    add(post.og, { what: "Blog social image", where, adminPath, publicPath });
    for (const key of inlineKeys(post.body, post.faqs)) {
      add(key, { what: "Image inside the article", where, adminPath, publicPath });
    }
  }

  for (const venue of await db
    .select({
      id: hotels.id,
      city: hotels.city,
      slug: hotels.slug,
      name: hotels.name,
      banner: hotels.bannerImage,
      thumbnail: hotels.thumbnailImage,
      og: hotels.ogImage,
      highlights: hotels.highlights,
      description: hotels.description,
      faqs: hotels.faqs,
    })
    .from(hotels)) {
    const where = venue.name || `Venue ${venue.id}`;
    const adminPath = `/admin/hotels/${venue.id}`;
    const publicPath = `/destination-wedding/${venue.city}/${venue.slug}`;
    add(venue.banner, { what: "Venue banner image", where, adminPath, publicPath });
    add(venue.thumbnail, { what: "Venue thumbnail", where, adminPath, publicPath });
    add(venue.og, { what: "Venue social image", where, adminPath, publicPath });
    for (const image of highlightImages(venue.highlights)) {
      add(image, { what: "Venue highlight image", where, adminPath, publicPath });
    }
    for (const key of inlineKeys(venue.description, venue.faqs)) {
      add(key, { what: "Image inside the venue description", where, adminPath, publicPath });
    }
  }

  for (const page of await db
    .select({ path: staticPages.path, title: staticPages.title, html: staticPages.html })
    .from(staticPages)) {
    const where = page.title || page.path;
    const adminPath = `/admin/pages/${encodeURIComponent(page.path)}`;
    for (const key of inlineKeys(page.html)) {
      add(key, { what: "Static page image", where, adminPath, publicPath: page.path });
    }
  }

  return usage;
}

function highlightImages(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => String(item.image ?? ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** True when nothing on the site points at this image any more. */
export async function isImageUnused(db: Db, key: string): Promise<boolean> {
  return (await findImageReferences(db, key)).length === 0;
}
