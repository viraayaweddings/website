/**
 * Applies the packages unpublish to the two places on disk.
 *
 * What it changes and why is in scripts/lib/unpublish-packages-transform.mjs.
 * This is the pass over site-public/**\/*.html and
 * worker/db/page-templates.generated.ts; the rows already in the database are a
 * separate pass, scripts/migrate-stored-pages.mjs, because a deploy replaces
 * the code and leaves those rows as they were.
 *
 *   node scripts/unpublish-packages.mjs --check   report, change nothing
 *   node scripts/unpublish-packages.mjs --apply
 *
 * Afterwards, regenerate the route inventory so the pages leave the sitemap:
 *
 *   npm run sitemap:generate
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { isPackagesPath, PACKAGES_MARKER, transform } from "./lib/unpublish-packages-transform.mjs";

const apply = process.argv.includes("--apply");
if (!apply && !process.argv.includes("--check")) {
  console.error("Pass --check or --apply.");
  process.exit(1);
}

let failures = 0;
const changed = [];
// Transformed in memory first: a partial write leaves some pages linking to a
// page the rest of the site has stopped linking to, which is the drift this
// script exists to prevent.
const pending = new Map();

function run(html, where, isPackagesPage) {
  const result = transform(html, isPackagesPage);
  for (const problem of result.problems) {
    console.error(`  ! ${where}: ${problem}`);
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

for (const file of walk("site-public")) {
  const html = readFileSync(file, "utf8");
  const isPackagesPage = isPackagesPath(file);
  if (!PACKAGES_MARKER.test(html) && !isPackagesPage) continue;
  const result = run(html, file, isPackagesPage);
  if (!result.changed) continue;
  changed.push(file);
  pending.set(file, result.html);
}

const TEMPLATES = "worker/db/page-templates.generated.ts";
{
  const source = readFileSync(TEMPLATES, "utf8");
  let shell = 0;

  // Each shell is one `html: "..."` JSON string literal on its own line. None
  // of them IS a packages page -- those are whole pages in static_pages -- so
  // the shells only ever lose their menu and footer links.
  const out = source.replace(/^(\s*html: )(".*")(,)$/gm, (whole, prefix, literal, suffix) => {
    const html = JSON.parse(literal);
    shell += 1;
    if (!PACKAGES_MARKER.test(html)) return whole;
    const result = run(html, `${TEMPLATES} shell #${shell}`, false);
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
}

console.log(`${apply ? "Rewrote" : "Would rewrite"} ${changed.length} file(s).`);
for (const file of changed.slice(0, 8)) console.log(`  ${file}`);
if (changed.length > 8) console.log(`  ... and ${changed.length - 8} more`);
if (apply) console.log("\nNow run: npm run sitemap:generate");
