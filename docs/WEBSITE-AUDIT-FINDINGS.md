# Website Audit Findings

> **Separate from Master Documentation and Admin Audit Findings.**  
> Documents bugs, risks, and recommendations for the **public website**.  
> **Status:** Website issues below were addressed on 2026-08-21 (see git history). Formal cross-browser / Core Web Vitals / WCAG certification still requires manual QA.

**Audit date:** 2026-08-21  
**Scope:** 367 static HTML pages, worker public routing, forms, calculator, SEO, security

See also: [Admin Audit Findings](./AUDIT-FINDINGS.md)

---

## Fix status (public website)

| ID | Status |
| --- | --- |
| WH1 | Fixed — `site-public/robots.txt`, `site-public/sitemap.xml`, live `/sitemap.xml` |
| WH2 | Fixed — JSON-LD injected for Organization, WebSite, Article, Hotel, FAQPage |
| WH3, WS1 | Fixed — D1 rate limiting in `worker/lead-email.ts` |
| WM1 | Fixed — `/appointment-booking` → `/wedding-consultation/` redirect |
| WM2 | Fixed — consultation pages fetch `/appointment/slots`; API aligned |
| WM3 | Fixed — availability button copy → “Request sent” |
| WM4 | Fixed — admin `/admin/calculator` price overrides in D1 |
| WM5 | Fixed — new `/appointment/confirmation/` + `/appointment/request-failed/` with redirects |
| WM6 | Fixed — 301 to `/blogs/category/wedding-planning/` + DB migration |
| WL1 | Fixed — `site-public/404.html` + worker fallback |
| WL3 | Fixed — `cookie-consent.js`; inline gtag stripped on serve |
| WS2 | Fixed — legacy GET returns 410 with `/api/lead` pointer; POST adds deprecation headers |
| WS4 | Fixed — `/api/lead/csrf` double-submit cookie + form token |
| WP4 | Fixed — `loading="lazy"` added to images missing it (HTML transform) |
| WP5 | Fixed — managed HTML cache reduced to 30s |
| WL2 | Documented — `docs/public-site/static-page-editing.md` |
| WP1 | Mitigated — long-cache static assets; edit workflow doc for storage hygiene |
| WP2 | Fixed — calculator bundle lazy-loaded via `worker/calculator-runtime.ts` |
| WP3 | Fixed — non-critical external scripts get `defer` in `enhancePublicHtml` |
| A2 | Fixed — shared handlers in `worker/public-endpoints.ts` |
| Accessibility | Partially fixed — skip link, blog sidebar email field, city filter mobile UX + ARIA |
| API currencies | Fixed — `POST /api/currencies/select` sets cookie; switcher persists preference |
| Tech debt | Fixed — tests, CI, README, static-page editing runbook |

---

## Critical Issues

*None requiring immediate production halt.*

---

## High Priority Issues

### WH1: No robots.txt or sitemap.xml

| Field | Value |
| --- | --- |
| **Severity** | High (SEO) |
| **Location** | `site-public/` root |
| **Evidence** | No `robots.txt` or `sitemap.xml` anywhere in repository |
| **Problem** | Search engines lack crawl guidance and URL discovery |
| **Impact** | Suboptimal indexing of 367+ pages |
| **Recommended fix** | Generate sitemap from route inventory; add robots.txt referencing it |

### WH2: No structured data (Schema.org)

| Field | Value |
| --- | --- |
| **Severity** | High (SEO) |
| **Location** | All HTML pages |
| **Evidence** | Zero `application/ld+json` blocks across 367 pages |
| **Problem** | Missing rich snippets for hotels, articles, FAQs, organization |
| **Impact** | Reduced SERP visibility |
| **Recommended fix** | Add JSON-LD for Hotel, Article, FAQPage, Organization schemas |

### WH3: Lead rate limit per Worker isolate (public forms)

| Field | Value |
| --- | --- |
| **Severity** | High (Security) |
| **Location** | `worker/lead-email.ts` — `rateLimitStore` Map |
| **Evidence** | In-memory rate limit not shared across isolates |
| **Problem** | Spam submissions can bypass limit by hitting different isolates |
| **Impact** | Lead spam, email notification flooding |
| **Recommended fix** | D1 or KV-based rate limiting |

---

## Medium Priority Issues

### WM1: Duplicate consultation pages

| Field | Value |
| --- | --- |
| **Severity** | Medium (SEO/UX) |
| **Location** | `site-public/wedding-consultation/`, `site-public/appointment-booking/` |
| **Evidence** | Near-identical content and functionality |
| **Problem** | Duplicate content risk; user confusion |
| **Impact** | SEO cannibalization |
| **Recommended fix** | Consolidate to one page with redirect |

### WM2: `/appointment/slots` API unused

