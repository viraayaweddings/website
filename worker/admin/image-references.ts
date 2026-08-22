/**
 * Works out where an uploaded image is used.
 *
 * References are computed from the content tables on demand rather than kept
 * in a counter, because a counter drifts the moment anything writes without
 * updating it. A query is cheap and always tells the truth.
 */
import { readdir, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import imageMigrationMap from "../../scripts/image-migration-map.json";
import { blogPosts, heroSlides, hotels, pageTemplates, staticPages } from "../db/schema";

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
const STATIC_IMAGE = /(?<=["'\s(=,])\/(?!media\/)[A-Za-z0-9_][^"'\s),]*?\.(?:jpg|jpeg|png|webp|avif|gif|svg)/gi;
const RELATIVE_IMAGE = /(?<=["'\s(=,])\.\/([^"'\s),]*?\.(?:jpg|jpeg|png|webp|avif|gif|svg))/gi;
const YOUTUBE_LOCAL_HTML = /\/vendor\/youtube-local\/([A-Za-z0-9_-]+)\.html/gi;
const STATIC_MEDIA_KEYS = imageMigrationMap as Record<string, string>;
let staticHtmlUsage: Promise<Array<{ key: string; reference: ImageReference }>> | null = null;

function mediaKey(value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  try {
    const url = raw.startsWith("http://") || raw.startsWith("https://") ? new URL(raw) : null;
    if (url?.pathname.startsWith("/media/")) return decodeURIComponent(url.pathname.slice("/media/".length));
    if (url?.pathname) return mediaKey(url.pathname);
  } catch {
    /* Invalid URLs are handled as plain stored values below. */
  }

  const migrated = STATIC_MEDIA_KEYS[raw];
  if (migrated) return mediaKey(migrated);

  if (raw.startsWith("/media/")) return raw.slice("/media/".length);
  if (raw.startsWith("/")) return "";
  return raw;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceStoredImageValue(value: string, oldKey: string, newKey: string): string {
  const raw = String(value || "");
  if (!raw) return raw;
  if (mediaKey(raw) === oldKey) {
    if (raw.startsWith("/media/")) return `/media/${newKey}`;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw.replace(new RegExp(escapeRegExp(oldKey), "g"), newKey);
    return newKey;
  }
  return replaceImageReferencesInText(raw, oldKey, newKey);
}

function replaceImageReferencesInText(value: string, oldKey: string, newKey: string): string {
  const raw = String(value || "");
  if (!raw) return raw;

  let next = raw.replace(new RegExp(escapeRegExp(`/media/${oldKey}`), "g"), `/media/${newKey}`);
  next = next.replace(new RegExp(escapeRegExp(oldKey), "g"), newKey);

  for (const [legacyPath, migratedPath] of Object.entries(STATIC_MEDIA_KEYS)) {
    if (mediaKey(migratedPath) === oldKey) {
      next = next.replace(new RegExp(escapeRegExp(legacyPath), "g"), `/media/${newKey}`);
    }
  }

  return next;
}


function keysFromHtml(source: string, basePath = ""): string[] {
  const keys = new Set<string>();
  if (!source) return [];

  for (const match of source.matchAll(INLINE_KEY)) keys.add(mediaKey(`/media/${match[1]}`));
  for (const match of source.matchAll(STATIC_IMAGE)) {
    const key = mediaKey(match[0]);
    if (key) keys.add(key);
  }
  if (basePath) {
    const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
    for (const match of source.matchAll(RELATIVE_IMAGE)) {
      const key = mediaKey(`${base}/${match[1]}`);
      if (key) keys.add(key);
    }
  }
  for (const match of source.matchAll(YOUTUBE_LOCAL_HTML)) {
    const key = mediaKey(`/vendor/youtube-local/${match[1]}.jpg`);
    if (key) keys.add(key);
  }

  return [...keys];
}

function inlineKeys(...html: string[]): string[] {
  return [...new Set(html.flatMap((source) => keysFromHtml(source)))];
}

function publicPathForHtml(root: string, filePath: string): { publicPath: string; basePath: string } {
  const rel = relative(root, filePath).split(sep).join("/");
  const rawPath = `/${rel}`;
  const publicPath = rawPath.endsWith("/index.html") ? rawPath.slice(0, -"index.html".length) : rawPath;
  const basePath = publicPath.endsWith("/")
    ? publicPath.slice(0, -1)
    : publicPath.includes("/")
      ? publicPath.slice(0, publicPath.lastIndexOf("/"))
      : "";
  return { publicPath: publicPath || "/", basePath: basePath || "/" };
}

async function walkHtml(root: string, dir = root): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkHtml(root, path)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) files.push(path);
  }
  return files;
}

async function buildStaticHtmlUsage(): Promise<Array<{ key: string; reference: ImageReference }>> {
  const roots = [
    resolve(process.cwd(), ".vercel", "output", "static"),
    resolve(process.cwd(), ".output", "public"),
    resolve(process.cwd(), "site-public"),
  ];
  const usage: Array<{ key: string; reference: ImageReference }> = [];
  const seen = new Set<string>();

  for (const root of roots) {
    for (const file of await walkHtml(root)) {
      const { publicPath, basePath } = publicPathForHtml(root, file);
      const html = await readFile(file, "utf8").catch(() => "");
      if (!html) continue;

      for (const key of keysFromHtml(html, basePath)) {
        const marker = `${key}\n${publicPath}`;
        if (seen.has(marker)) continue;
        seen.add(marker);
        usage.push({
          key,
          reference: {
            what: publicPath.startsWith("/vendor/") ? "Legacy embedded asset" : "Legacy static page image",
            where: publicPath,
            adminPath: "/admin/pages",
            publicPath,
          },
        });
      }
    }
  }

  return usage;
}

function loadStaticHtmlUsage(): Promise<Array<{ key: string; reference: ImageReference }>> {
  staticHtmlUsage ??= buildStaticHtmlUsage();
  return staticHtmlUsage;
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
    if (list) {
      if (
        !list.some(
          (item) =>
            item.what === reference.what &&
            item.where === reference.where &&
            item.adminPath === reference.adminPath &&
            item.publicPath === reference.publicPath,
        )
      ) {
        list.push(reference);
      }
    }
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

  for (const template of await db
    .select({ key: pageTemplates.key, kind: pageTemplates.kind, html: pageTemplates.html })
    .from(pageTemplates)) {
    const where = `${template.kind || "Page"} template`;
    for (const key of inlineKeys(template.html)) {
      add(key, { what: "Page template image", where, adminPath: "/admin/pages" });
    }
  }

  for (const { key, reference } of await loadStaticHtmlUsage()) {
    add(key, reference);
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

/**
 * Repoints every database-managed occurrence of one media key to another.
 *
 * This is used by the media-library replace action. Static fallback files are
 * intentionally not edited here; database-owned pages and templates are.
 */
export async function replaceImageReferences(db: Db, oldKey: string, newKey: string): Promise<number> {
  if (!oldKey || !newKey || oldKey === newKey) return 0;

  let changed = 0;

  for (const slide of await db.select().from(heroSlides)) {
    const nextImage = replaceStoredImageValue(slide.imageKey, oldKey, newKey);
    if (nextImage !== slide.imageKey) {
      await db.update(heroSlides).set({ imageKey: nextImage }).where(eq(heroSlides.id, slide.id));
      changed += 1;
    }
  }

  for (const post of await db.select().from(blogPosts)) {
    const next = {
      bannerImage: replaceStoredImageValue(post.bannerImage, oldKey, newKey),
      cardImage: replaceStoredImageValue(post.cardImage, oldKey, newKey),
      ogImage: replaceStoredImageValue(post.ogImage, oldKey, newKey),
      bodyHtml: replaceImageReferencesInText(post.bodyHtml, oldKey, newKey),
      faqs: replaceImageReferencesInText(post.faqs, oldKey, newKey),
    };
    const set = Object.fromEntries(
      Object.entries(next).filter(([key, value]) => value !== post[key as keyof typeof post]),
    );
    if (Object.keys(set).length > 0) {
      await db.update(blogPosts).set(set).where(eq(blogPosts.id, post.id));
      changed += Object.keys(set).length;
    }
  }

  for (const venue of await db.select().from(hotels)) {
    const next = {
      bannerImage: replaceStoredImageValue(venue.bannerImage, oldKey, newKey),
      thumbnailImage: replaceStoredImageValue(venue.thumbnailImage, oldKey, newKey),
      ogImage: replaceStoredImageValue(venue.ogImage, oldKey, newKey),
      highlights: replaceImageReferencesInText(venue.highlights, oldKey, newKey),
      description: replaceImageReferencesInText(venue.description, oldKey, newKey),
      faqs: replaceImageReferencesInText(venue.faqs, oldKey, newKey),
    };
    const set = Object.fromEntries(
      Object.entries(next).filter(([key, value]) => value !== venue[key as keyof typeof venue]),
    );
    if (Object.keys(set).length > 0) {
      await db.update(hotels).set(set).where(eq(hotels.id, venue.id));
      changed += Object.keys(set).length;
    }
  }

  for (const page of await db.select().from(staticPages)) {
    const html = replaceImageReferencesInText(page.html, oldKey, newKey);
    if (html !== page.html) {
      await db.update(staticPages).set({ html }).where(eq(staticPages.path, page.path));
      changed += 1;
    }
  }

  for (const template of await db.select().from(pageTemplates)) {
    const html = replaceImageReferencesInText(template.html, oldKey, newKey);
    if (html !== template.html) {
      await db.update(pageTemplates).set({ html }).where(eq(pageTemplates.key, template.key));
      changed += 1;
    }
  }

  staticHtmlUsage = null;
  return changed;
}

/** True when nothing on the site points at this image any more. */
export async function isImageUnused(db: Db, key: string): Promise<boolean> {
  return (await findImageReferences(db, key)).length === 0;
}
