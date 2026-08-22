# Audit Findings Report

> **This document is separate from Master Documentation.**  
> It describes issues, risks, and recommendations — not how the system currently works.  
> **Status:** Admin and website audit items were addressed on 2026-08-21 (see git history). Remaining gaps are operational (formal WCAG audit, full storage recompression) documented in fix-status tables.

**Audit date:** 2026-08-21  
**Scope:** Full project discovery; exhaustive admin panel audit; database, worker, API, auth review

> **Historical record — written against the Cloudflare deployment.** References
> below to Workers, D1, the `ASSETS` binding or `worker/index.ts` describe the
> stack as it was when the audit ran. The findings and their fixes are still
> accurate; only the file and service names have moved. For how the system works
> now, start at [Architecture](./01-architecture.md).

---

## Fix status (admin panel)

| ID | Status |
| --- | --- |
| H1, S1 | Fixed — D1 `rate_limits` table + `worker/admin/rate-limit.ts` |
| H2 | Fixed — UI warning + CSV header row + response headers |
| M1, P1 | Fixed — paginated media library with search |
| M2 | Fixed — shared `app/admin/_lib/audit-labels.ts` |
| M3 | Fixed — update keeps existing status when invalid |
| M4, L4 | Fixed — create venue form parity with edit |
| M5 | Fixed — bulk actions verify IDs still exist |
| L1, S2 | Fixed — same-origin check on logout POST |
| L2 | Fixed — Toaster listens to `useSearchParams()` |
| L3 | Fixed — setup error codes mapped like login |
| S3 | Fixed — RichText hidden field updated via ref |
| A1 | Fixed — `.github/workflows/ci.yml` |
| P3 | Already mitigated — `invalidateSettingsCache()` on admin save |
| A2, A3 | Fixed — shared `worker/public-endpoints.ts`, `worker/legacy-lead.ts`, `app/_lib/deprecated-lead-route.ts`; `api/README.md` marks dev-only shims |
| P2 | Fixed — 5-minute template cache + `invalidateTemplateCache()` on content saves |
| L5 | Fixed — delete confirmation without URL query params (`DeleteConfirmTrigger`) |
| L6 | Fixed — lead notes live character counter |
| L7 | Fixed — hotel slug HTML5 `pattern` validation on create |
| L8 | Fixed — editor denial names the restricted section |
| Tech debt | Fixed — README, unit tests, CI build + Python compile; `tmp/`/`output/` removed from repo and gitignored |

---

## Critical Issues

*None identified requiring immediate production halt.*

---

## High Priority Issues

### H1: Login throttle is per Worker isolate

| Field | Value |
| --- | --- |
| **Severity** | High |
| **Location** | `app/admin/login/actions.ts` |
| **Evidence** | `attempts` Map stored in module scope; not shared across Cloudflare Worker instances |
| **Problem** | Credential stuffing protection is partial — attacker can distribute attempts across isolates |
| **Impact** | Reduced effectiveness of rate limiting in production |
| **Recommended solution** | Use D1 or KV-based rate limiting shared across isolates |

### H2: Lead export silent 5000-row cap

| Field | Value |
| --- | --- |
| **Severity** | High |
| **Location** | `app/admin/leads/export/route.ts` |
| **Evidence** | Export capped at 5000 rows with only `console.warn` |
| **Problem** | Admin may receive incomplete CSV without UI notice |
| **Impact** | Data loss in exports for high-volume periods |
| **Recommended solution** | Show UI warning when cap reached; or paginate export |

---

## Medium Priority Issues

### M1: Media library UI capped at 200 files

| Field | Value |
| --- | --- |
| **Severity** | Medium |
| **Location** | `app/admin/media/page.tsx` |
| **Evidence** | SQL LIMIT 200 on media query |
| **Problem** | Older uploads invisible in admin UI |
| **Impact** | Cannot manage/delete older media from UI |
| **Recommended solution** | Add pagination or search to media library |

### M2: Activity log humanization incomplete

| Field | Value |
| --- | --- |
| **Severity** | Medium |
| **Location** | `app/admin/activity/page.tsx`, `app/admin/leads/[id]/page.tsx` |
| **Evidence** | `humanAction()` omits many audit keys (lead.deleted, hotel.*, etc.) |
| **Problem** | Raw action keys shown as fallback |
| **Impact** | Poor UX in activity log and lead detail |
| **Recommended solution** | Complete humanAction mapping for all audit action types |

