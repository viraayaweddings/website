#!/usr/bin/env node
/**
 * Validates documentation synchronization against the code inventory.
 * Exit code 0 = PASS, 1 = FAIL.
 *
 * Run via: npm run docs:validate
 */
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";

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

if (!existsSync(INVENTORY)) {
  console.error("Missing code inventory. Run: npm run docs:inventory");
  process.exit(1);
}

const inventory = readJson(INVENTORY);
const manifest = existsSync(MANIFEST) ? readJson(MANIFEST) : { documented: {} };
const text = corpus();

function mustAppear(label, items, keyFn) {
  const missing = [];
  for (const item of items) {
    const key = keyFn(item);
    const documented = manifest.documented?.[label]?.includes(key);
    const inText = text.includes(key);
    if (!inText && !documented) missing.push(key);
    else if (!inText && documented) warnings.push(`${label} "${key}" in manifest but not found in docs text`);
    else if (inText && !documented) warnings.push(`${label} "${key}" in docs but not in manifest (run docs:sync)`);
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
  "routes",
  inventory.routes,
  (r) => r.route,
);
for (const r of routeMissing) issues.push(`Undocumented route: ${r}`);

// Server actions
const actionMissing = mustAppear(
  "serverActions",
  inventory.serverActions,
  (a) => a.name,
);
for (const a of actionMissing) issues.push(`Undocumented server action: ${a}`);

// DB tables
const tableMissing = mustAppear(
  "dbTables",
  inventory.dbTables,
  (t) => t.tableName,
);
for (const t of tableMissing) issues.push(`Undocumented database table: ${t}`);

// Website page type patterns
const patternMissing = mustAppear(
  "pageTypePatterns",
  inventory.pageTypePatterns || [],
  (p) => p.pattern,
);
for (const p of patternMissing) issues.push(`Undocumented page type pattern: ${p}`);

// Public forms
const formMissing = mustAppear(
  "publicForms",
  inventory.publicForms || [],
  (f) => f.id,
);
for (const f of formMissing) issues.push(`Undocumented public form: ${f}`);

// Public JS files
const jsMissing = mustAppear(
  "publicJsFiles",
  inventory.publicJsFiles || [],
  (f) => f.replace(/^site-public\/js\//, ""),
);
for (const f of jsMissing) issues.push(`Undocumented public JS file: ${f}`);

// Worker site files
for (const file of inventory.workerSiteFiles || []) {
  const basename = file.replace(/^worker\/site\//, "");
  if (!text.includes(file) && !text.includes(basename)) {
    warnings.push(`Worker site file not referenced in docs: ${file}`);
  }
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
  issues,
  warnings,
};

const reportPath = join(ROOT, "docs", "generated", "validation-report.json");
writeReport(reportPath, report);

console.log(`\nDocumentation Sync Status: ${report.status}`);
console.log(`Issues: ${issues.length}, Warnings: ${warnings.length}`);
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
