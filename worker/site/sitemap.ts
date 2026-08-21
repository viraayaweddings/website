/**
 * Dynamic sitemap.xml: static route inventory plus published CMS URLs.
 */
import { eq } from "drizzle-orm";
import type { DatabaseEnv } from "../db/client";
import { getDb } from "../db/client";
import { blogPosts, hotels } from "../db/schema";
import { STATIC_PUBLIC_ROUTES } from "./static-routes.generated";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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

  return [
    ...posts.map((post) => `/blogs/${post.slug}/`),
    ...venues.map((venue) => `/destination-wedding/${venue.city}/${venue.slug}/`),
  ];
}

export async function buildSitemapXml(origin: string, env: DatabaseEnv): Promise<string> {
  const urls = [...new Set([...STATIC_PUBLIC_ROUTES, ...(await managedRoutes(env))])].sort();

  const body = urls
    .map((path) => {
      const loc = `${origin}${path === "/" ? "/" : path.replace(/\/$/, "") || "/"}`;
      return `  <url><loc>${escapeXml(loc)}</loc></url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
