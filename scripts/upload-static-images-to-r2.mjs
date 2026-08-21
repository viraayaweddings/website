/**
 * Uploads files from site-public into R2 and prints URL mapping hints.
 *
 * Usage:
 *   DATABASE_URL=... R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET_NAME=... \\
 *     node scripts/upload-static-images-to-r2.mjs [--dry-run] [--prefix=storage/]
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const root = process.cwd();
const publicDir = join(root, "site-public");
const dryRun = process.argv.includes("--dry-run");
const prefixArg = process.argv.find((arg) => arg.startsWith("--prefix="));
const keyPrefix = prefixArg ? prefixArg.slice("--prefix=".length) : "storage/";

const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const bucket = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || "";

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  console.error("Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME.");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);

function contentTypeFor(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".avif")) return "image/avif";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
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

async function exists(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

let uploaded = 0;
let skipped = 0;

for (const file of await walk(publicDir)) {
  const rel = relative(publicDir, file).replaceAll("\\", "/");
  if (!IMAGE_EXT.has(rel.slice(rel.lastIndexOf(".")))) continue;
  if (!rel.startsWith(keyPrefix.replace(/^\//, ""))) continue;

  const bytes = await readFile(file);
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const ext = rel.slice(rel.lastIndexOf("."));
  const key = `legacy/${hash}${ext}`;

  if (await exists(key)) {
    skipped += 1;
    continue;
  }

  if (dryRun) {
    console.log(`[dry-run] ${rel} -> /media/${key}`);
    uploaded += 1;
    continue;
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: contentTypeFor(rel),
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  console.log(`${rel} -> /media/${key}`);
  uploaded += 1;
}

console.log(`Done. uploaded=${uploaded} skipped=${skipped}${dryRun ? " (dry run)" : ""}`);
