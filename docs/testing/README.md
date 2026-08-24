# Testing

**19 test files, 183 tests, all passing.** Run them with:

```bash
npm test
```

This document previously stated that `npm test` ran `npm run build` and that "no
unit tests or integration tests exist". Both were wrong: `npm test` is
`node --experimental-strip-types --test tests/*.test.mjs`, and the suite below
predates that claim.

---

## Commands

| Command | What it runs |
| --- | --- |
| `npm test` | `node --experimental-strip-types --test tests/*.test.mjs` |
| `npm run test:ci` | `npm test` then `npm run build` |
| `npm run lint` | ESLint over `app`, `worker`, and the config files |
| `npm run docs:validate` | Documentation ↔ code check; fails on any issue |
| `build/verify-*.py` | Render comparison scripts; CI byte-compiles them |

`--experimental-strip-types` is what lets a `.mjs` test import the project's
`.ts` modules directly, with no build step and no separate test config.

---

## What is covered

Pure logic, at the module level. Nothing here needs a database, a network or a
browser, which is why the suite runs in about three seconds.

| File | Tests | Covers |
| --- | ---: | --- |
| `page-data-sources.test.mjs` | 39 | The stored-page transform: which pages read from where |
| `rich-text.test.mjs` | 17 | Admin HTML sanitising — what is stripped, and byte-for-byte round-tripping of everything else |
| `lead-fields.test.mjs` | 15 | Finding a name, phone, email or date in an arbitrary form payload |
| `db-errors.test.mjs` | 14 | Classifying Postgres driver errors into admin-readable messages |
| `media-path.test.mjs` | 12 | `/media/<key>` ↔ key conversion, and rejecting traversal |
| `lead-csv.test.mjs` | 11 | CSV export, including the formula-injection guard |
| `retired-cities.test.mjs` | 9 | The retired-city transform is idempotent and balances its markup |
| `lead-filters.test.mjs` | 8 | Parsing and re-serialising the lead list filters |
| `sql-date-binding.test.mjs` | 8 | Date binding in raw SQL — a real past bug source |
| `password.test.mjs` | 7 | PBKDF2 hash/verify and strength rules |
| `city-heading.test.mjs` | 5 | City index heading rendering |
| `venue-listing-payload.test.mjs` | 5 | The venue listing JSON shape |
| `record-id.test.mjs` | 4 | Out-of-range ids are rejected before reaching SQL |
| `vercel-config.test.mjs` | 4 | `buildCommand` stays under Vercel's 256-char limit, and every npm script it names exists |
| `client-boundary.test.mjs` | 3 | No non-component is imported from a `"use client"` file |
| `lead-csrf.test.mjs` | 3 | Lead CSRF token issue and read |
| `public-endpoints.test.mjs` | 2 | Venue autocomplete |
| `source-control-chars.test.mjs` | 2 | No stray control characters in source |
| `migration-statements.test.mjs` | 1 | Every `drizzle-pg` migration splits into runnable statements |

`tests/fixtures/hotel-listing-before.json` is the recorded listing payload the
venue-listing test compares against.

### Two tests worth knowing about

`client-boundary.test.mjs` exists because importing a non-component from a
`"use client"` file compiles to a stub that throws — and only in a production
build, so a dev run looks fine.

`vercel-config.test.mjs` exists because `buildCommand` chains eight npm scripts;
it once grew past Vercel's 256-character limit, and the only symptom was a failed
deployment.

---

## Not covered

| Area | Why |
| --- | --- |
| Database queries | No test database; the query builders are exercised only through pure helpers |
| Server actions end to end | Would need a session, a database and a request context |
| Rendering and injection | `build/verify-*.py` compares rendered output against the static originals, run by hand |
| Browser behaviour | No harness. The public JS is untested |
| Accessibility, Core Web Vitals | Not measured |

The largest gap is the injection pipeline: `worker/site/*-inject.ts` is where a
change most easily breaks a page, and it has no automated coverage. The Python
render-comparison scripts are the closest thing, and CI only checks that they
compile.

---

## CI

`.github/workflows/ci.yml`, on every push to `main` and every pull request:

```yaml
- run: npm run lint
- run: npm run docs:validate
- run: npm run test
- run: npm run build
- name: Verify render scripts compile
  run: python -m py_compile build/verify-*.py
```
