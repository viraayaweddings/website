# Documentation Sync System

How documentation stays synchronized with the codebase.

---

## Architecture

```
Code Change
  ↓
npm run docs:sync (or git pre-commit hook)
  ↓
Step 1: docs-inventory.mjs → scans codebase → code-inventory.json
  ↓
Step 2: docs-sync.mjs → updates manifest.json + META.md
  ↓
Step 3: docs-validate.mjs → compares inventory vs docs text
  ↓
Documentation Sync Status: PASS / FAIL
```

---

## Commands

| Command | Purpose |
| --- | --- |
| `npm run docs:inventory` | Scan codebase, write `docs/generated/code-inventory.json` |
| `npm run docs:validate` | Compare code vs docs; exit 0=PASS, 1=FAIL |
| `npm run docs:sync` | Full pipeline: inventory → manifest → META → validate |

---

## What Gets Scanned

**Script:** `scripts/docs-inventory.mjs`

| Category | Detection method |
| --- | --- |
| App routes | Files matching `app/**/page.tsx` and `app/**/route.ts` |
| Static site routes | All `site-public/**/index.html` paths |
| Server actions | `export async function` in `app/**/actions.ts` |
| DB tables | `pgTable("name")` in `worker/db/schema.ts` |
| Server endpoints | Path patterns across the catch-all and `worker/site/*-routes.ts` |
| Admin components | Files in `app/admin/_components/` |
| Admin files | All `.ts`/`.tsx` in `app/admin/` |
| Public JS files | Files in `site-public/js/` |
| Page type patterns | Defined patterns (venue, blog, city, etc.) |
| Public forms | Known form IDs and endpoints |
| Worker site modules | Files in `worker/site/` |

**Output:** `docs/generated/code-inventory.json`

---

## What Gets Validated

**Script:** `scripts/docs-validate.mjs`

| Check | Method |
| --- | --- |
| Required doc files exist | File existence check |
| Routes documented | Route path appears in docs markdown corpus |
| Server actions documented | Action name appears in docs text |
| DB tables documented | Table name appears in docs text |
| Admin files referenced | Warning if admin file not mentioned |
| Commit drift | Warning if manifest commit ≠ HEAD |

**Output:** `docs/generated/validation-report.json`

---

## Manifest Registry

**File:** `docs/manifest.json`

Machine-readable registry of documented entities. Updated by `docs:sync` to include newly discovered items from inventory scan.

```json
{
  "version": 1,
  "lastUpdated": "ISO timestamp",
  "lastAuditedCommit": "git SHA",
  "documented": {
    "routes": ["/admin", "/admin/login", ...],
    "serverActions": ["loginAction", ...],
    "dbTables": ["users", "sessions", ...],
    "workerEndpoints": ["/api/lead", ...],
    "adminComponents": ["AdminShell.tsx", ...]
  }
}
```

---

## Metadata

**File:** `docs/META.md` (auto-updated by `docs:sync`)

Contains: documentation version, project version, last updated timestamp, last audited commit, inventory counts, change history table.

---

## Git Hook (Optional)

**File:** `.githooks/pre-commit`

Install:
```bash
git config core.hooksPath .githooks
```

Runs `docs:validate` before each commit. Blocks commit on FAIL.

Skip (not recommended): `git commit --no-verify`

---

## CI Integration (Not Yet Configured)

This project has no `.github/workflows/` CI. To enforce in CI, add:

```yaml
- run: npm run docs:sync
```

Recommended for pull requests touching `app/`, `worker/`, or `drizzle/`.

---

## Change Detection Logic

For each detected change, the system determines:

| Question | How answered |
| --- | --- |
| What changed? | Inventory scan diffs (manual comparison of inventory JSON) |
| Which module? | File path prefix (`app/admin/blogs/` → Articles module) |
| Which doc sections? | Mapping in [15-ai-agent-instructions.md](./15-ai-agent-instructions.md) checklist |
| Dependencies affected? | [13-change-impact.md](./13-change-impact.md) |
| Sync status? | `docs:validate` PASS/FAIL |

---

## Limitations

### What automation CAN do

- Detect new routes, actions, tables, components
- Verify entity names appear somewhere in documentation
- Track commit/version metadata
- Block commits (via hook) when validation fails
- Generate inventory counts for coverage reports

### What automation CANNOT do

- Write or update prose documentation automatically
- Detect behavioral/semantic changes to existing documented items
- Verify documentation accuracy against runtime behavior
- Full AI-powered documentation updates (not implemented)

**Manual documentation updates are required when code behavior changes.** The sync system ensures nothing is completely forgotten, not that documentation is perfectly accurate.

---

## Workflow for Developers

```
1. Make code change
2. Update relevant docs/*.md files
3. npm run docs:sync
4. Fix any validation failures
5. Commit (hook validates automatically if configured)
```

---

## Workflow for AI Agents

See [15-ai-agent-instructions.md](./15-ai-agent-instructions.md).

---

## Files in This System

| File | Role |
| --- | --- |
| `scripts/docs-inventory.mjs` | Code scanner |
| `scripts/docs-validate.mjs` | Validator |
| `scripts/docs-sync.mjs` | Orchestrator |
| `docs/manifest.json` | Entity registry |
| `docs/META.md` | Version metadata |
| `docs/generated/code-inventory.json` | Scan output |
| `docs/generated/validation-report.json` | Validation output |
| `.githooks/pre-commit` | Optional git hook |
