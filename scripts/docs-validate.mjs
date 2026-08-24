#!/usr/bin/env node
/**
 * Validates documentation synchronization against the code inventory.
 * Exit code 0 = PASS, 1 = FAIL.
 *
 * Run via: npm run docs:validate
 */
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");
const INVENTORY = join(ROOT, "docs", "generated", "code-inventory.json");
const MANIFEST = join(ROOT, "docs", "manifest.json");
const DOCS_DIR = join(ROOT, "docs");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readDocFiles() {
  const files = [];
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name === "generated") continue;
        walk(full);
      } else if (name.endsWith(".md")) files.push(full);
    }
  }
  walk(DOCS_DIR);
  return files;
}

function corpus() {
  return readDocFiles()
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");
}

const issues = [];
const warnings = [];
/** Figures reported for information, not as a task list. */
const coverage = {};

/**
 * Rescans the codebase before validating, rather than reading the committed
 * `code-inventory.json` as given.
 *
 * That file is a snapshot, and validation used to trust it. When it went stale
 * the check kept passing -- it was comparing the documentation against whatever
 * the code looked like the last time somebody remembered to regenerate it. It
 * had drifted 51 commits, so `npm run docs:validate` in CI was reporting on code
 * that no longer existed: nine routes, twenty-eight server actions and three
 * tables were invisible to it. Recomputing costs about a second and removes the
 * whole class of failure, along with any need for the developer to remember.
 *
 * `--no-scan` reuses the existing file, for the rare case of validating docs
 * against a deliberately pinned inventory.
 */
if (!process.argv.includes("--no-scan")) {
  execSync("node scripts/docs-inventory.mjs", { cwd: ROOT, stdio: "pipe" });
}

if (!existsSync(INVENTORY)) {
  console.error("Missing code inventory. Run: npm run docs:inventory");
  process.exit(1);
}

const inventory = readJson(INVENTORY);
const manifest = existsSync(MANIFEST) ? readJson(MANIFEST) : { documented: {} };
const text = corpus();

/**
 * True when the docs actually say `key` somewhere.
 *
 * Matched on word boundaries rather than as a bare substring. Half the table
 * names are ordinary English -- `media`, `settings`, `hotels`, `users` -- and a
 * plain `includes` finds those in any sentence that happens to use the word, so
 * the check passed for tables no document described. Route and file keys carry
 * `/` and `.`, which are not word characters, so they are anchored on the
 * surrounding punctuation instead.
 */
function saysAnythingAbout(key, corpus = text) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const left = /^\w/.test(key) ? "(?<![\\w-])" : "(?<![\\w/.-])";
  const right = /\w$/.test(key) ? "(?![\\w-])" : "(?![\\w/.-])";
  return new RegExp(`${left}${escaped}${right}`).test(corpus);
}

/**
 * Reports every inventory entity the documentation does not mention.
 *
 * `manifest.documented` is deliberately NOT consulted. It used to count as
 * proof: an entity listed there but absent from every document was downgraded
 * from an issue to a warning, and warnings are hidden unless `--verbose`. But
 * `docs:sync` writes that list from the inventory scan -- so every newly
 * discovered route, action and table was added to it automatically, which
 * turned "this exists" into "this is documented" and reported PASS. 51 commits
 * of new code passed that way. The docs corpus is now the only evidence.
 */
function mustAppear(items, keyFn) {
  const missing = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!saysAnythingAbout(key)) missing.push(key);
  }
  return missing;
}

// Required doc files
const requiredDocs = [
  "docs/README.md",
  "docs/META.md",
  "docs/01-architecture.md",
  "docs/02-admin/README.md",
  "docs/03-routes.md",
  "docs/04-api.md",
  "docs/05-database.md",
  "docs/06-auth.md",
  "docs/07-workflows.md",
  "docs/08-integrations.md",
  "docs/09-configuration.md",
  "docs/10-components.md",
  "docs/11-file-index.md",
  "docs/15-ai-agent-instructions.md",
  "docs/16-sync-system.md",
  "docs/AUDIT-FINDINGS.md",
  "docs/WEBSITE-AUDIT-FINDINGS.md",
  "docs/public-site/README.md",
  "docs/public-site/routes.md",
  "docs/public-site/forms.md",
  "docs/public-site/rendering.md",
  "docs/public-site/website-admin-map.md",
  "docs/public-site/javascript.md",
  "docs/public-site/seo.md",
];

