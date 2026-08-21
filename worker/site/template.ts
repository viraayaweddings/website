/**
 * Page shells, loaded from the database.
 *
 * Every managed page is built by streaming its stored shell through the same
 * HTMLRewriter handlers that content injection already uses, so the markup and
 * the content both come from D1 rather than from the files in site-public.
 */
import { eq } from "drizzle-orm";
import { getDb, type DatabaseEnv } from "../db/client";
import { cityPages, pageTemplates, type CityPage } from "../db/schema";

const CACHE_TTL_MS = 300_000;

/** Shells are large and change rarely, so they are held per isolate. */
let templateCache: { at: number; byKey: Map<string, string> } | null = null;
let cityCache: { at: number; byCity: Map<string, CityPage> } | null = null;

export function invalidateTemplateCache(): void {
  templateCache = null;
  cityCache = null;
}

async function loadAll(env: DatabaseEnv): Promise<Map<string, string>> {
  const now = Date.now();
  if (templateCache && now - templateCache.at < CACHE_TTL_MS) return templateCache.byKey;

  try {
    const db = await getDb(env);
    if (!db) return templateCache?.byKey ?? new Map();

    const rows = await db.select({ key: pageTemplates.key, html: pageTemplates.html }).from(pageTemplates);
    const byKey = new Map(rows.map((row) => [row.key, row.html]));
    templateCache = { at: now, byKey };
    return byKey;
  } catch (error) {
    console.error("[template] load failed", error instanceof Error ? error.message : error);
    return templateCache?.byKey ?? new Map();
  }
}

/**
 * Returns the stored shell, or null when it is missing. Callers fall back to
 * the original file so a page is never lost to a database problem.
 */
export async function loadTemplate(env: DatabaseEnv, key: string): Promise<string | null> {
  const byKey = await loadAll(env);
  return byKey.get(key) ?? null;
}

export async function loadCityPage(env: DatabaseEnv, city: string): Promise<CityPage | null> {
  const now = Date.now();
  if (!cityCache || now - cityCache.at >= CACHE_TTL_MS) {
    try {
      const db = await getDb(env);
      if (!db) return cityCache?.byCity.get(city) ?? null;

      const rows = await db.select().from(cityPages);
      cityCache = { at: now, byCity: new Map(rows.map((row) => [row.city, row])) };
    } catch (error) {
      console.error("[template] city load failed", error instanceof Error ? error.message : error);
      return cityCache?.byCity.get(city) ?? null;
    }
  }

  return cityCache.byCity.get(city) ?? null;
}

/** A stored shell served as an HTML response, ready for the rewriter. */
export function templateResponse(html: string): Response {
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function findCityPage(env: DatabaseEnv, city: string): Promise<CityPage | null> {
  const db = await getDb(env);
  if (!db) return null;
  const rows = await db.select().from(cityPages).where(eq(cityPages.city, city)).limit(1);
  return rows[0] ?? null;
}
