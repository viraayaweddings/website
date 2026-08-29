# Documentation Metadata

| Field | Value |
| ----- | ----- |
| Documentation version | 1.2.0 |
| Project version | 0.1.0 |
| Last updated | 2026-08-29T15:24:07.430Z |
| Last audited commit | `ff22106c` (`ff22106cb7918db1276eee104e24b519ba59bdf6`) |
| Last sync run | 2026-08-29T15:24:07.430Z |
| Synchronization status | Run `npm run docs:validate` for current status |
| Coverage scope | Admin panel (complete), public website (complete), worker/API/DB (complete) |

## Inventory Counts (auto-generated)

| Category | Count |
| -------- | ----- |
| App routes | 55 |
| Server actions | 67 |
| Database tables | 23 |
| Worker endpoint patterns | 30 |
| Admin components | 21 |
| Admin source files | 89 |
| Static site pages | 292 |
| Public JS files | 7 |
| Page type patterns | 9 |
| Public forms | 7 |
| Worker site modules | 37 |
| Worker modules (all) | 75 |
| Database columns | 199 |
| Audit actions | 71 |
| npm scripts | 32 |
| Environment variables | 19 |
| Enumerations | 5 |
| Exported worker symbols | 301 |

## Change History

| Date | Code version | Documentation change | Reason |
| ---- | ------------ | -------------------- | ------ |
| 2026-08-22 | `1190afd9` | Initial master documentation system | Full project audit |
| 2026-08-24 | `b5e399d9` | Full documentation audit: 28 server actions, 8 tables, 12 routes and 10 worker modules documented; stale claims corrected across 18 files; validator and sync hardened | Docs had drifted 51 commits while reporting PASS |
| 2026-08-24 | `b5e399d9` | Coverage widened to every worker module, database column, audit action, npm script, env var and enum — 198 columns and 30 previously undocumented fields written up; 6 new checks enforce it | Half the server and all column-level detail were outside what validation could see |
| 2026-08-29 | `ff22106c` | Inventory re-synced | `npm run docs:sync` |