### M3: Hotel update status fallback inconsistency

| Field | Value |
| --- | --- |
| **Severity** | Medium |
| **Location** | `app/admin/hotels/actions.ts` |
| **Evidence** | Invalid status defaults to `"published"` on update but `"draft"` on create |
| **Problem** | Inconsistent behavior between create and update |
| **Impact** | Unexpected publish on malformed status input during edit |
| **Recommended solution** | Align fallback behavior; reject invalid status |

### M4: New venue form missing FAQ/highlights UI

| Field | Value |
| --- | --- |
| **Severity** | Medium |
| **Location** | `app/admin/hotels/new/page.tsx` |
| **Evidence** | `createHotelAction` supports FAQs/highlights but form doesn't expose fields |
| **Problem** | Always empty on create; only editable after creation |
| **Impact** | Extra step required; inconsistent create vs edit UX |
| **Recommended solution** | Add FAQ/highlights fields to create form |

### M5: Bulk lead actions lack concurrency check

| Field | Value |
| --- | --- |
| **Severity** | Medium |
| **Location** | `app/admin/leads/actions.ts` |
| **Evidence** | No verification that selected rows still match current filter/status |
| **Problem** | Stale bulk selections may update wrong leads |
| **Impact** | Incorrect status changes on leads user didn't intend |
| **Recommended solution** | Re-verify lead IDs against current filter or show confirmation |

---

## Low Priority Issues

### L1: Logout endpoint unauthenticated

| Field | Value |
| --- | --- |
| **Severity** | Low |
| **Location** | `app/admin/logout/route.ts` |
| **Evidence** | Anyone can POST to clear session cookie; no CSRF token |
| **Problem** | CSRF logout possible (benign — only clears own session) |
| **Impact** | Minor annoyance if exploited |
| **Recommended solution** | Add CSRF token or same-origin check |

### L2: Toaster runs once on mount

| Field | Value |
| --- | --- |
| **Severity** | Low |
| **Location** | `app/admin/_components/Toaster.tsx` |
| **Evidence** | Reads query params once on mount |
| **Problem** | Client navigations without full reload may miss new toast params |
| **Impact** | Low — server actions always full redirect |
| **Recommended solution** | Listen for navigation events or use server-side flash |

### L3: Setup error display inconsistent

| Field | Value |
| --- | --- |
| **Severity** | Low |
| **Location** | `app/admin/setup/page.tsx` |
| **Evidence** | Raw `?error=` in URL vs login page mapped messages |
| **Problem** | Inconsistent error UX between setup and login |
| **Impact** | Minor UX inconsistency |
| **Recommended solution** | Map setup errors to fixed strings like login |

### L4: New venue uses text field for ogImage/thumbnailImage

| Field | Value |
| --- | --- |
| **Severity** | Low |
| **Location** | `app/admin/hotels/new/page.tsx` |
| **Evidence** | Text fields instead of ImageInput component |
| **Problem** | Inconsistent with edit flow and article forms |
| **Impact** | Harder to upload images on create |
| **Recommended solution** | Use ImageInput component on create form |

---

## Security Issues

### S1: Login rate limit not durable (see H1)

Cross-isolate credential stuffing risk.

### S2: No CSRF protection on logout (see L1)

Benign but present.

### S3: RichText large HTML in controlled input

| Field | Value |
| --- | --- |
| **Severity** | Low-Medium |
| **Location** | `app/admin/_components/RichText.tsx` |
| **Evidence** | Very large HTML in React `value={value}` |
| **Problem** | Potential performance/serialization limits on huge articles |
| **Impact** | Editor may become slow or fail on very large content |
| **Recommended solution** | Consider uncontrolled input or chunked updates |

---

## Performance Issues

### P1: Media library 200-row limit (see M1)

### P2: Page template HTML blobs (~290KB each)

| Field | Value |
| --- | --- |
| **Severity** | Low |
| **Location** | `page_templates` table, `worker/db/page-templates.generated.ts` |
| **Evidence** | Full HTML shells stored in D1 |
| **Problem** | Large DB reads on every page render |
| **Impact** | Increased D1 read costs and latency |
| **Recommended solution** | Consider R2 storage for templates or aggressive caching |

