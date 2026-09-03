/**
 * Applies the budget-picker change to the two places on disk.
 *
 * What it changes and why is in scripts/lib/calculator-budget-transform.mjs,
 * which holds the transform itself. This is the pass over:
 *
 *   - site-public/**\/*.html, the originals build/verify-*-render.py compares
 *     rendered pages against, and what a managed page falls back to when its
 *     shell is missing;
 *   - worker/db/page-templates.generated.ts, the shells the home page and every
 *     venue page are rebuilt from.
 *
 * The rows already in the database are a separate pass --
 * scripts/migrate-stored-pages.mjs -- because a deploy replaces the code and
 * leaves those rows exactly as they were.
 *
 *   node scripts/apply-calculator-budget.mjs --check   report, change nothing
 *   node scripts/apply-calculator-budget.mjs --apply
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { BUDGET_MARKER, transform } from "./lib/calculator-budget-transform.mjs";

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
  if (!BUDGET_MARKER.test(html)) continue;
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
    if (!BUDGET_MARKER.test(html)) return whole;
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
}

console.log(`${apply ? "Rewrote" : "Would rewrite"} ${changed.length} file(s).`);
for (const file of changed.slice(0, 8)) console.log(`  ${file}`);
if (changed.length > 8) console.log(`  ... and ${changed.length - 8} more`);
