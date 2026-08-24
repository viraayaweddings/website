# Documentation Coverage Report

**Do not hand-maintain counts in this file.** Every number below is generated.
Read them from:

- `docs/META.md` — inventory counts at the last sync
- `docs/generated/code-inventory.json` — the entities themselves
- `docs/generated/validation-report.json` — issues and warnings from the last run

```bash
npm run docs:validate   # rescans, then PASS/FAIL
npm run docs:sync       # rescan + rewrite manifest/META + validate
```

This document previously carried a hand-copied table asserting `Missing: 0` for
every category, with numbers for 31 routes, 27 server actions, 14 tables and 367
pages. The real figures at that moment were 55, 67, 23 and 292. Restating
generated counts in prose is what produced that, so it is not done here any more.

---

## What a PASS does and does not mean

`npm run docs:validate` fails unless **every one** of the following that the scan
finds is mentioned in `docs/**/*.md`:

| Kind | Count | Checked as |
| --- | ---: | --- |
| App routes | 55 | Individually |
| Server actions | 67 | Individually |
| Database tables | 23 | Individually |
| Database **columns** | 198 | Individually, against `05-database.md` |
| Worker modules | 65 | Individually — every `.ts` under `worker/` |
| Audit actions | 71 | Individually |
| npm scripts | 32 | Individually |
| Environment variables | 19 | Individually |
| Enums | 5 names, 24 values | By name, and by value except the calendar months |
| Page type patterns | 9 | Individually |
| Public forms | 7 placements / 6 ids | Individually |
| Public JS files | 7 | Individually |
| Static site pages | 292 | By pattern, plus a fixed sample of key routes |

Exported symbols are reported as a coverage figure rather than enforced: 65 of
279 are named, and most of the rest are internal row and option types.

As of 2026-08-24 validation also:

- rescans the codebase first, instead of trusting the committed inventory
  snapshot;
- ignores `docs/manifest.json` when deciding whether something is documented;
- matches on word boundaries, so a table called `media` is not satisfied by the
  word "media" in a sentence.

It still does **not** verify that what the documentation says is *true*. Nothing
mechanical can. The gap is real and worth stating plainly: for two days the suite
reported PASS while nine routes, twenty-eight actions and three tables were
undocumented, and while `03-routes.md` described the homepage as a static file
served from a component that does not exist.

Behavioural accuracy comes from reading the code, and the fix for a wrong
statement is a commit, not a rerun.

---

## Coverage by kind

| Kind | How it is covered |
| --- | --- |
| App routes | Individually, in `03-routes.md` and `02-admin/routes.md` |
| Server actions | Individually, in `02-admin/actions.md`; the thirteen bulk actions as one documented pattern |
| Database tables | Individually, in `05-database.md`, with columns |
| Worker modules | Individually, in `11-file-index.md`; behaviour in `public-site/rendering.md` and `backend/README.md` |
| Admin components | Individually, in `10-components.md` |
| Static site pages | **By pattern, not by file.** Nine page-type patterns in `public-site/page-types.md`; the 292 paths are listed in `code-inventory.json` |
| Public forms | Individually, in `public-site/forms.md`. 7 placements across 6 ids — `contactForm` appears on `/contact/` and `/blogs/{slug}/` |

Documenting 292 cloned pages one at a time has no reader, so validation checks a
sample of key routes plus the page-type patterns instead. That is a deliberate
limit, not an omission.

---

## Not covered, and why

| Area | Status |
| --- | --- |
| Individual static HTML files | By pattern, by design |
| HTMLRewriter CSS selectors | Module level; selectors live in the injector source |
| Responsive behaviour | Described, not per-page browser-tested |
| Accessibility | Lead forms documented; no formal WCAG audit |
| Core Web Vitals | No Lighthouse or field data collected |
| Email deliverability | Resend is documented; live sending is not tested |

---

## Confirmed absent

| Feature | Status |
| --- | --- |
| Public user authentication | Not implemented — see `06-auth.md` |
| User dashboard / onboarding | Not implemented |
| Payment processing | Not implemented — see `public-site/booking-consultation.md` |
| Real-time chat / WebSockets | Not implemented |

Three entries were removed from this list on 2026-08-24 because they had since
been built, and the list was still calling them missing:

| Was listed absent | Actually |
| --- | --- |
| `robots.txt` | `site-public/robots.txt` exists and serves 200 |
| Sitemap | `app/sitemap.xml/route.ts` generates it from the database; `site-public/sitemap.xml` also exists |
| Schema.org structured data | `worker/site/json-ld.ts` emits organisation, website, breadcrumb, article, hotel and FAQ JSON-LD, appended per page type |

---

## Audit reports (separate)

| Report | Scope |
| --- | --- |
| [AUDIT-FINDINGS.md](./AUDIT-FINDINGS.md) | Admin panel issues — historical, written against the Cloudflare deployment |
| [WEBSITE-AUDIT-FINDINGS.md](./WEBSITE-AUDIT-FINDINGS.md) | Website issues — same caveat |
| [AUDIT-CALCULATORS.md](./AUDIT-CALCULATORS.md) | Calculator data sources |
| [AUDIT-PAGE-DATA-SOURCES.md](./AUDIT-PAGE-DATA-SOURCES.md) | Which pages read from where |

Those describe problems and their fixes. For how the system works now, start at
[Architecture](./01-architecture.md).
