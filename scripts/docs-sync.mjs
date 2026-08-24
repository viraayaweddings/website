#!/usr/bin/env node
/**
 * Documentation synchronization orchestrator.
 *
 * 1. Regenerates code inventory from the codebase
 * 2. Updates manifest.json with newly discovered entities
 * 3. Updates META.md timestamps and sync metadata
 * 4. Runs validation and prints sync status
 *
 * Run via: npm run docs:sync
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");
const MANIFEST_PATH = join(ROOT, "docs", "manifest.json");
const META_PATH = join(ROOT, "docs", "META.md");
const INVENTORY_PATH = join(ROOT, "docs", "generated", "code-inventory.json");

/**
 * The one place the documentation version is set.
 *
 * It was hardcoded here as 1.0.0 while docs/README.md carried 1.1.0 in its own
 * table, so the two disagreed and neither moved. README now points at META.md
 * instead of restating it.
 */
const DOCS_VERSION = "1.2.0";

function run(cmd) {
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

/** Every markdown file under docs/, concatenated. Mirrors docs-validate.mjs. */
function docsCorpus() {
  const files = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name !== "generated") walk(full);
      } else if (name.endsWith(".md")) files.push(full);
    }
  })(join(ROOT, "docs"));
  return files.map((f) => readFileSync(f, "utf8")).join("\n");
}

console.log("Step 1/4: Generating code inventory...");
run("node scripts/docs-inventory.mjs");

const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8"));

console.log("\nStep 2/4: Updating manifest...");
const manifest = existsSync(MANIFEST_PATH)
  ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
  : { version: 1, documented: {} };

manifest.lastUpdated = new Date().toISOString();
manifest.lastAuditedCommit = inventory.gitCommit;
manifest.projectVersion = inventory.projectVersion;

const sections = {
  routes: inventory.routes.map((r) => r.route),
  serverActions: inventory.serverActions.map((a) => a.name),
  dbTables: inventory.dbTables.map((t) => t.tableName),
  workerEndpoints: inventory.workerEndpoints,
  adminComponents: inventory.adminComponents.map((f) => f.replace(/^app\/admin\/_components\//, "")),
  pageTypePatterns: (inventory.pageTypePatterns || []).map((p) => p.pattern),
  publicForms: (inventory.publicForms || []).map((f) => f.id),
  publicJsFiles: (inventory.publicJsFiles || []).map((f) => f.replace(/^site-public\/js\//, "")),
};

/**
 * Static routes are left out of the manifest on purpose.
 *
 * They used to go in as `slice(0, 50)`, which meant `undocumentedCounts` read
 * "staticSiteRoutes: 31" -- 31 of an arbitrary 50-row sample, not of the 292
 * pages, and indistinguishable from "31 pages are undocumented". Nobody
 * documents 292 cloned pages one by one, and validation never required it: it
 * checks a handful of key routes and the page-type patterns instead. The full
 * list is in docs/generated/code-inventory.json under `staticSiteRoutes`.
 */

/**
 * Records only the entities the documentation actually mentions.
 *
 * This used to be `existing.add(v)` for every value the inventory scan found,
 * which made `documented` a copy of what exists rather than a record of what is
 * written down. Validation then read that list as proof, so syncing a newly
 * added route marked it documented without a word being written about it, and
 * the suite reported PASS through 51 commits of undocumented code.
 *
 * The corpus is now the sole authority in both scripts. Anything the docs do not
 * mention is left out here and reported as an issue by `docs:validate`, so the
 * two can no longer disagree.
 */
const corpus = docsCorpus();
const undocumented = {};
for (const [key, values] of Object.entries(sections)) {
  const present = values.filter((v) => corpus.includes(v));
  manifest.documented[key] = [...new Set(present)].sort();
  const absent = values.filter((v) => !corpus.includes(v));
  if (absent.length) undocumented[key] = absent.length;
}
manifest.undocumentedCounts = undocumented;

writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

console.log("\nStep 3/4: Updating META.md...");
updateMeta(inventory);

console.log("\nStep 4/4: Running validation...");
let status = "PASS";
try {
  run("node scripts/docs-validate.mjs");
} catch {
  status = "FAIL";
}

console.log(`\nDocumentation sync complete. Validation: ${status}`);
if (status === "FAIL") {
  console.log("Fix missing documentation entries, then re-run: npm run docs:sync");
  process.exit(1);
}

/**
 * Carries the existing change-history rows forward.
 *
 * `updateMeta` rewrites META.md wholesale, and it used to emit one hardcoded row
 * -- "Initial master documentation system" -- stamped with the current date. So
 * every sync erased the history and re-dated the same entry as if today were the
 * first audit. That is why 51 commits of documented change left a single line
 * behind. Rows are parsed back out and kept; a new one is added only when the
 * commit is not already recorded.
 */
function existingHistoryRows() {
  if (!existsSync(META_PATH)) return [];
  const meta = readFileSync(META_PATH, "utf8");
  const table = meta.split("## Change History")[1];
  if (!table) return [];
  return table
    .split("\n")
    .filter((line) => /^\|/.test(line) && !/^\|\s*[-\s|]+\|$/.test(line) && !/\|\s*Date\s*\|/.test(line))
    .map((line) => line.trimEnd());
}

function updateMeta(inventory) {
  const now = new Date().toISOString();
  const content = `# Documentation Metadata

| Field | Value |
| ----- | ----- |
| Documentation version | ${DOCS_VERSION} |
| Project version | ${inventory.projectVersion} |
| Last updated | ${now} |
| Last audited commit | \`${inventory.gitCommitShort}\` (\`${inventory.gitCommit}\`) |
| Last sync run | ${now} |
| Synchronization status | Run \`npm run docs:validate\` for current status |
| Coverage scope | Admin panel (complete), public website (complete), worker/API/DB (complete) |

## Inventory Counts (auto-generated)

| Category | Count |
| -------- | ----- |
| App routes | ${inventory.counts.routes} |
| Server actions | ${inventory.counts.serverActions} |
| Database tables | ${inventory.counts.dbTables} |
| Worker endpoint patterns | ${inventory.counts.workerEndpoints} |
| Admin components | ${inventory.counts.adminComponents} |
| Admin source files | ${inventory.counts.adminFiles} |
| Static site pages | ${inventory.counts.staticSiteRoutes || 0} |
| Public JS files | ${inventory.counts.publicJsFiles || 0} |
| Page type patterns | ${inventory.counts.pageTypePatterns || 0} |
| Public forms | ${inventory.counts.publicForms || 0} |
| Worker site modules | ${inventory.counts.workerSiteFiles || 0} |
| Worker modules (all) | ${inventory.counts.workerFiles || 0} |
| Database columns | ${inventory.counts.dbColumns || 0} |
| Audit actions | ${inventory.counts.auditActions || 0} |
| npm scripts | ${inventory.counts.npmScripts || 0} |
| Environment variables | ${inventory.counts.envVars || 0} |
| Enumerations | ${inventory.counts.enums || 0} |
| Exported worker symbols | ${inventory.counts.workerExports || 0} |

## Change History

| Date | Code version | Documentation change | Reason |
| ---- | ------------ | -------------------- | ------ |
${historyRows(inventory, now).join("\n")}
`;
  writeFileSync(META_PATH, content);
}

function historyRows(inventory, now) {
  const rows = existingHistoryRows();
  const already = rows.some((row) => row.includes(inventory.gitCommitShort));
  if (already) return rows;
  const row = `| ${now.slice(0, 10)} | \`${inventory.gitCommitShort}\` | Inventory re-synced | \`npm run docs:sync\` |`;
  return [...rows, row];
}
