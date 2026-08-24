/**
 * Fills in `media.width`/`media.height` for every row still at the schema
 * default of 0.
 *
 * Nothing ever wrote these on upload, so every image on the site declares no
 * `width`/`height` -- the browser reserves no box before it loads, so page
 * content jumps as each one arrives (a mechanical, site-wide Cumulative
 * Layout Shift failure). `worker/site/image-dimensions.ts` reads these
 * columns back out to stamp `<img>` tags server-side; until this has run,
 * that code finds nothing and every tag is left exactly as it is today.
 *
 * Reads each object's bytes from R2 (falling back to the matching file under
 * site-public/media when R2 is not reachable) and measures it locally with
 * `sharp` -- nothing is re-encoded or re-uploaded, only measured.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-media-dimensions.mjs
 *       dry run: reports how many rows would be updated
 *
 *   node --env-file=.env.local scripts/backfill-media-dimensions.mjs --apply
 *       writes the measured width/height back to `media`
 *
 * `--if-configured` exits 0 rather than failing when there is no database.
 * `--limit N` caps how many rows are processed, for a quick spot check.
 */
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import postgres from "postgres";
import sharp from "sharp";

const apply = process.argv.includes("--apply");
const ifConfigured = process.argv.includes("--if-configured");
const limitArg = process.argv.indexOf("--limit");
const limit = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const bucket = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || "";
const r2Configured = Boolean(accountId && accessKeyId && secretAccessKey && bucket);

if (!databaseUrl) {
  if (ifConfigured) {
    console.log("[media-dimensions] no database here; nothing to do.");
    process.exit(0);
  }
  console.error("Set DATABASE_URL.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });
const r2 = r2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  : null;

// `/media/<key>` is a served route, not a real directory -- nothing under
// site-public is ever laid out that way. When a key was migrated from a
// static file, this map (built at migration time) still carries that file's
// *original* path, which is where the bytes actually live locally; see
// `legacyFallbackPaths` in worker/site/media.ts, which resolves the exact
// same way at request time.
const imageMigrationMap = await import("../scripts/image-migration-map.json", { with: { type: "json" } }).then(
  (m) => m.default,
);
const originalPathByKey = new Map(
  Object.entries(imageMigrationMap)
    .filter(([, mediaPath]) => mediaPath.startsWith("/media/"))
    .map(([staticPath, mediaPath]) => [mediaPath.slice("/media/".length), staticPath]),
);

/** Reads one object's bytes, from R2 if configured, else the local checkout. */
async function readObjectBytes(key) {
  if (r2) {
    try {
      const result = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return Buffer.from(await result.Body.transformToByteArray());
    } catch (error) {
      console.warn(`[media-dimensions] R2 read failed for ${key}: ${error.message}`);
    }
  }

  // Falls back to the local file when R2 is unreachable or unconfigured. Only
  // covers keys that came from a migrated static file -- an image uploaded
  // through the admin panel after the migration has no local copy at all, and
  // needs R2 configured to be measured.
  const originalPath = originalPathByKey.get(key);
  if (!originalPath) return null;

  const { readFile } = await import("node:fs/promises");
  const path = new URL(`../site-public${originalPath}`, import.meta.url);
  try {
    return await readFile(path);
  } catch {
    return null;
  }
}

async function main() {
  const rows = await sql`
    select key from media
    where width <= 0 or height <= 0
    order by key
  `;

  console.log(`[media-dimensions] ${rows.length} row(s) missing dimensions${apply ? "" : " (dry run)"}.`);

  let measured = 0;
  let skipped = 0;
  const toProcess = rows.slice(0, Number.isFinite(limit) ? limit : rows.length);

  for (const row of toProcess) {
    const bytes = await readObjectBytes(row.key);
    if (!bytes) {
      skipped += 1;
      console.warn(`[media-dimensions] could not read ${row.key}; skipped.`);
      continue;
    }

    let width = 0;
    let height = 0;
    try {
      const meta = await sharp(bytes).metadata();
      width = meta.width || 0;
      height = meta.height || 0;
    } catch (error) {
      skipped += 1;
      console.warn(`[media-dimensions] could not measure ${row.key}: ${error.message}`);
      continue;
    }

    if (!width || !height) {
      skipped += 1;
      continue;
    }

    measured += 1;
    if (apply) {
      await sql`update media set width = ${width}, height = ${height} where key = ${row.key}`;
    } else if (measured <= 20) {
      console.log(`  ${row.key} -> ${width}x${height}`);
    }
  }

  console.log(
    `[media-dimensions] ${apply ? "updated" : "would update"} ${measured} row(s); ${skipped} skipped (unreadable or unmeasurable).`,
  );

  await sql.end({ timeout: 5 });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