| Field | Value |
| --- | --- |
| **Severity** | Medium |
| **Location** | `worker/index.ts` vs consultation pages |
| **Evidence** | Worker returns slots `[10:00,...,16:00]`; pages use hardcoded `[11:00,...,19:00]` |
| **Problem** | API/page mismatch; slot changes require HTML edit |
| **Impact** | Maintenance confusion; inconsistent slot lists |
| **Recommended fix** | Wire pages to `/appointment/slots` or remove endpoint |

### WM3: Check availability shows false "BOOKED" state

| Field | Value |
| --- | --- |
| **Severity** | Medium (UX/Trust) |
| **Location** | `site-public/check-hotel-availability/index.html` |
| **Evidence** | Success UI displays "BOOKED" after lead capture only |
| **Problem** | Users may believe a reservation was made |
| **Impact** | Trust/legal concern |
| **Recommended fix** | Change copy to "Request submitted" or similar |

### WM4: Calculator data not admin-editable

| Field | Value |
| --- | --- |
| **Severity** | Medium (Operations) |
| **Location** | `worker/calculator-data.ts`, `site-public/data/calculator/` |
| **Evidence** | Pricing requires code change + redeploy |
| **Problem** | Business users cannot update prices via admin |
| **Impact** | Slow price updates; dev dependency |
| **Recommended fix** | Move pricing to D1 or external config |

### WM5: Payment success/failure pages mislead

| Field | Value |
| --- | --- |
| **Severity** | Medium (UX) |
| **Location** | `site-public/appointment/payment-success/`, `payment-failed/` |
| **Evidence** | Page names imply payment; no payment gateway exists |
| **Problem** | Misleading URL naming |
| **Impact** | User confusion |
| **Recommended fix** | Rename to `/appointment/confirmation/` etc. |

### WM6: Blog category slug typo preserved

| Field | Value |
| --- | --- |
| **Severity** | Medium (SEO) |
| **Location** | `/blogs/category/weeding-planning/` |
| **Evidence** | "weeding" instead of "wedding" in URL |
| **Problem** | Typo in public URL (may be intentional for legacy links) |
| **Impact** | Unprofessional URL; ranking for wrong keyword |
| **Recommended fix** | 301 redirect to corrected slug if safe |

---

## Low Priority Issues

### WL1: No custom 404 page

| Field | Value |
| --- | --- |
| **Severity** | Low |
| **Location** | Worker fallback |
| **Evidence** | No `404.html` in site-public |
| **Problem** | Generic platform 404 |
| **Impact** | Poor UX on broken links |
| **Recommended fix** | Add branded 404 page |

### WL2: Static-only pages not in CMS

| Field | Value |
| --- | --- |
| **Severity** | Low (Operations) |
| **Location** | real-weddings, packages, legal, city landing pages |
| **Evidence** | Require direct HTML edit |
| **Problem** | Content editors must edit HTML source |
| **Impact** | Higher risk of broken markup |
| **Recommended fix** | Migrate to CMS or document edit procedures |

### WL3: Google Analytics on all pages

| Field | Value |
| --- | --- |
| **Severity** | Low (Privacy) |
| **Location** | Inline gtag in all HTML pages |
| **Evidence** | `G-8KV1YV2GD8` hardcoded |
| **Problem** | No cookie consent integration visible beyond cookie policy page |
| **Impact** | Potential GDPR/cookie compliance gap |
| **Recommended fix** | Integrate with cookie preference policy UI |

---

## Security Issues

### WS1: Lead rate limit not durable (see WH3)

### WS2: Legacy form action URLs still accepted

| Field | Value |
| --- | --- |
| **Severity** | Low-Medium |
| **Location** | Worker accepts `/contact/save`, `/blog-form-submit`, `/get_in_touch/store` |
| **Evidence** | Multiple endpoints → same handler |
| **Problem** | Expanded attack surface |
| **Impact** | Minor — all same validation |
| **Recommended fix** | Consolidate to `/api/lead` only with redirects |

### WS3: Static HTML not sanitized at serve

| Field | Value |
| --- | --- |
| **Severity** | Low |
| **Location** | Unmanaged static pages |
| **Evidence** | Served as-is from clone |
| **Problem** | Any injected malicious HTML in static files would reach users |
| **Impact** | Low if source is trusted |
| **Recommended fix** | CSP already restricts scripts; periodic static audit |

### WS4: CSRF on lead forms

| Field | Value |
| --- | --- |
| **Severity** | Low |
| **Location** | All POST forms |
| **Evidence** | Same-origin check only; no CSRF token |
| **Problem** | Same-origin policy mitigates most CSRF |
| **Impact** | Low for JSON POST with Content-Type check |
| **Recommended fix** | Add CSRF token for defense in depth |

---

## SEO Issues

