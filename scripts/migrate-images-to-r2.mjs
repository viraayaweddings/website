/**
 * Moves the site's images into R2 and the media library.
 *
 * The images that shipped with the site are files under site-public, invisible
 * to the panel and unreplaceable from it. This uploads them to R2, records each
 * one in `media` so it appears at /admin/media, and repoints every reference in
 * the database at /media/<key>.
 *
 * The files under site-public are deliberately left in place. They are what
 * serves if a key is ever wrong, and removing 285MB of assets is a separate
 * decision from making them editable.
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-images-to-r2.mjs --dry-run
 *   node --env-file=.env.local --env-file=.env.vercel.local \
 *     scripts/migrate-images-to-r2.mjs --apply
 *
 * `--if-configured` turns a missing R2 credential into a no-op exit rather than
 * a failure, which is what lets this run from the build: the credentials live
 * only in the Vercel project, so the build is the one place that has both them
 * and the checked-out files.
 *
 * Every run records its outcome in `settings.image_migration_status`, because
 * when it runs from the build that row is the only way to see what happened.
 *
 * It is safe to run twice. Keys are content hashes, so the second pass finds
 * every object already in the bucket and every reference already repointed.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import postgres from "postgres";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const root = process.cwd();
const publicDir = join(root, "site-public");

const apply = process.argv.includes("--apply");
const skipUpload = process.argv.includes("--no-upload");
const ifConfigured = process.argv.includes("--if-configured");
const dryRun = !apply;

/** How many objects to push at once. R2 is happy with far more; the build is not. */
const UPLOAD_CONCURRENCY = 8;

/**
 * Every image the site ships, wherever it sits. The first pass took only
 * storage/ and uploads/ on the reasoning that user/assets and vendor are the
 * theme's own chrome; they turned out to be referenced 410 times from the
 * stored page shells, so the panel does have a claim on them.
 */
const CONTENT_ROOTS = [""];

/**
 * SVG included. The panel still refuses SVG *uploads* -- that guard is about
 * what strangers can put on the origin, and it is untouched. These are the
 * site's own files, already served from this origin today, and /media now
 * answers for them with `sandbox` and a null CSP, which the static path never
 * did.
 */
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);

const CONTENT_TYPE = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/** Every column that holds a single image path. */
const IMAGE_COLUMNS = [
  ["hero_slides", "image_key"],
  ["blog_posts", "og_image"],
  ["blog_posts", "banner_image"],
  ["blog_posts", "card_image"],
  ["hotels", "og_image"],
  ["hotels", "banner_image"],
  ["hotels", "thumbnail_image"],
];

const REFERENCE_RE =
  /(?<=["'\s(=,])\/(?!media\/)[A-Za-z0-9_][^"'\s),]*?\.(?:jpg|jpeg|png|webp|avif|gif|svg)/gi;

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  if (ifConfigured) {
    console.log("[images] no database here; nothing to do.");
    process.exit(0);
  }
  console.error("Set DATABASE_URL.");
  process.exit(1);
}

const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const bucket = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || "";

const configured = Boolean(accountId && accessKeyId && secretAccessKey && bucket);
const needsR2 = apply && !skipUpload;

if (needsR2 && !configured) {
  if (ifConfigured) {
    console.log("[images] R2 not configured here; nothing to do.");
    process.exit(0);
  }
  console.error(
    "R2 credentials missing. Run `vercel env pull .env.vercel.local` and pass it with --env-file.",
  );
  process.exit(1);
}

const client = needsR2
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  : null;

const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });

function extensionOf(path) {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot).toLowerCase();
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

/** Every image path the database points at, from all three shapes of storage. */
async function collectReferences() {
  const paths = new Set();
  const add = (value) => {
    for (const match of String(value || "").match(REFERENCE_RE) || []) paths.add(match);
  };

  for (const [table, column] of IMAGE_COLUMNS) {
    const rows = await sql.unsafe(`select ${column} as value from ${table} where ${column} <> ''`);
    rows.forEach((row) => add(row.value));
  }
  (await sql`select highlights from hotels where highlights <> ''`).forEach((row) =>
    add(row.highlights),
  );
  (await sql`select html from page_templates`).forEach((row) => add(row.html));

  return paths;
}

/** Runs `worker` over `items`, `limit` at a time. */
async function pooled(items, limit, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await worker(queue.pop());
  });
  await Promise.all(runners);
}

async function record(status, detail) {
  const value = JSON.stringify({ status, ...detail });
  await sql`
    insert into settings (key, value, updated_by, updated_at)
    values ('image_migration_status', ${value}, 'migration', now())
    on conflict (key) do update set value = excluded.value,
      updated_by = excluded.updated_by, updated_at = excluded.updated_at`;
}

