#!/usr/bin/env node
/**
 * Scans the codebase and produces a machine-readable inventory used by
 * documentation validation. Run via: npm run docs:inventory
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, relative, posix } from "node:path";
import { execSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");
const OUT_DIR = join(ROOT, "docs", "generated");
const OUT_FILE = join(OUT_DIR, "code-inventory.json");

function walk(dir, filter = () => true, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(ROOT, full).replace(/\\/g, "/");
    if (name === "node_modules" || name === "dist" || name === ".git" || name === ".wrangler") continue;
    const st = statSync(full);
    if (st.isDirectory()) walk(full, filter, acc);
    else if (filter(full, rel)) acc.push(rel);
  }
  return acc;
}

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function extractRoutes() {
  const pages = walk(join(ROOT, "app"), (_, rel) => rel.endsWith("page.tsx") || rel.endsWith("route.ts"));
  const routes = [];
  for (const file of pages) {
    const route = file
      .replace(/^app/, "")
      .replace(/\/page\.tsx$/, "")
      .replace(/\/route\.ts$/, "")
      .replace(/\[([^\]]+)\]/g, ":$1") || "/";
    const kind = file.endsWith("route.ts") ? "api" : "page";
    routes.push({ file, route, kind });
  }
  return routes.sort((a, b) => a.route.localeCompare(b.route));
}

function extractServerActions() {
  const files = walk(join(ROOT, "app"), (_, rel) => rel.endsWith("actions.ts"));
  const actions = [];
  const re = /export\s+async\s+function\s+(\w+)/g;
  for (const file of files) {
    const src = read(file);
    let m;
    while ((m = re.exec(src))) actions.push({ file, name: m[1] });
  }
  return actions.sort((a, b) => a.name.localeCompare(b.name));
}

function extractDbTables() {
  const src = read("worker/db/schema.ts");
  const tables = [];
  // Matches both dialects: the schema moved from sqliteTable to pgTable with
  // Postgres, and this quietly reported zero tables for the whole of that time.
  const re = /export\s+const\s+(\w+)\s*=\s*(?:pgTable|sqliteTable)\s*\(\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) tables.push({ exportName: m[1], tableName: m[2] });
  return tables.sort((a, b) => a.tableName.localeCompare(b.tableName));
}

/**
 * Paths the server matches on, gathered from wherever routing is decided.
 *
 * This used to read the Cloudflare worker entry alone. Routing now lives in the
 * catch-all route and the helpers beside it, so every source is scanned and a
 * missing one is skipped rather than throwing -- the list should survive a file
 * being retired.
 */
function extractWorkerEndpoints() {
  const sources = [
    "app/[[...path]]/route.ts",
    "worker/site/app-routes.ts",
    "worker/site/public-routes.ts",
    "worker/site/render-page.ts",
    "worker/public-endpoints.ts",
    "worker/index.ts",
  ];

  const paths = new Set();
  const patterns = [
    /pathname\s*===\s*["']([^"']+)["']/g,
    /pathname\.startsWith\(["']([^"']+)["']\)/g,
    /["'](\/[^"']+)["']\s*:\s*handle/g,
    // Prefix and redirect tables are plain string literals in an array or a map.
    /^\s*["'](\/[^"']*)["']\s*[,:]/gm,
  ];

  for (const source of sources) {
    if (!existsSync(join(ROOT, source))) continue;
    const src = read(source);
    for (const re of patterns) {
      let m;
      while ((m = re.exec(src))) paths.add(m[1]);
    }
  }

  return [...paths].sort();
}

function extractAdminComponents() {
  const dir = join(ROOT, "app", "admin", "_components");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
    .map((f) => `app/admin/_components/${f}`)
    .sort();
}

function extractStaticSiteRoutes() {
  const pages = walk(join(ROOT, "site-public"), (_, rel) => rel.endsWith("index.html"));
  const routes = [];
  for (const file of pages) {
    const route =
      "/" +
      file
        .replace(/^site-public\//, "")
        .replace(/\/index\.html$/, "")
        .replace(/\/$/, "");
    const normalized = route === "/" ? "/" : route + "/";
    routes.push({ file, route: normalized });
  }
  return routes.sort((a, b) => a.route.localeCompare(b.route));
}

function extractPublicJsFiles() {
  const dir = join(ROOT, "site-public", "js");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => `site-public/js/${f}`)
    .sort();
}

