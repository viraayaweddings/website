import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, "data", "venues");
const CONCURRENCY = Number(process.env.ASSET_CONCURRENCY || 16);

async function mapLimit(items, limit, mapper) {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
}

async function exists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function download(originalUrl, localPath) {
  const target = join(ROOT, "public", localPath.replace(/^\//, ""));
  const tmpTarget = `${target}.tmp`;
  if (await exists(target)) return "skipped";
  await mkdir(dirname(target), { recursive: true });
  const res = await fetch(originalUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${res.statusText}`);
  await rm(tmpTarget, { force: true });
  await pipeline(res.body, createWriteStream(tmpTarget));
  await rename(tmpTarget, target);
  return "downloaded";
}

async function main() {
  const assetMap = JSON.parse(await readFile(join(DATA_DIR, "asset-map.json"), "utf8"));
  const entries = Object.entries(assetMap);
  let skipped = 0;
  let downloaded = 0;
  let failed = 0;
  console.log(`Mirroring ${entries.length} venue image assets`);
  await mapLimit(entries, CONCURRENCY, async ([originalUrl, localPath], index) => {
    try {
      const status = await download(originalUrl, localPath);
      if (status === "skipped") skipped += 1;
      else downloaded += 1;
    } catch (error) {
      failed += 1;
      if (failed <= 30) {
        console.warn(`Failed ${originalUrl}: ${error.message}`);
      }
    }
    if ((index + 1) % 250 === 0 || index + 1 === entries.length) {
      console.log(`${index + 1}/${entries.length} checked, ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