| Issue | Severity | Detail |
| --- | --- | --- |
| No robots.txt | High | See WH1 |
| No sitemap | High | See WH1 |
| No structured data | High | See WH2 |
| Duplicate consultation pages | Medium | See WM1 |
| Category slug typo | Medium | See WM6 |
| No meta robots in static HTML | Low | Relies on defaults |
| Possible multiple H1s | Low | Not verified per page |

---

## Performance Issues

### WP1: Large static storage (~280MB)

| Field | Value |
| --- | --- |
| **Severity** | Medium |
| **Location** | `site-public/storage/` |
| **Evidence** | ~280MB of thumbnail/image assets |
| **Impact** | Deploy size, cold start, bandwidth costs |
| **Recommended fix** | Optimize images; consider R2/CDN migration |

### WP2: Calculator data in worker bundle

| Field | Value |
| --- | --- |
| **Severity** | Medium |
| **Location** | `worker/calculator-data.ts` (~30k lines) |
| **Impact** | Large worker bundle; slower cold starts |
| **Recommended fix** | Serve from R2/KV instead of bundle |

### WP3: Multiple render-blocking scripts per page

| Field | Value |
| --- | --- |
| **Severity** | Low-Medium |
| **Location** | All pages — jQuery, Bootstrap, Select2, Flatpickr, Slick, AOS |
| **Impact** | LCP/INP degradation |
| **Recommended fix** | Defer non-critical scripts; audit bundle necessity |

### WP4: No image lazy loading on all pages

| Field | Value |
| --- | --- |
| **Severity** | Low |
| **Evidence** | Mixed `loading` attributes in static clone |
| **Impact** | Unnecessary initial bandwidth |
| **Recommended fix** | Add `loading="lazy"` to below-fold images |

### WP5: 60s HTML cache delay after admin edits

| Field | Value |
| --- | --- |
| **Severity** | Low (UX) |
| **Location** | `worker/index.ts` MANAGED_CACHE |
| **Impact** | Editors may think save failed |
| **Recommended fix** | Document expected delay; optional cache purge on save |

---

## UX/UI Issues

| Issue | Detail |
| --- | --- |
| False "BOOKED" state | See WM3 |
| Misleading payment page names | See WM5 |
| Duplicate booking pages | See WM1 |
| No custom 404 | See WL1 |
| Filter form on city pages | Complex mobile sidebar UX |
| Blog sidebar form | Requires phone but not email — inconsistent with other forms |

---

## Accessibility Issues

| Issue | Detail |
| --- | --- |
| Positive: lead-forms.js | Good aria-live, aria-invalid, error descriptions |
| Unverified: heading hierarchy | Not audited per page |
| Unverified: color contrast | Not measured |
| Unverified: keyboard nav on modals | Bootstrap modals — partial support |
| Unverified: alt text | Static images — not systematically checked |
| Select2 dropdowns | Known accessibility limitations |

---

## API Issues

| Issue | Detail |
| --- | --- |
| Unused `/appointment/slots` | See WM2 |
| Blocked calculator JSON paths return plain 404 | No helpful error |
| `/api/currencies/select` is stub | Returns `{ok:true}` always |
| Dual handler paths (worker + app router) | Potential dev/prod divergence |

---

## Architecture Issues

| Issue | Detail |
| --- | --- |
| Static clone + injection hybrid | Complex mental model for developers |
| 367 pages in source control | Large repo; hard to diff |
| Calculator data outside CMS | Business/data split |
| No public frontend build pipeline | HTML edits are manual |
| Real-time features absent | No WebSocket infrastructure (N/A for current scope) |

---

## Technical Debt

| Item | Notes |
| --- | --- |
| Static HTML clone maintenance | 367 files to manage |
| Legacy form action URLs | `/contact/save`, `/blog-form-submit` |
| `currency-switcher.js` API interception | Masks real API failures |
| `mutation-observer-guard.js` | Patches clone JS compatibility |
| YouTube local stubs | `site-public/vendor/youtube-local/` |
| Near-identical consultation pages | Duplicate maintenance |

---

## Recommended Improvements (Priority Order)

1. Add `robots.txt` and `sitemap.xml`
2. Add Schema.org structured data to key page types
3. D1/KV rate limiting for lead forms
4. Fix "BOOKED" misleading copy on availability wizard
5. Consolidate consultation/booking pages
6. Wire or remove `/appointment/slots` endpoint
7. Add custom 404 page
8. Move calculator pricing to admin-editable storage
9. Optimize `/storage/` images
10. Add CI validation for public site render scripts (`build/verify-*.py`)

---

## Unable to Verify

| Item | Reason |
| --- | --- |
| Responsive layout on all 367 pages | Not browser-tested per page |
| Cross-browser compatibility | Not tested |
| Core Web Vitals scores | No Lighthouse run performed |
| Live production behavior | No production access |
| Payment flows | Confirmed absent — nothing to test |
| User auth flows | Confirmed absent |
| Real-time features | Confirmed absent |
| Accessibility compliance (WCAG) | Not formally tested |
