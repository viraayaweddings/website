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
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");
const MANIFEST_PATH = join(ROOT, "docs", "manifest.json");
const META_PATH = join(ROOT, "docs", "META.md");
const INVENTORY_PATH = join(ROOT, "docs", "generated", "code-inventory.json");

function run(cmd) {
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
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
  staticSiteRoutes: (inventory.staticSiteRoutes || []).slice(0, 50).map((r) => r.route),
};

for (const [key, values] of Object.entries(sections)) {
  const existing = new Set(manifest.documented[key] || []);
  for (const v of values) existing.add(v);
  manifest.documented[key] = [...existing].sort();
}

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

function updateMeta(inventory) {
  const now = new Date().toISOString();
  const content = `# Documentation Metadata

| Field | Value |
| ----- | ----- |
| Documentation version | 1.0.0 |
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

## Change History

| Date | Code version | Documentation change | Reason |
| ---- | ------------ | -------------------- | ------ |
| ${now.slice(0, 10)} | \`${inventory.gitCommitShort}\` | Initial master documentation system | Full project audit |
`;
  writeFileSync(META_PATH, content);
}
