/**
 * Repoints the image references inside site-public at /media.
 *
 * The database migration (scripts/migrate-images-to-r2.mjs) moves everything the
 * panel renders. It cannot reach the cloned HTML files, and those are not dead
 * weight: pages without a page_templates row are served from them, and every
 * managed page uses its file as the fallback when a shell is missing. Left
 * alone they would keep serving the pre-migration copy of an image, so changing
 * a picture in the panel would visibly fail to take on some pages.
 *
 * The image files themselves stay where they are. Only the references move.
 *
 * Usage:
 *   node scripts/repoint-static-images.mjs --dry-run
 *   node scripts/repoint-static-images.mjs --apply
 *
 * Reads the mapping written by the dry run of the migration script, so run that
 * first.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const publicDir = join(root, "site-public");
const mapPath = join(root, "scripts", "image-migration-map.json");

const apply = process.argv.includes("--apply");

/** Only the files that carry references; the images themselves are untouched. */
const REWRITABLE = new Set([".html", ".json", ".js", ".css", ".xml", ".txt"]);

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

const mapping = JSON.parse(await readFile(mapPath, "utf8"));
const entries = Object.entries(mapping);
console.log(`mapping: ${entries.length} paths`);

/**
 * One pass with a single expression rather than 1,768 passes of split/join.
 * The paths share long prefixes, so the alternation is matched against each
 * candidate rather than the file being walked once per path.
 */
const LOOKUP = new Map(entries);
const REFERENCE_RE = /\/(?:storage|uploads)\/[^"'\s)\\]+?\.(?:jpg|jpeg|png|webp|avif|gif)/gi;

let filesChanged = 0;
let replacements = 0;
const unmapped = new Map();

for (const file of await walk(publicDir)) {
  if (!REWRITABLE.has(extensionOf(file))) continue;
  const rel = relative(publicDir, file).replaceAll("\\", "/");
  const before = await readFile(file, "utf8");
  if (!before.includes("/storage/") && !before.includes("/uploads/")) continue;

  let hits = 0;
  const after = before.replace(REFERENCE_RE, (match) => {
    const next = LOOKUP.get(match);
    if (!next) {
      unmapped.set(match, (unmapped.get(match) || 0) + 1);
      return match;
    }
    hits += 1;
    return next;
  });

  if (!hits) continue;
  filesChanged += 1;
  replacements += hits;
  if (apply) await writeFile(file, after, "utf8");
  else if (filesChanged <= 3) console.log(`  ${rel}: ${hits}`);
}

console.log(`${apply ? "rewrote" : "would rewrite"} ${replacements} references in ${filesChanged} files`);

if (unmapped.size) {
  const total = [...unmapped.values()].reduce((a, b) => a + b, 0);
  console.log(`left alone: ${unmapped.size} paths with no object (${total} occurrences)`);
  [...unmapped.keys()].slice(0, 10).forEach((path) => console.log(`   ${path}`));
}
if (!apply) console.log("dry run: nothing written");
