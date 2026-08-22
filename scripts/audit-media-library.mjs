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
const YOUTUBE_LOCAL_RE = /\/vendor\/youtube-local\/([A-Za-z0-9_-]+)\.html/gi;
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
  const normalized = raw.startsWith("/") ? posix.normalize(raw) : raw;
  if (normalized.startsWith("/media/")) return normalized.slice("/media/".length);
  if (mapping.has(raw)) return mediaKey(mapping.get(raw), mapping);
  if (mapping.has(normalized)) return mediaKey(mapping.get(normalized), mapping);
  if (normalized.startsWith("/")) return "";
  return raw;
}

function addReference(refs, value, where, mapping, options = {}) {
  const raw = String(value || "").trim();
  if (!raw) return;
  if (/\/fonts\/[^/]+\.svg(?:$|[?#])/i.test(raw)) return;
  const normalized = raw.startsWith("/") ? posix.normalize(raw) : raw;
  const storedRaw = options.synthetic && mapping.has(normalized) ? mapping.get(normalized) : raw;
  refs.push({ raw: storedRaw, key: mediaKey(raw, mapping), where });
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
  for (const match of source.matchAll(YOUTUBE_LOCAL_RE)) {
    addReference(refs, `/vendor/youtube-local/${match[1]}.jpg`, where, mapping, { synthetic: true });
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

  for (const row of await sql`select id::text as id, name, video_id from hotels where video_id <> ''`) {
    addReference(
      refs,
      `/vendor/youtube-local/${row.video_id}.jpg`,
      `hotels.video_id:${row.id}:${row.name}`,
      mapping,
      { synthetic: true },
    );
  }

  const cityCards = await sql`
    select cl.city as page_city, h.thumbnail_image as value, h.name
    from city_listings cl
    join hotels h on h.city = cl.venue_city and h.slug = cl.venue_slug
    where h.thumbnail_image <> ''
  `;
  cityCards.forEach((row) =>
    addReference(refs, row.value, `city_listing:${row.page_city}:${row.name}`, mapping),
  );

  const venueRows = await sql`
    select city, slug, name, thumbnail_image, nearby_slugs
    from hotels
    where nearby_slugs <> '[]' or thumbnail_image <> ''
  `;
  const venuesByPath = new Map(venueRows.map((row) => [`${row.city}/${row.slug}`, row]));
  for (const row of venueRows) {
    let nearby = [];
    try {
      const parsed = JSON.parse(row.nearby_slugs || "[]");
      nearby = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      nearby = [];
    }
    for (const nearbyPath of nearby) {
      const target = venuesByPath.get(nearbyPath);
      if (target?.thumbnail_image) {
        addReference(refs, target.thumbnail_image, `nearby_venue:${row.city}/${row.slug}:${target.name}`, mapping);
      }
    }
  }

  const blogCards = await sql`
    select bl.taxonomy, bl.taxonomy_slug, bp.card_image as value, bp.slug
    from blog_listings bl
    join blog_posts bp on bp.slug = bl.post_slug
    where bp.card_image <> ''
  `;
  blogCards.forEach((row) =>
    addReference(refs, row.value, `blog_listing:${row.taxonomy}/${row.taxonomy_slug}:${row.slug}`, mapping),
  );

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

async function runtimeSourceReferences(mapping) {
  const refs = [];
  const roots = [join(root, "worker", "site")];
  for (const rootDir of roots) {
    for (const file of await walk(rootDir)) {
      if (![".ts", ".tsx", ".js"].includes(extensionOf(file))) continue;
      const rel = relative(root, file).replaceAll("\\", "/");
      refs.push(...extractFromText(await readFile(file, "utf8").catch(() => ""), rel, mapping));
    }
  }
  refs.push(...extractFromText(await readFile(join(root, "app", "layout.tsx"), "utf8").catch(() => ""), "app/layout.tsx", mapping));
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

function migrationInventoryReferences(mapping, mediaRows) {
  const refs = [...mapping.entries()]
    .map(([source, target]) => ({
      raw: target,
      key: mediaKey(target, mapping),
      where: `migration:${source}`,
    }))
    .filter((ref) => ref.key);

  const sourcesByFilename = new Map();
  for (const source of mapping.keys()) {
    const filename = posix.basename(source);
    sourcesByFilename.set(filename, [...(sourcesByFilename.get(filename) ?? []), source]);
  }

  for (const row of mediaRows) {
    if (row.uploaded_by !== "migration" || !row.filename || !sourcesByFilename.has(row.filename)) continue;
    for (const source of sourcesByFilename.get(row.filename)) {
      refs.push({ raw: `/media/${row.key}`, key: row.key, where: `migration-duplicate:${source}` });
    }
  }

  return refs;
}

const url = databaseUrl();
if (!url) {
  console.error("No Postgres URL found.");
  process.exit(1);
}

const mapping = new Map(Object.entries(JSON.parse(await readFile(mapPath, "utf8"))));
const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

try {
  const rows = await sql`select key, filename, uploaded_by, size from media`;
  const mediaKeys = new Set(rows.map((row) => row.key));
  const zeroSize = rows.filter((row) => Number(row.size || 0) <= 0);

  const dbRefs = await databaseReferences(sql, mapping);
  const fileRefs = await staticReferences(mapping);
  const runtimeRefs = await runtimeSourceReferences(mapping);
  const migrationRefs = migrationInventoryReferences(mapping, rows);
  const dbIssues = summarizeIssues(dbRefs, mediaKeys, mapping);
  const staticIssues = summarizeIssues(fileRefs, mediaKeys, mapping);
  const runtimeIssues = summarizeIssues(runtimeRefs, mediaKeys, mapping);

  const allKeys = new Set([...dbRefs, ...fileRefs, ...runtimeRefs, ...migrationRefs].map((ref) => ref.key).filter(Boolean));
  const unusedMediaRows = rows.filter((row) => !allKeys.has(row.key));

  console.log(`[media-audit] media rows: ${rows.length}`);
  console.log(`[media-audit] migration map paths: ${mapping.size}`);
  console.log(`[media-audit] database image references: ${dbRefs.length}`);
  console.log(`[media-audit] static fallback image references: ${fileRefs.length}`);
  console.log(`[media-audit] runtime source image references: ${runtimeRefs.length}`);
  console.log(`[media-audit] migration inventory references: ${migrationRefs.length}`);
  console.log(`[media-audit] referenced media keys: ${allKeys.size}`);
  console.log(`[media-audit] unused media rows: ${unusedMediaRows.length}`);
  console.log(`[media-audit] zero-size rows: ${zeroSize.length}`);
  console.log(`[media-audit] database legacy refs: ${dbIssues.legacyRefs.length}`);
  console.log(`[media-audit] database missing media rows: ${dbIssues.missingMedia.length}`);
  console.log(`[media-audit] static legacy refs: ${staticIssues.legacyRefs.length}`);
  console.log(`[media-audit] static missing media rows: ${staticIssues.missingMedia.length}`);
  console.log(`[media-audit] runtime legacy refs: ${runtimeIssues.legacyRefs.length}`);
  console.log(`[media-audit] runtime missing media rows: ${runtimeIssues.missingMedia.length}`);

  const failures = [
    ...zeroSize.map((row) => `zero-size media row: ${row.key}`),
    ...dbIssues.legacyRefs.map((ref) => `database still uses legacy path: ${ref.raw} (${ref.where})`),
    ...dbIssues.missingMap.map((ref) => `database unmapped legacy path: ${ref.raw} (${ref.where})`),
    ...dbIssues.missingMedia.map((ref) => `database missing media row: ${ref.raw} (${ref.where})`),
    ...staticIssues.legacyRefs.map((ref) => `static fallback still uses legacy path: ${ref.raw} (${ref.where})`),
    ...staticIssues.missingMap.map((ref) => `static unmapped legacy path: ${ref.raw} (${ref.where})`),
    ...staticIssues.missingMedia.map((ref) => `static missing media row: ${ref.raw} (${ref.where})`),
    ...runtimeIssues.legacyRefs.map((ref) => `runtime source still uses legacy path: ${ref.raw} (${ref.where})`),
    ...runtimeIssues.missingMap.map((ref) => `runtime source unmapped legacy path: ${ref.raw} (${ref.where})`),
    ...runtimeIssues.missingMedia.map((ref) => `runtime source missing media row: ${ref.raw} (${ref.where})`),
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