async function main() {
  const referenced = await collectReferences();

  const onDisk = new Map();
  for (const file of await walk(publicDir)) {
    const rel = relative(publicDir, file).replaceAll("\\", "/");
    if (!CONTENT_ROOTS.some((prefix) => rel.startsWith(prefix))) continue;
    if (!IMAGE_EXT.has(extensionOf(rel))) continue;
    onDisk.set(`/${rel}`, file);
  }

  const missing = [...referenced].filter((path) => !onDisk.has(path));
  console.log(`[images] referenced by the database: ${referenced.size}`);
  console.log(`[images] content images on disk:     ${onDisk.size}`);
  if (missing.length) {
    console.log(`[images] referenced but not on disk: ${missing.length}`);
    missing.slice(0, 10).forEach((path) => console.log(`   ${path}`));
  }

  // Hash first so a re-run is idempotent and identical bytes share one object.
  const mapping = new Map();
  const byKey = new Map();
  for (const [path, file] of onDisk) {
    const bytes = await readFile(file);
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
    const ext = extensionOf(path);
    const key = `legacy/${hash}${ext}`;
    mapping.set(path, key);
    if (!byKey.has(key)) {
      byKey.set(key, { key, bytes, ext, filename: path.slice(path.lastIndexOf("/") + 1) });
    }
  }
  console.log(`[images] distinct objects after dedupe: ${byKey.size}`);

  if (dryRun) {
    await writeFile(
      join(root, "scripts", "image-migration-map.json"),
      JSON.stringify(Object.fromEntries([...mapping].map(([k, v]) => [k, `/media/${v}`])), null, 1),
      "utf8",
    );
    console.log("[images] wrote scripts/image-migration-map.json");
    console.log("[images] dry run: nothing uploaded, nothing rewritten");
    return;
  }

  let uploaded = 0;
  let present = 0;
  if (!skipUpload) {
    await pooled([...byKey.values()], UPLOAD_CONCURRENCY, async (entry) => {
      try {
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: entry.key }));
        present += 1;
        return;
      } catch {
        // Not there yet.
      }
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: entry.key,
          Body: entry.bytes,
          ContentType: CONTENT_TYPE[entry.ext] || "application/octet-stream",
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      uploaded += 1;
      if (uploaded % 200 === 0) console.log(`[images]   uploaded ${uploaded}...`);
    });
    console.log(`[images] uploaded ${uploaded}, already in the bucket ${present}`);
  }

  // The library row is what makes an image visible in the panel.
  const rows = [...byKey.values()].map((entry) => ({
    key: entry.key,
    filename: entry.filename,
    content_type: CONTENT_TYPE[entry.ext] || "application/octet-stream",
    size: entry.bytes.length,
    uploaded_by: "migration",
  }));
  for (let i = 0; i < rows.length; i += 200) {
    await sql`insert into media ${sql(rows.slice(i, i + 200))} on conflict (key) do nothing`;
  }
  console.log(`[images] media rows ensured: ${rows.length}`);

  // One statement per column rather than one per path. The build machine is a
  // long way from the database and 12,000 round trips would outlast the build.
  const pairs = [...mapping].map(([path, key]) => [path, `/media/${key}`]);
  let columnUpdates = 0;
  for (const [table, column] of IMAGE_COLUMNS) {
    const result = await sql.unsafe(
      `update ${table} as t set ${column} = m.next
         from (values ${pairs.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(",")})
              as m(old, next)
        where t.${column} = m.old`,
      pairs.flat(),
    );
    columnUpdates += result.count || 0;
  }
  console.log(`[images] column values repointed: ${columnUpdates}`);

  const replaceAll = (value) => {
    let out = String(value);
    for (const [path, key] of mapping) {
      if (out.includes(path)) out = out.split(path).join(`/media/${key}`);
    }
    return out;
  };

  let highlightUpdates = 0;
  for (const row of await sql`select id, highlights from hotels where highlights <> ''`) {
    const next = replaceAll(row.highlights);
    if (next !== row.highlights) {
      await sql`update hotels set highlights = ${next} where id = ${row.id}`;
      highlightUpdates += 1;
    }
  }
  console.log(`[images] hotels.highlights rewritten: ${highlightUpdates}`);

  // The article body is markup, not a path column, so it carries its own
  // pictures. Missing it left every inline image in the blog on the old path.
  let bodyUpdates = 0;
  for (const row of await sql`select id, body_html from blog_posts where body_html <> ''`) {
    const next = replaceAll(row.body_html);
    if (next !== row.body_html) {
      await sql`update blog_posts set body_html = ${next} where id = ${row.id}`;
      bodyUpdates += 1;
    }
  }
  console.log(`[images] blog_posts.body_html rewritten: ${bodyUpdates}`);

  // Same for the pages stored whole.
  let storedPageUpdates = 0;
  for (const row of await sql`select path, html from static_pages where html <> ''`) {
    const next = replaceAll(row.html);
    if (next !== row.html) {
      await sql`update static_pages set html = ${next} where path = ${row.path}`;
      storedPageUpdates += 1;
    }
  }
  console.log(`[images] static_pages rewritten: ${storedPageUpdates}`);

  let shellUpdates = 0;
  for (const row of await sql`select key, html from page_templates`) {
    const next = replaceAll(row.html);
    if (next !== row.html) {
      await sql`update page_templates set html = ${next}, updated_at = now() where key = ${row.key}`;
      shellUpdates += 1;
    }
  }
  console.log(`[images] page shells rewritten: ${shellUpdates}`);

  await record("done", {
    objects: byKey.size,
    bodyUpdates,
    storedPageUpdates,
    uploaded,
    alreadyPresent: present,
    mediaRows: rows.length,
    columnUpdates,
    highlightUpdates,
    shellUpdates,
    missingOnDisk: missing.length,
  });
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[images] failed: ${message}`);
  if (apply) {
    try {
      await record("failed", { message });
    } catch {
      // The status row is a convenience, not a reason to lose the real error.
    }
  }
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
