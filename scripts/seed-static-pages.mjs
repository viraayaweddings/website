/**
 * Loads the pages that had no content model into `static_pages`.
 *
 * Venues, articles and city indexes are rebuilt from a shell plus content rows.
 * Everything else -- the calculators, the city landing pages, the policy and
 * story pages -- was served straight from its cloned file, so nothing an admin
 * changed ever reached it. This stores those pages whole.
 *
 * Runs from the Vercel build, which is where the checked-out files and the
 * database are both in reach. Only inserts what is missing, so a second run is
 * a no-op and an edited page is never overwritten.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-static-pages.mjs --dry-run
 *   node --env-file=.env.local scripts/seed-static-pages.mjs --apply
 *   node --env-file=.env.local scripts/seed-static-pages.mjs --apply  *     --refresh /check-hotel-availability
 *
 * `--refresh <path>` (repeatable) overwrites a stored page from its file. The
 * insert below deliberately never overwrites, so a fix made to a cloned file --
 * a script the page needs, a broken handler -- could not otherwise reach a page
 * already stored. Only pass paths whose stored copy nobody has edited in the
 * panel: this discards whatever is there.
 *
 * `--if-configured` exits 0 rather than failing when there is no database,
 * which is what lets it sit in the build command.
 *
 * Also writes worker/site/static-page-paths.generated.ts, which is what
 * vite.config.ts turns into Vercel rewrites -- without those the request never
 * reaches the function and the stored copy is never used.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import postgres from "postgres";

const root = process.cwd();
const publicDir = join(root, "site-public");

const apply = process.argv.includes("--apply");
const ifConfigured = process.argv.includes("--if-configured");

/** Paths to overwrite from disk, as `--refresh <path>` pairs. */
const refreshPaths = new Set(
  process.argv.reduce((paths, arg, index) => {
    if (arg === "--refresh" && process.argv[index + 1]) paths.push(process.argv[index + 1]);
    return paths;
  }, []),
);

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  if (ifConfigured) {
    console.log("[pages] no database here; nothing to do.");
    process.exit(0);
  }
  console.error("Set DATABASE_URL.");
  process.exit(1);
}

/**
 * Paths that already have a content model. A stored copy of these would shadow
 * the shell that renders them.
 */
function isAlreadyModelled(path) {
  if (path === "/") return true;
  if (path === "/contact" || path.startsWith("/contact/")) return true;
  if (path === "/blogs" || path.startsWith("/blogs/")) return true;
  if (path.startsWith("/destination-wedding/")) return true;
  return false;
}

/**
 * Form targets and API paths. A cloned page exists for some of them because the
 * crawl followed a POST target, but the app answers these itself -- storing one
 * would offer an editor a page no visitor can reach.
 */
function isEndpoint(path) {
  return APP_OWNED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function decode(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.name === "index.html") files.push(full);
  }
  return files;
}

const { PUBLIC_REDIRECTS } = await import("../worker/site/public-routes.ts");
const { APP_OWNED_PREFIXES } = await import("../worker/site/app-routes.ts");
const redirected = new Set(
  Object.keys(PUBLIC_REDIRECTS).map((path) => (path.length > 1 ? path.replace(/\/$/, "") : path)),
);

const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });

try {
  const candidates = [];
  for (const file of await walk(publicDir)) {
    const rel = relative(publicDir, file).replaceAll("\\", "/");
    const path = `/${rel.replace(/\/?index\.html$/, "")}`.replace(/\/$/, "") || "/";
    if (isAlreadyModelled(path) || isEndpoint(path)) continue;
    // A redirect source never renders; storing it would be a page nobody sees.
    if (redirected.has(path)) continue;

    const html = await readFile(file, "utf8");
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const desc = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i);
    candidates.push({
      path,
      title: title ? decode(title[1]) : "",
      meta_description: desc ? decode(desc[1]) : "",
      html,
      published: 1,
    });
  }
  candidates.sort((a, b) => a.path.localeCompare(b.path));
  console.log(`[pages] candidates: ${candidates.length}`);

  const existing = new Set((await sql`select path from static_pages`).map((r) => r.path));
  const missing = candidates.filter((c) => !existing.has(c.path));
  console.log(`[pages] already stored: ${existing.size}, to insert: ${missing.length}`);

  const refreshing = candidates.filter((c) => refreshPaths.has(c.path) && existing.has(c.path));
  for (const path of refreshPaths) {
    if (!candidates.some((c) => c.path === path)) console.warn(`[pages] --refresh ${path}: no file for it`);
  }

  const generated =
    "/**\n" +
    " * Paths served from `static_pages`. Regenerate with `npm run pages:seed`.\n" +
    " *\n" +
    " * vite.config.ts turns these into Vercel rewrites. Without the rewrite the\n" +
    " * static file wins and the stored copy is never reached.\n" +
    " */\n" +
    "export const STORED_PAGE_PATHS: readonly string[] = [\n" +
    candidates.map((c) => `  ${JSON.stringify(c.path)},`).join("\n") +
    "\n];\n";
  await writeFile(join(root, "worker", "site", "static-page-paths.generated.ts"), generated, "utf8");
  console.log("[pages] wrote worker/site/static-page-paths.generated.ts");

  if (!apply) {
    missing.slice(0, 10).forEach((c) => console.log(`   would insert ${c.path}`));
    refreshing.forEach((c) => console.log(`   would overwrite ${c.path}`));
    console.log("[pages] dry run: nothing written to the database");
  } else {
    for (const page of refreshing) {
      await sql`
        update static_pages
        set html = ${page.html}, title = ${page.title}, meta_description = ${page.meta_description},
            updated_at = now()
        where path = ${page.path}
      `;
      console.log(`[pages] refreshed ${page.path}`);
    }

    if (missing.length) {
      // Rows are ~270KB each; a single statement with all of them exceeds what
      // the driver will bind comfortably.
      for (let i = 0; i < missing.length; i += 5) {
        await sql`insert into static_pages ${sql(missing.slice(i, i + 5))} on conflict (path) do nothing`;
      }
      const after = await sql`select count(*)::int n, sum(length(html))::bigint b from static_pages`;
      console.log(`[pages] stored: ${after[0].n} pages, ${(Number(after[0].b) / 1048576).toFixed(1)} MB`);
    } else {
      console.log("[pages] nothing to insert");
    }
  }
} finally {
  await sql.end({ timeout: 5 });
}
