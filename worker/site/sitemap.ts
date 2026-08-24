/**
 * Dynamic sitemap.xml: static route inventory plus published CMS URLs.
 */
import { eq, sql } from "drizzle-orm";
import type { DatabaseEnv } from "../db/client";
import { getDb } from "../db/client";
import { blogPosts, hotels, staticPages } from "../db/schema";
import { STATIC_PUBLIC_ROUTES } from "./static-routes.generated";
import { loadStaticPagePaths } from "./static-pages";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * The date to stamp on every URL, as `YYYY-MM-DD`.
 *
 * The newest `updated_at` across the tables that actually feed public pages.
 * Falls back to today when the database cannot be reached, which is the honest
 * answer for a file that is rebuilt per request -- never omit the element, as a
 * sitemap without `lastmod` gives a crawler nothing to schedule against.
 */
async function contentLastModified(env: DatabaseEnv): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const db = await getDb(env);
    if (!db) return today;

    const [row] = await db
      .select({
        latest: sql<Date | null>`greatest(
          (select max(${blogPosts.updatedAt}) from ${blogPosts}),
          (select max(${hotels.updatedAt}) from ${hotels}),
          (select max(${staticPages.updatedAt}) from ${staticPages})
        )`,
      })
      .from(sql`(select 1) as one`);

    const latest = row?.latest ? new Date(row.latest) : null;
    if (!latest || Number.isNaN(latest.getTime())) return today;
    return latest.toISOString().slice(0, 10);
  } catch {
    return today;
  }
}

async function managedRoutes(env: DatabaseEnv): Promise<string[]> {
  const db = await getDb(env);
  if (!db) return [];

  const [posts, venues] = await Promise.all([
    db.select({ slug: blogPosts.slug }).from(blogPosts).where(eq(blogPosts.status, "published")),
    db
      .select({ city: hotels.city, slug: hotels.slug })
      .from(hotels)
      .where(eq(hotels.status, "published")),
  ]);

  // Stored pages are included by path rather than by the file inventory: a page
  // added through the panel has no file, so it would otherwise never appear.
  // Hidden ones are left out, the same as a draft article.
  const stored = await loadStaticPagePaths(env);

  return [
    ...posts.map((post) => `/blogs/${post.slug}/`),
    ...venues.map((venue) => `/destination-wedding/${venue.city}/${venue.slug}/`),
    ...stored,
  ];
}

/**
 * The single form of a path that appears in the file.
 *
 * De-duplication used to run over the raw paths and the trailing slash was
 * stripped afterwards, when building each `<loc>`. The two inventories do not
 * agree on that slash -- `managedRoutes` appends one, `STATIC_PUBLIC_ROUTES`
 * does not -- so `/about-us` and `/about-us/` survived as distinct Set entries
 * and then collapsed to the same URL, which is how 288 pages came to be listed
 * 321 times. Normalising first is what makes the Set mean anything.
 */
function canonicalPath(path: string): string {
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  const trimmed = withSlash.replace(/\/+$/, "");
  return trimmed || "/";
}

/**
 * Paths that exist for a visitor mid-flow and have nothing to offer a searcher.
 * They are also `noindex`, so listing them only invites a crawl that discards
 * the result.
 */
const EXCLUDED_FROM_SITEMAP = new Set([
  "/appointment/confirmation",
  "/appointment/request-failed",
  "/appointment/payment-success",
  "/appointment/payment-failed",
  "/appointment-booking",
]);

export async function buildSitemapXml(origin: string, env: DatabaseEnv): Promise<string> {
  const lastmod = await contentLastModified(env);

  const urls = [
    ...new Set(
      [...STATIC_PUBLIC_ROUTES, ...(await managedRoutes(env))].map(canonicalPath),
    ),
  ]
    .filter((path) => !EXCLUDED_FROM_SITEMAP.has(path))
    .sort();

  const body = urls
    .map((path) => {
      const loc = `${origin}${path}`;
      // `lastmod` is one date for the whole file rather than one per URL: the
      // pages are rebuilt from shared stored content on every request, so the
      // useful signal is when that content last changed, not when a file was
      // written.
      return `  <url><loc>${escapeXml(loc)}</loc><lastmod>${lastmod}</lastmod></url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