### P3: Settings cache 30s + HTML cache 60s

| Field | Value |
| --- | --- |
| **Severity** | Low |
| **Location** | `worker/site/settings.ts`, `worker/index.ts` |
| **Evidence** | Fixed TTL caches |
| **Problem** | Admin changes take up to 60s to appear publicly |
| **Impact** | Expected behavior but may confuse editors |
| **Recommended solution** | Document clearly; consider cache bust on admin save |

---

## Architecture Issues

### A1: No CI/CD pipeline

| Field | Value |
| --- | --- |
| **Severity** | Medium |
| **Location** | Repository root |
| **Evidence** | No `.github/workflows/`, no pre-commit hooks installed by default |
| **Problem** | No automated testing or docs validation in CI |
| **Impact** | Regressions and doc drift may reach production |
| **Recommended solution** | Add GitHub Actions for build, lint, docs:validate |

### A2: Dual route handlers (Worker + App Router)

| Field | Value |
| --- | --- |
| **Severity** | Low |
| **Location** | `worker/index.ts` + `app/*/route.ts` |
| **Evidence** | Lead and calculator endpoints handled in both places |
| **Problem** | Potential divergence between dev and prod behavior |
| **Impact** | Subtle bugs if one handler updated without the other |
| **Recommended solution** | Consolidate to single handler path |

### A3: Legacy Node API handlers

| Field | Value |
| --- | --- |
| **Severity** | Low |
| **Location** | `api/lead.ts`, `api/currencies.ts` |
| **Evidence** | Separate from Worker handlers |
| **Problem** | Dead code path in production; confusion for developers |
| **Impact** | Maintenance burden |
| **Recommended solution** | Remove or clearly mark as dev-only |

---

## UX/UI Issues

- Activity log shows raw audit keys for many actions (M2)
- Editor role denial shows alert on dashboard — functional but abrupt
- ConfirmDelete uses query param pattern — works but URL shows `?delete=id`
- Media library shows usage donut but no search/filter
- Hotels list pagination (40/page) but no total count in header

---

## Validation Issues

- Hotel create: no client-side slug format validation (server normalizes)
- Blog slug uniqueness only checked server-side
- Settings social URLs must start `https://` — no friendlier error message
- Lead notes max 5000 chars — no character counter in UI

---

## Technical Debt

| Item | Location | Notes |
| --- | --- | --- |
| Calculator data in Worker bundle | `worker/calculator-data.ts` | Requires redeploy to update prices |
| Static site clone (~1000 pages) | `site-public/` | Migration to full DB rendering in progress |
| README outdated | `README.md` | **Resolved** — README updated 2026-08-21 |
| No automated tests | `package.json` | **Resolved** — `npm run test` runs Node unit tests |
| Python verify scripts not in CI | `build/verify-*.py` | **Partial** — compile check in CI; full render verify still manual |
| `tmp/` and `output/` in repo | Root | **Resolved** — removed from repository; gitignored |

---

## Recommended Improvements

1. **Add CI pipeline** — build, lint, docs:validate, optional verify scripts
2. **D1/KV rate limiting** — replace in-memory login throttle
3. **Complete audit action humanization** — all action types in activity log
4. **Media library pagination** — remove 200-row invisible cap
5. **Export cap UI warning** — notify when 5000 limit reached
6. **Consolidate API handlers** — single source for lead/calculator endpoints
7. **Expand public site documentation** — when public site changes are needed
8. **Add unit/integration tests** — especially for auth, lead capture, sanitization
9. **Install git hooks by default** — or document in README
10. **Update README** — reflect current CMS architecture

---

## Items Not Audited / Unable to Verify

| Item | Reason |
| --- | --- |
| Individual static HTML pages (~1000+) | Static clone; not individually inspected |
| Production D1/R2 data contents | No production access |
| Resend deliverability | No live email testing |
| Cloudflare Images binding behavior | Requires deployed environment |
| OpenAI Sites deployment pipeline | External platform |
| Accessibility of public site | Static HTML not fully tested |
| Mobile responsive behavior | Not systematically tested |
| Performance under load | No load testing performed |
