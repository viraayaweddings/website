/**
 * Works out where an uploaded image is used.
 *
 * References are computed from the content tables on demand rather than kept
 * in a counter, because a counter drifts the moment anything writes without
 * updating it. A query is cheap and always tells the truth.
 */
import type { Db } from "../db/client";
import { blogPosts, heroSlides, hotels } from "../db/schema";

export interface ImageReference {
  /** Human description, e.g. "Venue banner". */
  what: string;
  /** Where to go and change it. */
  where: string;
  adminPath: string;
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
const INLINE_KEY = /\/media\/([0-9a-f]{64}\.[a-z0-9]+)/gi;

function inlineKeys(...html: string[]): string[] {
  const keys = new Set<string>();
  for (const source of html) {
    if (!source) continue;
    for (const match of source.matchAll(INLINE_KEY)) keys.add(match[1].toLowerCase());
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
    if (!key || key.startsWith("/")) return;
    const list = usage.get(key);
    if (list) list.push(reference);
    else usage.set(key, [reference]);
  };

  for (const slide of await db
    .select({ id: heroSlides.id, title: heroSlides.title, image: heroSlides.imageKey })
    .from(heroSlides)) {
    add(slide.image, {
      what: "Hero slide",
      where: slide.title || `Slide ${slide.id}`,
      adminPath: "/admin/hero",
    });
  }

  for (const post of await db
    .select({
      id: blogPosts.id,
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
    add(post.banner, { what: "Blog banner image", where, adminPath });
    add(post.card, { what: "Blog card image", where, adminPath });
    add(post.og, { what: "Blog social image", where, adminPath });
    for (const key of inlineKeys(post.body, post.faqs)) {
      add(key, { what: "Image inside the article", where, adminPath });
    }
  }

  for (const venue of await db
    .select({
      id: hotels.id,
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
    add(venue.banner, { what: "Venue banner image", where, adminPath });
    add(venue.thumbnail, { what: "Venue thumbnail", where, adminPath });
    add(venue.og, { what: "Venue social image", where, adminPath });
    for (const image of highlightImages(venue.highlights)) {
      add(image, { what: "Venue highlight image", where, adminPath });
    }
    for (const key of inlineKeys(venue.description, venue.faqs)) {
      add(key, { what: "Image inside the venue description", where, adminPath });
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
