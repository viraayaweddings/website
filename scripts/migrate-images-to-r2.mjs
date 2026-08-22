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
 *   node --env-file=.env.local --env-file=.env.vercel.local \
 *     scripts/migrate-images-to-r2.mjs --dry-run
 *   ... --apply            upload, record and rewrite
 *   ... --apply --no-upload  rewrite only, for a resumed run
 *
 * A dry run needs DATABASE_URL alone; it reads the database and the filesystem
 * and writes nothing.
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
const dryRun = !apply;

/**
 * Only content images. site-public/user/assets and site-public/vendor are the
 * theme's own chrome, referenced from stylesheets rather than from anything the
 * panel edits, so pulling them into the library would be clutter that still
 * could not be replaced.
 */
const CONTENT_ROOTS = ["storage/", "uploads/"];

/**
 * SVG stays on the static path. The panel refuses SVG uploads because the
 * format can carry script, and serving one from /media would route around that
 * decision for no gain.
 */
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]);

const CONTENT_TYPE = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
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
  /\/(?:storage|uploads)\/[^"'\s)\\]+?\.(?:jpg|jpeg|png|webp|avif|gif)/gi;

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  console.error("Set DATABASE_URL.");
  process.exit(1);
}

const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const bucket = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || "";

const needsR2 = apply && !skipUpload;
if (needsR2 && (!accountId || !accessKeyId || !secretAccessKey || !bucket)) {
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
  console.log(`referenced by the database: ${referenced.size}`);
  console.log(`content images on disk:     ${onDisk.size}`);
  if (missing.length) {
    console.log(`referenced but not on disk: ${missing.length}`);
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
  console.log(`distinct objects after dedupe: ${byKey.size}`);

  await writeFile(
    join(root, "scripts", "image-migration-map.json"),
    JSON.stringify(Object.fromEntries([...mapping].map(([k, v]) => [k, `/media/${v}`])), null, 1),
    "utf8",
  );
  console.log("wrote scripts/image-migration-map.json");

  if (dryRun) {
    console.log("\ndry run: nothing uploaded, nothing rewritten");
    return;
  }

  let uploaded = 0;
  let present = 0;
  if (!skipUpload) {
    for (const entry of byKey.values()) {
      try {
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: entry.key }));
        present += 1;
        continue;
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
      if (uploaded % 100 === 0) console.log(`  uploaded ${uploaded}...`);
    }
    console.log(`uploaded ${uploaded}, already in the bucket ${present}`);
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
  console.log(`media rows ensured: ${rows.length}`);

  const replaceAll = (value) => {
    let out = String(value);
    for (const [path, key] of mapping) {
      if (out.includes(path)) out = out.split(path).join(`/media/${key}`);
    }
    return out;
  };

  let columnUpdates = 0;
  for (const [table, column] of IMAGE_COLUMNS) {
    for (const [path, key] of mapping) {
      const result = await sql.unsafe(
        `update ${table} set ${column} = $1 where ${column} = $2`,
        [`/media/${key}`, path],
      );
      columnUpdates += result.count || 0;
    }
  }
  console.log(`column values repointed: ${columnUpdates}`);

  let highlightUpdates = 0;
  for (const row of await sql`select id, highlights from hotels where highlights <> ''`) {
    const next = replaceAll(row.highlights);
    if (next !== row.highlights) {
      await sql`update hotels set highlights = ${next} where id = ${row.id}`;
      highlightUpdates += 1;
    }
  }
  console.log(`hotels.highlights rewritten: ${highlightUpdates}`);

  let shellUpdates = 0;
  for (const row of await sql`select key, html from page_templates`) {
    const next = replaceAll(row.html);
    if (next !== row.html) {
      await sql`update page_templates set html = ${next}, updated_at = now() where key = ${row.key}`;
      shellUpdates += 1;
    }
  }
  console.log(`page shells rewritten: ${shellUpdates}`);
}

try {
  await main();
} finally {
  await sql.end({ timeout: 5 });
}
