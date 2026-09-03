#!/usr/bin/env node
/**
 * Builds site-public/sitemap.xml and worker/site/static-routes.generated.ts
 * from the static HTML route inventory.
 */
import { readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://viraayaweddings.com";
const EXCLUDED_PREFIXES = ["/admin", "/appointment/payment-success", "/appointment/payment-failed"];
const EXCLUDED_EXACT = new Set([
  "/blogs/category/weeding-planning/",
  "/appointment-booking/",
  // The packages area is unpublished: the pages still answer at their URLs but
  // nothing on the site links to them and they carry noindex, so listing them
  // in the sitemap would be inviting the crawl the robots tag turns away.
  // Reinstating packages means deleting these four lines.
  "/wedding-packages/",
  "/wedding-packages/shresht/",
  "/wedding-packages/siddhi/",
  "/wedding-packages/shobhana/",
  "/package/",
]);

function normalizeRoute(relativePath) {
  const withoutIndex = relativePath.replace(/index\.html$/i, "");
  const route = `/${withoutIndex}`.replace(/\/+/g, "/");
  return route.endsWith("/") || !withoutIndex.includes("/") ? route : `${route}/`;
}

function shouldInclude(route) {
  if (EXCLUDED_EXACT.has(route)) return false;
  if (EXCLUDED_PREFIXES.some((prefix) => route.startsWith(prefix))) return false;
  return true;
}

async function walk(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const routes = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      routes.push(...(await walk(root, fullPath)));
      continue;
    }
    if (entry.name.toLowerCase() !== "index.html") continue;
    routes.push(normalizeRoute(fullPath.slice(root.length).replace(/\\/g, "/")));
  }

  return routes;
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const root = resolve(process.cwd(), "site-public");
const routes = [...new Set((await walk(root)).filter(shouldInclude))].sort();

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
  .map((path) => {
    const loc = `${SITE_ORIGIN}${path === "/" ? "/" : path.replace(/\/$/, "") || "/"}`;
    return `  <url><loc>${escapeXml(loc)}</loc></url>`;
  })
  .join("\n")}\n</urlset>\n`;

const generated = `/**
 * Public routes extracted from site-public. Regenerate with \`npm run sitemap:generate\`.
 */
export const STATIC_PUBLIC_ROUTES: readonly string[] = ${JSON.stringify(routes, null, 2)};
`;

await Promise.all([
  writeFile(resolve(root, "sitemap.xml"), xml, "utf8"),
  writeFile(resolve(process.cwd(), "worker/site/static-routes.generated.ts"), generated, "utf8"),
]);

console.log(`Wrote sitemap.xml and static-routes.generated.ts (${routes.length} routes)`);