for (const doc of requiredDocs) {
  if (!existsSync(join(ROOT, doc))) issues.push(`Missing required doc: ${doc}`);
}

// Routes
const routeMissing = mustAppear(
  inventory.routes,
  (r) => r.route,
);
for (const r of routeMissing) issues.push(`Undocumented route: ${r}`);

// Server actions
const actionMissing = mustAppear(
  inventory.serverActions,
  (a) => a.name,
);
for (const a of actionMissing) issues.push(`Undocumented server action: ${a}`);

// DB tables
const tableMissing = mustAppear(
  inventory.dbTables,
  (t) => t.tableName,
);
for (const t of tableMissing) issues.push(`Undocumented database table: ${t}`);

// Website page type patterns
const patternMissing = mustAppear(
  inventory.pageTypePatterns || [],
  (p) => p.pattern,
);
for (const p of patternMissing) issues.push(`Undocumented page type pattern: ${p}`);

// Public forms
const formMissing = mustAppear(
  inventory.publicForms || [],
  (f) => f.id,
);
for (const f of formMissing) issues.push(`Undocumented public form: ${f}`);

// Public JS files
const jsMissing = mustAppear(
  inventory.publicJsFiles || [],
  (f) => f.replace(/^site-public\/js\//, ""),
);
for (const f of jsMissing) issues.push(`Undocumented public JS file: ${f}`);

/*
 * Everything below was added on 2026-08-24 to make "the docs cover the
 * codebase" a checkable claim rather than an assertion.
 *
 * Validation used to look at routes, server actions, table names, page
 * patterns, forms and public JS -- and nothing else. So 32 of the 65 modules
 * under `worker/` were invisible to it, including the whole of `worker/admin`
 * and `worker/db`; a documented table could hide undocumented columns, which is
 * how `media.width`/`height` went unmentioned and the timestamp columns stayed
 * described as `INTEGER ms` after the move to Postgres; and the audit
 * vocabulary, the npm scripts, the environment variables and the status
 * enumerations were never checked at all.
 */

// Every server module, not just worker/site
const workerFileMissing = (inventory.workerFiles || []).filter((file) => {
  const basename = file.split("/").pop();
  return !saysAnythingAbout(file) && !saysAnythingAbout(basename);
});
for (const f of workerFileMissing) issues.push(`Undocumented worker module: ${f}`);

// Database columns, checked against the schema reference rather than the corpus.
// A column name on its own is far too common a word to look for site-wide --
// `title`, `status` and `position` would match any sentence.
const dbDoc = existsSync(join(DOCS_DIR, "05-database.md"))
  ? readFileSync(join(DOCS_DIR, "05-database.md"), "utf8")
  : "";
for (const column of inventory.dbColumns || []) {
  if (!saysAnythingAbout(column.column, dbDoc)) {
    issues.push(`Undocumented column: ${column.table}.${column.column}`);
  }
}

// The audit vocabulary: what /admin/activity prints
const auditMissing = mustAppear(inventory.auditActions || [], (a) => a);
for (const a of auditMissing) issues.push(`Undocumented audit action: ${a}`);

// npm scripts — the deploy chain runs eight of them
const scriptMissing = (inventory.npmScripts || []).filter(
  (name) => !saysAnythingAbout(name) && !text.includes(`npm run ${name}`),
);
for (const s of scriptMissing) issues.push(`Undocumented npm script: ${s}`);

// Environment variables the code reads
const envMissing = mustAppear(inventory.envVars || [], (v) => v);
for (const v of envMissing) issues.push(`Undocumented environment variable: ${v}`);

/*
 * Status enumerations, by name and by value.
 *
 * `CALCULATOR_MONTHS` is checked by name only. Its values are the Gregorian
 * calendar, not project vocabulary, and writing twelve month names into a table
 * to satisfy a checker would add nothing a reader does not already know -- the
 * schema reference says "One of `CALCULATOR_MONTHS` (`January`…`December`)",
 * which is complete. Every other enum holds domain terms an editor can be shown
 * without explanation, so those are checked value by value.
 */
const SELF_EVIDENT_ENUMS = new Set(["CALCULATOR_MONTHS"]);
for (const group of inventory.enums || []) {
  if (!saysAnythingAbout(group.name)) issues.push(`Undocumented enum: ${group.name}`);
  if (SELF_EVIDENT_ENUMS.has(group.name)) continue;
  for (const value of group.values) {
    if (!saysAnythingAbout(value)) issues.push(`Undocumented ${group.name} value: ${value}`);
  }
}

/*
 * Exported symbols are reported as one line, not one warning each.
 *
 * There are 279 of them and roughly three quarters are internal row and option
 * types -- `CityRow`, `PriceCell`, `LeadCsvOptions` -- whose names carry nothing
 * a reader of the documentation needs. Emitting a warning per symbol produced
 * 214 lines that nobody would ever action, which is worse than not checking:
 * a warning channel that is always full stops being read, and the handful of
 * genuine gaps in it become invisible.
 *
 * The requirement that matters is enforced above as an issue: every module under
 * `worker/` must be documented. This line is a coverage figure for whoever is
 * looking, not a task list.
 */
const exportsNamed = (inventory.workerExports || []).filter((item) => saysAnythingAbout(item.name)).length;
const exportsTotal = (inventory.workerExports || []).length;
if (exportsTotal) {
  coverage.workerExports = `${exportsNamed}/${exportsTotal} exported symbols named in the docs`;
}

// Static site route sample check — verify key standalone routes documented
const keyStaticRoutes = [
  "/",
  "/contact/",
  "/hotel-cost-calculator/",
  "/compare-hotel/",
  "/wedding-consultation/",
  "/blogs/",
];
for (const route of keyStaticRoutes) {
  if (!text.includes(route)) issues.push(`Undocumented key static route: ${route}`);
}

// Admin files — warn if not referenced
for (const file of inventory.adminFiles) {
  const normalized = file.replace(/\\/g, "/");
  const basename = normalized.split("/").pop();
  if (!text.includes(normalized) && !text.includes(basename)) {
    warnings.push(`Admin file not referenced in docs: ${file}`);
  }
}

// Manifest commit drift
if (manifest.lastAuditedCommit && manifest.lastAuditedCommit !== inventory.gitCommit) {
  warnings.push(
    `Manifest audited commit (${manifest.lastAuditedCommit.slice(0, 7)}) differs from HEAD (${inventory.gitCommitShort})`,
  );
}

const report = {
  validatedAt: new Date().toISOString(),
  gitCommit: inventory.gitCommit,
  gitCommitShort: inventory.gitCommitShort,
  status: issues.length === 0 ? "PASS" : "FAIL",
  inventoryCounts: inventory.counts,
  issueCount: issues.length,
  warningCount: warnings.length,
  coverage,
  issues,
  warnings,
};

const reportPath = join(ROOT, "docs", "generated", "validation-report.json");
writeReport(reportPath, report);

console.log(`\nDocumentation Sync Status: ${report.status}`);
console.log(`Issues: ${issues.length}, Warnings: ${warnings.length}`);
for (const line of Object.values(coverage)) console.log(`Coverage: ${line}`);
if (issues.length) {
  console.log("\nIssues:");
  for (const i of issues.slice(0, 30)) console.log(`  - ${i}`);
  if (issues.length > 30) console.log(`  ... and ${issues.length - 30} more`);
}
if (warnings.length && process.argv.includes("--verbose")) {
  console.log("\nWarnings:");
  for (const w of warnings.slice(0, 20)) console.log(`  - ${w}`);
}

process.exit(issues.length ? 1 : 0);

function writeReport(path, data) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}
