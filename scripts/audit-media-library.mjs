/**
 * Audits whether website image references are backed by the admin media table.
 *
 * The site has two image-bearing surfaces: database-rendered content and the
 * checked-in static fallback files. This script verifies both against the media
 * table and the static-to-/media migration map.
 *
 * Usage:
 *   node --env-file=.env.local scripts/audit-media-library.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import { join, posix, relative } from "node:path";
import postgres from "postgres";

const root = process.cwd();
const publicDir = join(root, "site-public");
const mapPath = join(root, "scripts", "image-migration-map.json");

const IMAGE_EXT = "jpg|jpeg|png|webp|avif|gif|svg";
const MEDIA_RE = new RegExp(`/media/([A-Za-z0-9/_.-]+?\\.(?:${IMAGE_EXT}))`, "gi");
const STATIC_RE = new RegExp(`(?<=["'\\s(=,])/(?!media/)[A-Za-z0-9_][^"'\\s),]*?\\.(?:${IMAGE_EXT})`, "gi");
const RELATIVE_RE = new RegExp(`(?<=["'\\s(=,])\\.\\/([^"'\\s),]*?\\.(?:${IMAGE_EXT}))`, "gi");
const CSS_URL_RE = new RegExp(`url\\((\\s*["']?)(\\.{1,2}/[^"')]+?\\.(?:${IMAGE_EXT}))(["']?\\s*)\\)`, "gi");
const REWRITABLE = new Set([".html", ".json", ".js", ".css", ".xml", ".txt"]);
const IMAGE_COLUMNS = [
  ["hero_slides", "image_key"],
  ["blog_posts", "og_image"],
  ["blog_posts", "banner_image"],
  ["blog_posts", "card_image"],
  ["hotels", "og_image"],
  ["hotels", "banner_image"],
  ["hotels", "thumbnail_image"],
];

function extensionOf(path) {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot).toLowerCase();
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

function databaseUrl() {
  return [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL_NON_POOLED,
    process.env.POSTGRES_URL_NO_SSL,
  ].find((value) => value && /^postgres(ql)?:\/\//i.test(value));
}

function mediaKey(value, mapping) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/media/")) return raw.slice("/media/".length);
  if (mapping.has(raw)) return mediaKey(mapping.get(raw), mapping);
  if (raw.startsWith("/")) return "";
  return raw;
}

function addReference(refs, value, where, mapping) {
  const raw = String(value || "").trim();
  if (!raw) return;
  if (/\/fonts\/[^/]+\.svg(?:$|[?#])/i.test(raw)) return;
  refs.push({ raw, key: mediaKey(raw, mapping), where });
}

function extractFromText(text, where, mapping, basePath = "") {
  const refs = [];
  const source = String(text || "");
  for (const match of source.matchAll(MEDIA_RE)) addReference(refs, `/media/${match[1]}`, where, mapping);
  for (const match of source.matchAll(STATIC_RE)) addReference(refs, match[0], where, mapping);
  if (basePath) {
    const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
    for (const match of source.matchAll(RELATIVE_RE)) addReference(refs, `${base}/${match[1]}`, where, mapping);
  }
  return refs;
}

async function databaseReferences(sql, mapping) {
  const refs = [];
  for (const [table, column] of IMAGE_COLUMNS) {
    const rows = await sql.unsafe(`select ${column} as value from ${table} where ${column} <> ''`);
    rows.forEach((row) => addReference(refs, row.value, `${table}.${column}`, mapping));
  }

  const textQueries = [
    ["hotels.description", sql`select id::text as id, description as value from hotels where description <> ''`],
    ["hotels.highlights", sql`select id::text as id, highlights as value from hotels where highlights <> ''`],
    ["hotels.faqs", sql`select id::text as id, faqs as value from hotels where faqs <> ''`],
    ["blog_posts.body_html", sql`select id::text as id, body_html as value from blog_posts where body_html <> ''`],
    ["blog_posts.faqs", sql`select id::text as id, faqs as value from blog_posts where faqs <> ''`],
    ["static_pages.html", sql`select path as id, html as value from static_pages where html <> ''`],
    ["page_templates.html", sql`select key as id, html as value from page_templates where html <> ''`],
    ["settings.value", sql`select key as id, value from settings where value like '%.jpg%' or value like '%.jpeg%' or value like '%.png%' or value like '%.webp%' or value like '%.avif%' or value like '%.gif%' or value like '%.svg%'`],
  ];

  for (const [label, promise] of textQueries) {
    for (const row of await promise) {
      refs.push(...extractFromText(row.value, `${label}:${row.id}`, mapping));
    }
  }
  return refs;
}

function publicPathForFile(file) {
  const rel = relative(publicDir, file).replaceAll("\\", "/");
  const raw = `/${rel}`;
  const publicPath = raw.endsWith("/index.html") ? raw.slice(0, -"index.html".length) : raw;
  const basePath = publicPath.endsWith("/")
    ? publicPath.slice(0, -1)
    : publicPath.includes("/")
      ? publicPath.slice(0, publicPath.lastIndexOf("/"))
      : "";
  return { rel, publicPath: publicPath || "/", basePath: basePath || "/" };
}

async function staticReferences(mapping) {
  const refs = [];
  for (const file of await walk(publicDir)) {
    if (!REWRITABLE.has(extensionOf(file))) continue;
    const { rel, publicPath, basePath } = publicPathForFile(file);
    const text = await readFile(file, "utf8").catch(() => "");
    refs.push(...extractFromText(text, `site-public/${rel}`, mapping, basePath));

    if (extensionOf(file) === ".css") {
      const dir = posix.dirname(`/${rel}`);
      for (const match of text.matchAll(CSS_URL_RE)) {
        addReference(refs, posix.normalize(posix.join(dir, match[2])), `site-public/${rel}`, mapping);
      }
    }
  }
  return refs;
}

function summarizeIssues(refs, mediaKeys, mapping) {
  const legacyRefs = [];
  const missingMap = [];
  const missingMedia = [];
  const seen = new Set();

  for (const ref of refs) {
    const marker = `${ref.raw}\n${ref.where}`;
    if (seen.has(marker)) continue;
    seen.add(marker);

    if (ref.raw.startsWith("/") && !ref.raw.startsWith("/media/")) {
      legacyRefs.push(ref);
      if (!mapping.has(ref.raw)) missingMap.push(ref);
    }
    if (!ref.key || !mediaKeys.has(ref.key)) missingMedia.push(ref);
  }

  return { legacyRefs, missingMap, missingMedia };
}

const url = databaseUrl();
if (!url) {
  console.error("No Postgres URL found.");
  process.exit(1);
}

const mapping = new Map(Object.entries(JSON.parse(await readFile(mapPath, "utf8"))));
const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

try {
  const rows = await sql`select key, size from media`;
  const mediaKeys = new Set(rows.map((row) => row.key));
  const zeroSize = rows.filter((row) => Number(row.size || 0) <= 0);

  const dbRefs = await databaseReferences(sql, mapping);
  const fileRefs = await staticReferences(mapping);
  const dbIssues = summarizeIssues(dbRefs, mediaKeys, mapping);
  const staticIssues = summarizeIssues(fileRefs, mediaKeys, mapping);

  const allKeys = new Set([...dbRefs, ...fileRefs].map((ref) => ref.key).filter(Boolean));
  const unusedMediaRows = rows.filter((row) => !allKeys.has(row.key));

  console.log(`[media-audit] media rows: ${rows.length}`);
  console.log(`[media-audit] migration map paths: ${mapping.size}`);
  console.log(`[media-audit] database image references: ${dbRefs.length}`);
  console.log(`[media-audit] static fallback image references: ${fileRefs.length}`);
  console.log(`[media-audit] referenced media keys: ${allKeys.size}`);
  console.log(`[media-audit] unused media rows: ${unusedMediaRows.length}`);
  console.log(`[media-audit] zero-size rows: ${zeroSize.length}`);
  console.log(`[media-audit] database legacy refs: ${dbIssues.legacyRefs.length}`);
  console.log(`[media-audit] database missing media rows: ${dbIssues.missingMedia.length}`);
  console.log(`[media-audit] static legacy refs: ${staticIssues.legacyRefs.length}`);
  console.log(`[media-audit] static missing media rows: ${staticIssues.missingMedia.length}`);

  const failures = [
    ...zeroSize.map((row) => `zero-size media row: ${row.key}`),
    ...dbIssues.legacyRefs.map((ref) => `database still uses legacy path: ${ref.raw} (${ref.where})`),
    ...dbIssues.missingMap.map((ref) => `database unmapped legacy path: ${ref.raw} (${ref.where})`),
    ...dbIssues.missingMedia.map((ref) => `database missing media row: ${ref.raw} (${ref.where})`),
    ...staticIssues.legacyRefs.map((ref) => `static fallback still uses legacy path: ${ref.raw} (${ref.where})`),
    ...staticIssues.missingMap.map((ref) => `static unmapped legacy path: ${ref.raw} (${ref.where})`),
    ...staticIssues.missingMedia.map((ref) => `static missing media row: ${ref.raw} (${ref.where})`),
  ];

  if (failures.length) {
    console.log("[media-audit] failures:");
    failures.slice(0, 40).forEach((failure) => console.log(`  - ${failure}`));
    if (failures.length > 40) console.log(`  ... ${failures.length - 40} more`);
    process.exitCode = 1;
  }
} finally {
  await sql.end({ timeout: 5 });
}
