/**
 * Works out where an uploaded image is used.
 *
 * References are computed from the content tables on demand rather than kept
 * in a counter, because a counter drifts the moment anything writes without
 * updating it. A query is cheap and always tells the truth.
 */
import { readdir, readFile } from "node:fs/promises";
import { extname, posix, relative, resolve, sep } from "node:path";
import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import imageMigrationMap from "../../scripts/image-migration-map.json";
import {
  blogListings,
  blogPosts,
  cityListings,
  heroSlides,
  hotels,
  media,
  type MediaFile,
  pageTemplates,
  settings,
  staticPages,
} from "../db/schema";
import { parseNearby } from "../site/venue-listing";

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
  const references = (await buildImageUsage(db)).get(key) ?? [];
  if (references.length) return references;

  const row = (await db
    .select({ key: media.key, filename: media.filename, uploadedBy: media.uploadedBy })
    .from(media)
    .where(eq(media.key, key))
    .limit(1))[0];

  return row ? migrationInventoryReferencesForMedia(row) : [];
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
const RELATIVE_IMAGE = /(?<=["'\s(=,])(\.{1,2}\/[^"'\s),]*?\.(?:jpg|jpeg|png|webp|avif|gif|svg))/gi;
const YOUTUBE_LOCAL_HTML = /\/vendor\/youtube-local\/([A-Za-z0-9_-]+)\.html/gi;
const ASSET_TAG = /<(?:link|script)\b[^>]*>/gi;
const ASSET_ATTR = /\b(?:href|src)=["']([^"']+)["']/gi;
const SCANNED_STATIC_EXTENSIONS = new Set([".html", ".json", ".js", ".css", ".xml", ".txt"]);
const PAGE_ASSET_EXTENSIONS = new Set([".css", ".js"]);
const STATIC_MEDIA_KEYS = imageMigrationMap as Record<string, string>;
const STATIC_SOURCE_PATHS_BY_KEY = new Map<string, string[]>();
const STATIC_SOURCE_PATHS_BY_FILENAME = new Map<string, string[]>();
let staticHtmlUsage: Promise<Array<{ key: string; reference: ImageReference }>> | null = null;

for (const [sourcePath, migratedPath] of Object.entries(STATIC_MEDIA_KEYS)) {
  const migratedKey = migratedPath.startsWith("/media/") ? migratedPath.slice("/media/".length) : migratedPath;
  const keySources = STATIC_SOURCE_PATHS_BY_KEY.get(migratedKey) ?? [];
  keySources.push(sourcePath);
  STATIC_SOURCE_PATHS_BY_KEY.set(migratedKey, keySources);

  const filename = posix.basename(sourcePath);
  const filenameSources = STATIC_SOURCE_PATHS_BY_FILENAME.get(filename) ?? [];
  filenameSources.push(sourcePath);
  STATIC_SOURCE_PATHS_BY_FILENAME.set(filename, filenameSources);
}

function mediaKey(value: string): string {
  const raw = value.trim();
  if (!raw) return "";

  try {
    const url = raw.startsWith("http://") || raw.startsWith("https://") ? new URL(raw) : null;
    const path = decodeURIComponent(url?.pathname ?? "");
    if (path.startsWith("/media/")) return path.slice("/media/".length);
    if (path) return mediaKey(path);
  } catch {
    /* Invalid URLs are handled as plain stored values below. */
  }

  const normalized = normalizePublicPath(raw);
  const migrated = STATIC_MEDIA_KEYS[raw] ?? STATIC_MEDIA_KEYS[normalized];
  if (migrated) return mediaKey(migrated);

  if (normalized.startsWith("/media/")) return normalized.slice("/media/".length);
  if (normalized.startsWith("/")) return "";
  return raw;
}

function normalizePublicPath(value: string, basePath = ""): string {
  const raw = String(value || "").trim().replace(/^["']|["']$/g, "").split(/[?#]/)[0];
  if (!raw || raw.startsWith("data:") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return "";
  try {
    const url = raw.startsWith("http://") || raw.startsWith("https://") ? new URL(raw) : null;
    if (url) return normalizePublicPath(decodeURIComponent(url.pathname));
  } catch {
    /* Treat malformed URLs as local-ish paths below. */
  }

  if (raw.startsWith("/")) return posix.normalize(raw);
  if (raw.startsWith("./") || raw.startsWith("../")) return posix.normalize(posix.join(basePath || "/", raw));
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
    const key = mediaKey(normalizePublicPath(match[0], basePath));
    if (key) keys.add(key);
  }
  if (basePath) {
    for (const match of source.matchAll(RELATIVE_IMAGE)) {
      const key = mediaKey(normalizePublicPath(match[1], basePath));
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

function publicPathForFile(root: string, filePath: string): { publicPath: string; basePath: string; rel: string } {
  const rel = relative(root, filePath).split(sep).join("/");
  const rawPath = `/${rel}`;
  const publicPath = posix.normalize(rawPath.endsWith("/index.html") ? rawPath.slice(0, -"index.html".length) : rawPath);
  const basePath = publicPath.endsWith("/")
    ? publicPath.slice(0, -1)
    : publicPath.includes("/")
      ? publicPath.slice(0, publicPath.lastIndexOf("/"))
      : "";
  return { publicPath: publicPath || "/", basePath: basePath || "/", rel };
}

async function walkStaticFiles(root: string, dir = root): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkStaticFiles(root, path)));
    else if (entry.isFile() && SCANNED_STATIC_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(path);
  }
  return files;
}

function linkedAssetsFromHtml(html: string, basePath: string): string[] {
  const assets = new Set<string>();
  for (const tag of html.matchAll(ASSET_TAG)) {
    ASSET_ATTR.lastIndex = 0;
    for (const attr of tag[0].matchAll(ASSET_ATTR)) {
      const path = normalizePublicPath(attr[1], basePath);
      if (path && PAGE_ASSET_EXTENSIONS.has(extname(path).toLowerCase())) assets.add(path);
    }
  }
  return [...assets];
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
    const files = await walkStaticFiles(root);
    const assetConsumers = new Map<string, Set<string>>();
    const readCache = new Map<string, string>();

    for (const file of files) {
      if (extname(file).toLowerCase() !== ".html") continue;
      const { publicPath, basePath } = publicPathForFile(root, file);
      const html = await readFile(file, "utf8").catch(() => "");
      readCache.set(file, html);
      for (const asset of linkedAssetsFromHtml(html, basePath)) {
        const pages = assetConsumers.get(asset) ?? new Set<string>();
        pages.add(publicPath);
        assetConsumers.set(asset, pages);
      }
    }

    for (const file of files) {
      const { publicPath, basePath, rel } = publicPathForFile(root, file);
      const source = readCache.get(file) ?? (await readFile(file, "utf8").catch(() => ""));
      if (!source) continue;

      const ext = extname(file).toLowerCase();
      const consumers = ext === ".html" ? [publicPath] : [...(assetConsumers.get(publicPath) ?? [])];
      const references =
        consumers.length > 0
          ? consumers.map((page) => ({
              what: ext === ".html" ? "Legacy static page image" : "Image referenced by a page asset",
              where: page,
              adminPath: "/admin/pages",
              publicPath: page,
            }))
          : [
              {
                what: publicPath.startsWith("/vendor/") ? "Legacy embedded asset" : "Static asset image reference",
                where: `site-public/${rel}`,
                adminPath: "/admin/pages",
                publicPath,
              },
            ];

      for (const key of keysFromHtml(source, basePath)) {
        for (const reference of references) {
          const marker = `${key}\n${reference.what}\n${reference.where}\n${reference.publicPath ?? ""}`;
          if (seen.has(marker)) continue;
          seen.add(marker);
          usage.push({ key, reference });
        }
      }
    }
  }

  return usage;
}

function loadStaticHtmlUsage(): Promise<Array<{ key: string; reference: ImageReference }>> {
  staticHtmlUsage ??= buildStaticHtmlUsage();
  return staticHtmlUsage;
}

export function migrationInventoryReferencesForMedia(
  file: Pick<MediaFile, "key" | "filename" | "uploadedBy">,
): ImageReference[] {
  const sourcePaths =
    STATIC_SOURCE_PATHS_BY_KEY.get(file.key) ??
    (file.uploadedBy === "migration" && file.filename ? STATIC_SOURCE_PATHS_BY_FILENAME.get(file.filename) : undefined) ??
    [];

  return [...new Set(sourcePaths)].map((sourcePath) => ({
    what: "Migrated site asset source",
    where: sourcePath,
    adminPath: "/admin/media",
    publicPath: sourcePath,
  }));
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

  const posts = await db
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
    .from(blogPosts);

  for (const post of posts) {
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

  const venues = await db
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
      nearbySlugs: hotels.nearbySlugs,
      videoId: hotels.videoId,
    })
    .from(hotels);

  for (const venue of venues) {
    const where = venue.name || `Venue ${venue.id}`;
    const adminPath = `/admin/hotels/${venue.id}`;
    const publicPath = `/destination-wedding/${venue.city}/${venue.slug}`;
    add(venue.banner, { what: "Venue banner image", where, adminPath, publicPath });
    add(venue.thumbnail, { what: "Venue thumbnail", where, adminPath, publicPath });
    add(venue.og, { what: "Venue social image", where, adminPath, publicPath });
    add(venue.banner, { what: "Venue gallery image", where, adminPath, publicPath });
    for (const image of highlightImages(venue.highlights)) {
      add(image, { what: "Venue highlight image", where, adminPath, publicPath });
      add(image, { what: "Venue gallery image", where, adminPath, publicPath });
    }
    for (const key of inlineKeys(venue.description, venue.faqs)) {
      add(key, { what: "Image inside the venue description", where, adminPath, publicPath });
    }
    if (venue.videoId) {
      add(`/vendor/youtube-local/${venue.videoId}.jpg`, {
        what: "Venue tour video thumbnail",
        where,
        adminPath,
        publicPath,
      });
    }
  }

  const venuesByPath = new Map(venues.map((venue) => [`${venue.city}/${venue.slug}`, venue]));
  for (const listing of await db
    .select({
      city: cityListings.city,
      venueCity: cityListings.venueCity,
      venueSlug: cityListings.venueSlug,
    })
    .from(cityListings)) {
    const venue = venuesByPath.get(`${listing.venueCity}/${listing.venueSlug}`);
    if (!venue) continue;
    add(venue.thumbnail, {
      what: "City page venue card",
      where: `/destination-wedding/${listing.city}/`,
      adminPath: `/admin/cities/${encodeURIComponent(listing.city)}`,
      publicPath: `/destination-wedding/${listing.city}/`,
    });
  }

  for (const venue of venues) {
    const where = venue.name || `Venue ${venue.id}`;
    const adminPath = `/admin/hotels/${venue.id}`;
    const publicPath = `/destination-wedding/${venue.city}/${venue.slug}`;
    for (const nearbyPath of parseNearby(venue.nearbySlugs)) {
      const nearby = venuesByPath.get(nearbyPath);
      if (!nearby) continue;
      add(nearby.thumbnail, { what: "Nearby venue card", where, adminPath, publicPath });
    }
  }

  const postsBySlug = new Map(posts.map((post) => [post.slug, post]));
  for (const listing of await db
    .select({
      taxonomy: blogListings.taxonomy,
      slug: blogListings.taxonomySlug,
      postSlug: blogListings.postSlug,
    })
    .from(blogListings)) {
    const post = postsBySlug.get(listing.postSlug);
    if (!post) continue;
    add(post.card, {
      what: "Blog taxonomy card image",
      where: `/blogs/${listing.taxonomy}/${listing.slug}`,
      adminPath: "/admin/blogs/sections",
      publicPath: `/blogs/${listing.taxonomy}/${listing.slug}`,
    });
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

  for (const setting of await db.select({ key: settings.key, value: settings.value }).from(settings)) {
    for (const key of inlineKeys(setting.value)) {
      add(key, { what: "Site setting image", where: setting.key, adminPath: "/admin/settings", publicPath: "/" });
    }
  }

  for (const { key, reference } of await loadStaticHtmlUsage()) {
    add(key, reference);
  }

  for (const [key, sourcePaths] of STATIC_SOURCE_PATHS_BY_KEY) {
    if (!key || usage.has(key)) continue;
    for (const sourcePath of sourcePaths) {
      add(key, {
        what: "Migrated site asset source",
        where: sourcePath,
        adminPath: "/admin/media",
        publicPath: sourcePath,
      });
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
