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
| App routes | Files named exactly `page.tsx` or `route.ts`, excluding any path segment starting with `_`. Matching on `endsWith("route.ts")` also caught `app/lead-route.ts` and `app/_lib/deprecated-lead-route.ts` — helper modules that were counted as routes and demanded of the docs |
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

| Check | Method | Severity |
| --- | --- | --- |
| Required doc files exist | File existence | Issue |
| Routes documented | Route path appears in the docs corpus, matched on word boundaries | Issue |
| Server actions documented | Action name, same matching | Issue |
| DB tables documented | Table name, same matching | Issue |
| **DB columns documented** | Column name, checked against `05-database.md` only | Issue |
| **Worker modules documented** | Every `.ts` under `worker/` — path or basename | Issue |
| **Audit actions documented** | Every string a `recordAudit` call writes | Issue |
| **npm scripts documented** | Every key in `package.json` `scripts` | Issue |
| **Environment variables documented** | Every `process.env.X` the code reads | Issue |
| **Enums documented** | Enum name, and every value except `CALCULATOR_MONTHS` | Issue |
| Page type patterns documented | Pattern string | Issue |
| Public forms / JS files documented | Form id / filename | Issue |
| Key static routes documented | A fixed sample (`/`, `/contact/`, …) | Issue |
| Admin files referenced | Path or basename mentioned | Warning |
| Commit drift | Manifest commit ≠ HEAD | Warning |
| Exported symbols named | Reported as a coverage figure, not per symbol | Info |

### Widening the net (2026-08-24)

The six checks in **bold** were added because the original set left most of the
server unchecked, and "the docs cover the codebase" could not be verified:

- **32 of the 65 modules under `worker/` were invisible.** The scan looked at
  `worker/site` alone, so the whole of `worker/admin` — sessions, passwords,
  rate limiting, media, rich text — and all of `worker/db` were never asked
  about.
- **A documented table could hide undocumented columns.** Only table names were
  checked. That is how `media.width`/`height` went unmentioned for a release,
  and how the timestamp columns stayed described as `INTEGER ms` — the
  pre-Postgres type — long after the migration. 30 columns across five tables
  were undocumented when the column check first ran.
- **The audit vocabulary, the npm scripts, the environment variables and the
  status enumerations were not checked at all.** The scripts include the eight
  the production deploy chain runs.

Column names are matched against `05-database.md` rather than the whole corpus:
`title`, `status` and `position` are ordinary words that would match almost any
sentence, so a site-wide search would pass for columns nothing describes.

Two deliberate exemptions, both stated in the code:

- `CALCULATOR_MONTHS` is checked by name only. Its values are the Gregorian
  calendar, and writing twelve month names into a table to satisfy a checker
  tells a reader nothing they do not know.
- Exported symbols are a coverage figure, not warnings. There are 279 and about
  three quarters are internal row and option types (`CityRow`, `PriceCell`,
  `LeadCsvOptions`). One warning each produced 214 lines nobody would action,
  and a warning channel that is always full stops being read. The requirement
  that matters — every module documented — is an issue.

**Output:** `docs/generated/validation-report.json`

### Two things this check used to get wrong

Both were fixed on 2026-08-24, after the suite reported PASS across 51 commits
that added nine routes, twenty-eight server actions and three tables.

**1. It read a stale inventory.** `docs:validate` loaded the committed
`code-inventory.json` as given. That file is a snapshot, and nothing forced it to
be current — it had drifted 51 commits, so CI was comparing the documentation
against code that no longer existed. Validation now **rescans first**, every
time; `--no-scan` opts out for the rare case of validating against a pinned
inventory.

**2. The manifest counted as proof.** `mustAppear` passed an entity that was
absent from every document as long as it appeared in `manifest.json`, demoting it
to a warning — and warnings are hidden without `--verbose`. But `docs:sync`
*wrote* that file from the inventory scan, so every newly discovered route,
action and table added itself to the list and thereby marked itself documented.
The prose is now the only evidence, in both scripts.

Matching is also anchored on word boundaries now. Half the table names are
ordinary English — `media`, `settings`, `hotels`, `users` — and a bare
`includes()` found them in any sentence that happened to use the word, so tables
no document described were passing.

---

## Manifest Registry

**File:** `docs/manifest.json`

A record of which entities the documentation **actually mentions** — not of what
exists. `docs:sync` writes it by intersecting the inventory with the docs corpus,
so an entity nothing describes is left out and reported in `undocumentedCounts`.

It is no longer consulted by validation at all; it is a report, not a waiver.
Before, `docs:sync` added every scanned entity here and validation read that as
proof, which is how undocumented code certified itself.

```json
{
  "version": 1,
  "lastUpdated": "ISO timestamp",
  "lastAuditedCommit": "git SHA",
  "documented": {
    "routes": ["/admin", "/admin/login", "..."],
    "serverActions": ["loginAction", "..."],
    "dbTables": ["users", "sessions", "..."],
    "workerEndpoints": ["/api/lead", "..."],
    "adminComponents": ["AdminShell.tsx", "..."]
  },
  "undocumentedCounts": {}
}
```

`undocumentedCounts` empty means every scanned entity is described somewhere.

Static routes are deliberately absent: nobody documents 292 cloned pages one by
one, and validation checks a sample of key routes plus the nine page-type
patterns instead. The full list lives in `code-inventory.json`.

`publicForms` holds 7 placements across 6 distinct ids — `contactForm` appears on
both `/contact/` and `/blogs/{slug}/`. The manifest lists the 6 ids; the count is
of placements.

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

## CI Integration

**Already configured.** `.github/workflows/ci.yml` runs on every push to `main`
and on every pull request:

```yaml
- run: npm run lint
- run: npm run docs:validate
- run: npm run test
- run: npm run build
```

`docs:validate` fails the build on any issue, which is what makes the
documentation a gate rather than a suggestion. It was passing vacuously until the
stale-inventory fix above — the step ran, and validated against a snapshot.

`npm run docs:sync` is the local command: it rescans, rewrites the manifest and
META.md, then validates. CI only validates, because sync writes files.

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
