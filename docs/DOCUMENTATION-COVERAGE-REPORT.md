# Documentation Coverage Report

Generated after complete website audit expansion (v1.1.0).  
**Validation:** Run `npm run docs:validate` — see `docs/generated/validation-report.json`

---

## Summary

| Metric | Value |
| --- | --- |
| **Documentation Sync Status** | Run `npm run docs:sync` to verify |
| **Documentation version** | 1.1.0 |
| **Scope** | Admin panel + public website + worker/API/DB |

---

## Coverage by Category

| Category | Discovered | Documented | Missing | Notes |
| --- | ---: | ---: | ---: | --- |
| App routes (Vinext) | 31 | 31 | 0 | `03-routes.md` + admin detail |
| Static site pages | 367 | 367* | 0 | *By pattern taxonomy, not individual files |
| Page type patterns | 9 | 9 | 0 | `public-site/routes.md`, `page-types.md` |
| Public forms | 7 | 7 | 0 | `public-site/forms.md` |
| Public JS files | 5 | 5 | 0 | `public-site/javascript.md` |
| Worker site modules | 12 | 12 | 0 | `public-site/rendering.md`, `backend/README.md` |
| Server actions | 27 | 27 | 0 | `02-admin/actions.md` |
| DB tables | 14 | 14 | 0 | `05-database.md` |
| Worker endpoints | 26 | 26 | 0 | `03-routes.md`, `04-api.md` |
| Admin components | 16 | 16 | 0 | `10-components.md` |
| Admin files | 57 | 57 | 0 | `11-file-index.md` |
| Website ↔ Admin deps | 8 modules | 8 | 0 | `public-site/website-admin-map.md` |

---

## Fully Documented Areas

### Admin Panel (prior audit — unchanged)
- All 57 admin source files, 27 server actions, forms, workflows, auth, components

### Public Website (this audit)
- Route taxonomy (367 pages across 9 patterns)
- All page types with UI anatomy
- All 7 public form types + validation pipeline
- All 5 public JS files + theme scripts
- HTMLRewriter injection per page type
- Search, calculator, compare tools
- Booking/consultation flows (lead-only)
- SEO metadata patterns and gaps
- Content management sources (CMS vs static)
- Website ↔ Admin dependency map
- Visitor workflows

### Shared Infrastructure
- Worker routing, caching, security headers
- Database schema (website + admin usage)
- API inventory (public + admin)
- Integrations (Neon, R2, Resend)
- Security (public + admin)
- Architecture, dependency maps, change impact

---

## Partially Documented / Pattern-Level Only

| Area | Coverage | Gap |
| --- | --- | --- |
| Individual static HTML files | Pattern taxonomy | 367 files documented by type, not individually |
| HTMLRewriter CSS selectors | Module-level | Selector-level mapping not exhaustively listed |
| Responsive behavior | Described | Not browser-tested per page |
| Accessibility | Lead forms documented | Full WCAG audit not performed |
| Performance metrics | Architecture notes | No Lighthouse/CWV measurements |
| Real weddings / packages content | Page types listed | Content not individually inventoried |

---

## Confirmed Absent (Documented as N/A)

| Feature | Status |
| --- | --- |
| Public user authentication | Not implemented — documented in `06-auth.md` |
| User dashboard / onboarding | Not implemented |
| Payment processing | Not implemented — documented in `booking-consultation.md` |
| Real-time chat/WebSockets | Not implemented |
| robots.txt / sitemap | Not present — flagged in SEO audit |
| Schema.org structured data | Not present — flagged in SEO audit |

---

## Unable to Verify

| Item | Reason |
| --- | --- |
| Live production behavior | No production access |
| Cross-browser testing | Not performed |
| Mobile responsive per page | Not systematically tested |
| Core Web Vitals | No performance tooling run |
| Accessibility WCAG compliance | Not formally tested |
| Email deliverability | Resend not tested live |

---

## Audit Reports (Separate)

| Report | Issues |
| --- | --- |
| [AUDIT-FINDINGS.md](./AUDIT-FINDINGS.md) | Admin panel issues (prior audit) |
| [WEBSITE-AUDIT-FINDINGS.md](./WEBSITE-AUDIT-FINDINGS.md) | Website issues (this audit) |

---

## Synchronization Mechanism

Extended in v1.1.0 to cover:

- Static site routes (367 pages)
- Page type patterns
- Public form IDs
- Public JS files
- Worker site modules
- Key static route spot-checks

**Commands:**
```bash
npm run docs:sync      # Full pipeline
npm run docs:validate  # PASS/FAIL
```

**Honest assessment:** PASS confirms inventoried entities appear in documentation text. Does not verify behavioral accuracy or individual HTML file content. **Coverage percentage for individual static pages: pattern-level 100%, file-level N/A by design.**

---

## Documentation Files (Website Expansion)

| Path | Purpose |
| --- | --- |
| `docs/public-site/README.md` | Website index |
| `docs/public-site/architecture.md` | Public app layer |
| `docs/public-site/routes.md` | Route taxonomy |
| `docs/public-site/page-types.md` | Page anatomy |
| `docs/public-site/forms.md` | All public forms |
| `docs/public-site/javascript.md` | Client JS |
| `docs/public-site/rendering.md` | HTMLRewriter |
| `docs/public-site/search-calculator.md` | Discovery tools |
| `docs/public-site/booking-consultation.md` | Appointment flows |
| `docs/public-site/seo.md` | SEO audit |
| `docs/public-site/content-management.md` | Content sources |
| `docs/public-site/website-admin-map.md` | Admin ↔ site deps |
| `docs/public-site/workflows.md` | Visitor flows |
| `docs/WEBSITE-AUDIT-FINDINGS.md` | Website issues |
| Updated: `backend/README.md`, `security/README.md`, sync scripts |
