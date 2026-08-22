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
import { join, posix, relative } from "node:path";

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
const LOOKUP = new Map(Object.entries(mapping));
console.log(`mapping: ${LOOKUP.size} paths`);

/**
 * Anchored on the character that opens the URL, so a match can only begin where
 * a reference begins. Without that, /media/legacy/x.jpg matches again at its
 * own last slash and the pass tries to rewrite its own output.
 */
const ABSOLUTE_RE =
  /(?<=["'\s(=,])\/(?!media\/)[A-Za-z0-9_][^"'\s),]*?\.(?:jpg|jpeg|png|webp|avif|gif|svg)/gi;

/**
 * Stylesheets reach their images relatively -- url("../images/x.svg") -- so
 * there is no absolute path to look up. Resolving against the stylesheet's own
 * directory gives one.
 */
const CSS_URL_RE = /url\((\s*["']?)(\.{1,2}\/[^"')]+?\.(?:jpg|jpeg|png|webp|avif|gif|svg))(["']?\s*)\)/gi;

let filesChanged = 0;
let replacements = 0;
let cssResolved = 0;
const unmapped = new Map();

for (const file of await walk(publicDir)) {
  if (!REWRITABLE.has(extensionOf(file))) continue;
  const rel = relative(publicDir, file).replaceAll("\\", "/");
  const before = await readFile(file, "utf8");

  let hits = 0;
  let after = before.replace(ABSOLUTE_RE, (match) => {
    const next = LOOKUP.get(match);
    if (!next) {
      unmapped.set(match, (unmapped.get(match) || 0) + 1);
      return match;
    }
    hits += 1;
    return next;
  });

  if (extensionOf(file) === ".css") {
    const dir = posix.dirname(`/${rel}`);
    after = after.replace(CSS_URL_RE, (match, open, target, close) => {
      const absolute = posix.normalize(posix.join(dir, target));
      const next = LOOKUP.get(absolute);
      if (!next) {
        unmapped.set(absolute, (unmapped.get(absolute) || 0) + 1);
        return match;
      }
      hits += 1;
      cssResolved += 1;
      return `url(${open}${next}${close})`;
    });
  }

  if (!hits) continue;
  filesChanged += 1;
  replacements += hits;
  if (apply) await writeFile(file, after, "utf8");
  else if (filesChanged <= 3) console.log(`  ${rel}: ${hits}`);
}

console.log(
  `${apply ? "rewrote" : "would rewrite"} ${replacements} references in ${filesChanged} files` +
    (cssResolved ? ` (${cssResolved} resolved from relative url() in stylesheets)` : ""),
);

if (unmapped.size) {
  const total = [...unmapped.values()].reduce((a, b) => a + b, 0);
  console.log(`left alone: ${unmapped.size} paths with no object (${total} occurrences)`);
  [...unmapped.keys()].slice(0, 12).forEach((path) => console.log(`   ${path}`));
}
if (!apply) console.log("dry run: nothing written");