function extractPageTypePatterns() {
  return [
    { pattern: "/", type: "homepage", count: 1 },
    { pattern: "/destination-wedding/{city}/{slug}/", type: "venue-detail", glob: "site-public/destination-wedding/*/*/index.html" },
    { pattern: "/destination-wedding/{city}/", type: "city-index", glob: "site-public/destination-wedding/*/index.html" },
    { pattern: "/destination-wedding-in-{city}/", type: "city-landing", glob: "site-public/destination-wedding-in-*/index.html" },
    { pattern: "/blogs/{slug}/", type: "blog-article", glob: "site-public/blogs/*/index.html" },
    { pattern: "/blogs/category/{slug}/", type: "blog-category", glob: "site-public/blogs/category/*/index.html" },
    { pattern: "/blogs/tag/{slug}/", type: "blog-tag", glob: "site-public/blogs/tag/*/index.html" },
    { pattern: "/real-weddings/{slug}/", type: "real-wedding", glob: "site-public/real-weddings/*/index.html" },
    { pattern: "/wedding-packages/{tier}/", type: "wedding-package", glob: "site-public/wedding-packages/*/index.html" },
  ];
}

function extractPublicForms() {
  return [
    { id: "contactForm", page: "/contact/", endpoint: "/api/lead", handler: "worker/lead-email.ts" },
    { id: "consultationForm", page: "/wedding-consultation/", endpoint: "/api/lead", handler: "worker/lead-email.ts" },
    { id: "enquiryForm", page: "/destination-wedding/{city}/{slug}/", endpoint: "/api/lead", handler: "worker/lead-email.ts" },
    { id: "ctaEnquiryForm", page: "/destination-wedding-in-{city}/", endpoint: "/api/lead", handler: "worker/lead-email.ts" },
    { id: "contactForm", page: "/blogs/{slug}/", endpoint: "/api/lead", handler: "worker/lead-email.ts" },
    { id: "availabilityWizard", page: "/check-hotel-availability/", endpoint: "/api/lead", handler: "worker/lead-email.ts" },
    { id: "filterForm", page: "/hotel-listing/", endpoint: "GET /hotel-listing", handler: "client-side hotel-listing.js" },
  ];
}

function extractWorkerSiteFiles() {
  return walk(join(ROOT, "worker", "site"), (_, rel) => rel.endsWith(".ts")).sort();
}

function extractAdminFiles() {
  return walk(join(ROOT, "app", "admin"), (_, rel) => rel.endsWith(".ts") || rel.endsWith(".tsx")).sort();
}

function gitHead() {
  try {
    return execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function gitShort() {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const inventory = {
  generatedAt: new Date().toISOString(),
  gitCommit: gitHead(),
  gitCommitShort: gitShort(),
  projectVersion: JSON.parse(read("package.json")).version,
  counts: {},
  routes: extractRoutes(),
  serverActions: extractServerActions(),
  dbTables: extractDbTables(),
  workerEndpoints: extractWorkerEndpoints(),
  adminComponents: extractAdminComponents(),
  adminFiles: extractAdminFiles(),
  staticSiteRoutes: extractStaticSiteRoutes(),
  publicJsFiles: extractPublicJsFiles(),
  pageTypePatterns: extractPageTypePatterns(),
  publicForms: extractPublicForms(),
  workerSiteFiles: extractWorkerSiteFiles(),
};

inventory.counts = {
  routes: inventory.routes.length,
  serverActions: inventory.serverActions.length,
  dbTables: inventory.dbTables.length,
  workerEndpoints: inventory.workerEndpoints.length,
  adminComponents: inventory.adminComponents.length,
  adminFiles: inventory.adminFiles.length,
  staticSiteRoutes: inventory.staticSiteRoutes.length,
  publicJsFiles: inventory.publicJsFiles.length,
  pageTypePatterns: inventory.pageTypePatterns.length,
  publicForms: inventory.publicForms.length,
  workerSiteFiles: inventory.workerSiteFiles.length,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`Wrote ${relative(ROOT, OUT_FILE)}`);
console.log(JSON.stringify(inventory.counts, null, 2));
