/**
 * The pages that had no content model of their own.
 *
 * Everything else on the site was either rebuilt from a shell plus content rows
 * (venues, blog articles, city indexes) or left as a file. This is the third
 * case: pages with no repeating structure to model -- the calculators, the city
 * landing pages, the policy and story pages -- whose markup is stored whole so
 * the panel owns it.
 *
 * Reads are cached per instance for the same short window as everything else,
 * because these are large rows and several are on hot paths.
 */
import { asc, eq } from "drizzle-orm";
import { getDb, type DatabaseEnv } from "../db/client";
import { staticPages, type StaticPage } from "../db/schema";
import { onContentChanged } from "./content-version";

const CACHE_TTL_MS = 30_000;

/** Paths only; the markup is fetched per page so one big row is not held for all. */
let indexCache: { at: number; paths: Set<string> } | null = null;
const pageCache = new Map<string, { at: number; page: StaticPage | null }>();

export function invalidateStaticPageCache(): void {
  indexCache = null;
  pageCache.clear();
}

/** Trailing slashes and index.html both reach the same row. */
export function normalizeStaticPath(pathname: string): string {
  let path = pathname.split("?")[0].split("#")[0];
  if (path.endsWith("/index.html")) path = path.slice(0, -"/index.html".length);
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path || "/";
}

/**
 * Which paths the table holds, without their markup.
 *
 * The catch-all needs this synchronously to decide whether a request is one the
 * database owns, so the set is kept warm rather than looked up per request.
 */
export async function loadStaticPagePaths(env: DatabaseEnv = {}): Promise<Set<string>> {
  const now = Date.now();
  if (indexCache && now - indexCache.at < CACHE_TTL_MS) return indexCache.paths;

  try {
    const db = await getDb(env);
    if (!db) return indexCache?.paths ?? new Set();

    const rows = await db
      .select({ path: staticPages.path })
      .from(staticPages)
      .where(eq(staticPages.published, 1));

    const paths = new Set(rows.map((row) => row.path));
    indexCache = { at: now, paths };
    return paths;
  } catch (error) {
    console.error("[static-pages] index load failed", error instanceof Error ? error.message : error);
    return indexCache?.paths ?? new Set();
  }
}

/** One page, or null when the path is not stored or is unpublished. */
export async function loadStaticPage(env: DatabaseEnv, pathname: string): Promise<StaticPage | null> {
  const path = normalizeStaticPath(pathname);
  const now = Date.now();
  const cached = pageCache.get(path);
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.page;

  try {
    const db = await getDb(env);
    if (!db) return cached?.page ?? null;

    const rows = await db.select().from(staticPages).where(eq(staticPages.path, path)).limit(1);
    const page = rows[0] && rows[0].published === 1 && rows[0].html ? rows[0] : null;
    pageCache.set(path, { at: now, page });
    return page;
  } catch (error) {
    console.error("[static-pages] load failed", error instanceof Error ? error.message : error);
    return cached?.page ?? null;
  }
}

/**
 * One page whether or not it is published, for an admin previewing a hidden
 * one. Uncached, so a hidden page can never leak into the cache the public
 * lookup reads from.
 */
export async function findStaticPage(env: DatabaseEnv, pathname: string): Promise<StaticPage | null> {
  try {
    const db = await getDb(env);
    if (!db) return null;
    const rows = await db
      .select()
      .from(staticPages)
      .where(eq(staticPages.path, normalizeStaticPath(pathname)))
      .limit(1);
    return rows[0] && rows[0].html ? rows[0] : null;
  } catch (error) {
    console.error("[static-pages] preview lookup failed", error instanceof Error ? error.message : error);
    return null;
  }
}

/** The admin listing: everything, published or not, without the markup. */
export async function listStaticPages(env: DatabaseEnv = {}) {
  const db = await getDb(env);
  if (!db) return [];
  return db
    .select({
      path: staticPages.path,
      title: staticPages.title,
      metaDescription: staticPages.metaDescription,
      published: staticPages.published,
      updatedAt: staticPages.updatedAt,
      updatedBy: staticPages.updatedBy,
    })
    .from(staticPages)
    .orderBy(asc(staticPages.path));
}

// Dropped when any instance publishes a content change, not just this one.
// See worker/site/content-version.ts.
onContentChanged(() => {
  invalidateStaticPageCache();
});
