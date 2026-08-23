/**
 * Takes the retired cities out of the two places on disk that name them.
 *
 * Which cities and what changes is in scripts/lib/retired-cities.mjs. This is
 * the disk pass:
 *
 *   - site-public/**\/*.html, the originals build/verify-*-render.py compares
 *     rendered pages against, and the markup a page falls back to when the
 *     database cannot answer;
 *   - worker/db/page-templates.generated.ts, the shells the home page and every
 *     venue page are rebuilt from.
 *
 * It also deletes each retired city's own directory. Leaving those in place
 * would keep the pages live: /destination-wedding/... is rewritten to the
 * function first, but a path the database no longer owns falls through to the
 * static file.
 *
 * The rows already in the database are a separate pass --
 * scripts/retire-cities-db.mjs -- because a deploy does not touch them.
 *
 *   node scripts/retire-cities.mjs --check   report, change nothing
 *   node scripts/retire-cities.mjs --apply
 */
import { readFileSync, writeFileSync, readdirSync, statSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  RETIRED_CITIES,
  RETIRED_CITY_MARKER,
  findLeftovers,
  transform,
} from "./lib/retired-cities.mjs";

const apply = process.argv.includes("--apply");
if (!apply && !process.argv.includes("--check")) {
  console.error("Pass --check or --apply.");
  process.exit(1);
}

let failures = 0;
const changed = [];
// Everything is transformed in memory first: a partial write, with some copies
// converted and some not, is exactly the drift this script exists to prevent.
const pending = new Map();

function run(html, where) {
  const result = transform(html);
  for (const problem of result.problems) {
    console.error(`  ! ${where}: ${problem}`);
    failures += 1;
  }
  for (const leftover of findLeftovers(result.html)) {
    console.error(`  ! ${where}: ${leftover} survived the transform`);
    failures += 1;
  }
  return result;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (entry.endsWith(".html")) out.push(path);
  }
  return out;
}

/** The retired cities' own pages, which go rather than get transformed. */
const doomed = RETIRED_CITIES.map((city) => join("site-public", "destination-wedding", city.slug))
  .filter((dir) => existsSync(dir));

for (const file of walk("site-public")) {
  if (doomed.some((dir) => file.startsWith(`${dir}\\`) || file.startsWith(`${dir}/`))) continue;
  const html = readFileSync(file, "utf8");
  if (!RETIRED_CITY_MARKER.test(html)) continue;
  const result = run(html, file);
  if (!result.changed) continue;
  changed.push(file);
  pending.set(file, result.html);
}

const TEMPLATES = "worker/db/page-templates.generated.ts";
{
  const source = readFileSync(TEMPLATES, "utf8");
  let shell = 0;

  // Each shell is one `html: "..."` JSON string literal on its own line.
  const out = source.replace(/^(\s*html: )(".*")(,)$/gm, (whole, prefix, literal, suffix) => {
    const html = JSON.parse(literal);
    shell += 1;
    if (!RETIRED_CITY_MARKER.test(html)) return whole;
    const result = run(html, `${TEMPLATES} shell #${shell}`);
    if (!result.changed) return whole;
    return `${prefix}${JSON.stringify(result.html)}${suffix}`;
  });

  if (out !== source) {
    changed.push(TEMPLATES);
    pending.set(TEMPLATES, out);
  }
}

if (failures) {
  console.error(`\n${failures} replacement(s) did not match as expected. Nothing was written.`);
  process.exit(1);
}

if (apply) {
  for (const [file, contents] of pending) writeFileSync(file, contents);
  for (const dir of doomed) rmSync(dir, { recursive: true, force: true });
}

console.log(`${apply ? "Rewrote" : "Would rewrite"} ${changed.length} file(s).`);
for (const file of changed.slice(0, 8)) console.log(`  ${file}`);
if (changed.length > 8) console.log(`  ... and ${changed.length - 8} more`);
console.log(`${apply ? "Deleted" : "Would delete"} ${doomed.length} retired city directory(ies).`);
for (const dir of doomed) console.log(`  ${dir}`);
