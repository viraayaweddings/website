# Complete Route Map

Every route: App Router pages, API routes, and the public catch-all.

---

## Public Website Routes

**Complete documentation:** [Public Website Route Map](./public-site/routes.md)

**292** `index.html` files in `site-public/`, plus the paths the database owns.
The figure was 370 before eight cities and their venues were withdrawn (see
`scripts/lib/retired-cities.mjs`) and three retired form targets were deleted.

### Public site has NO user authentication

No `/login`, `/register`, `/account`, or protected user routes exist. See [Public Website Overview](./public-site/README.md).

---

## There is no `app/page.tsx`

The App Router owns `/admin`, `/api` and the named endpoints below. **Every other
public URL, including `/`, is handled by the catch-all**
`app/[[...path]]/route.ts` — there is no root page component, and never was one.

`/` is not static either. `isDatabaseOwnedPath` in
`worker/site/render-page.ts` returns true for `/` and `/index.html`, so the
homepage is rendered from its stored shell with the hero carousel injected from
`hero_slides`. It is the flagship database-rendered page, not a file served off
the CDN.

> This document previously carried the row
> `| / | app/page.tsx | None | Returns null — homepage is static HTML |`.
> All three claims were wrong: the file does not exist, nothing returns null, and
> the homepage is database-rendered. Anyone editing the homepage on that basis
> would have looked in the wrong place entirely.

---

## App Router API Routes

Twenty-two non-admin routes. `/:[...path]` is the catch-all itself.

### Lead capture

| Route | Methods | File | Auth |
| --- | --- | --- | --- |
| `/api/lead` | POST, OPTIONS | `app/api/lead/route.ts` | Same-origin + CSRF |
| `/api/lead/csrf` | GET | `app/api/lead/csrf/route.ts` | None (issues the token) |
| `/contact/save` | POST, OPTIONS | `app/contact/save/route.ts` | Same-origin |
| `/get_in_touch/store` | POST, OPTIONS | `app/get_in_touch/store/route.ts` | Same-origin |
| `/blog-form-submit` | POST, OPTIONS | `app/blog-form-submit/route.ts` | Same-origin |

All of them delegate to `app/lead-route.ts` → `worker/lead-email.ts`.
`app/lead-route.ts` and `app/_lib/deprecated-lead-route.ts` are **helper
modules, not routes** — the App Router only routes a file named exactly
`route.ts`.

### Calculator and venue data

These paths are the Laravel original's, kept because the page scripts call them
by name. Each is now served from Postgres rather than a bundled JSON file.

| Route | Methods | File | Serves |
| --- | --- | --- | --- |
| `/get-cities` | GET | `app/get-cities/route.ts` | Published `calculator_cities` |
| `/get-hotels-by-city` | GET | `app/get-hotels-by-city/route.ts` | Hotels for a city passed as `?city=`, which is the form `/compare-hotel` uses |
| `/get-hotels-by-city/:city` | GET | `app/get-hotels-by-city/[city]/route.ts` | The same, city in the path |
| `/get-hotel-price/:hotel/:month` | GET | `app/get-hotel-price/[hotel]/[month]/route.ts` | One `calculator_prices` row |
| `/get-hotel-prices` | GET | `app/get-hotel-prices/route.ts` | All twelve months for a venue |
| `/api/calculator/data` | GET | `app/api/calculator/data/route.ts` | The whole calculator dataset |
| `/api/currencies` | GET | `app/api/currencies/route.ts` | Published `calculator_currencies` |
| `/api/currencies/select` | **POST** | `app/api/currencies/select/route.ts` | Records the visitor's choice in a `selected_currency` cookie (1 year, `SameSite=Lax`) and echoes it back — it stores a preference rather than serving data |
| `/data/calculator/:file` | GET | `app/data/calculator/[file]/route.ts` | The legacy `*.json` filenames, generated from the tables |
| `/data/hotel-listing-data.json` | GET | `app/data/hotel-listing-data.json/route.ts` | The venue listing payload |
| `/hotel-search` | GET | `app/hotel-search/route.ts` | Venue autocomplete |
| `/appointment/slots` | GET | `app/appointment/slots/route.ts` | Consultation slot times (`force-static` — the list is a constant) |

`/data/calculator/:file` and `/data/hotel-listing-data.json` look like static
files and are not. There is no `site-public/data/` directory — the paths are
routes that build the same JSON shape from the database, so the page scripts that
fetch them did not have to change.

### Infrastructure

| Route | Methods | File | Purpose |
| --- | --- | --- | --- |
| `/media/:...path` | GET, HEAD | `app/media/[...path]/route.ts` | R2 objects, with the legacy `site-public` fallback |
| `/sitemap.xml` | GET | `app/sitemap.xml/route.ts` | Generated from the database |
| `/api/health/db` | GET | `app/api/health/db/route.ts` | Database reachability |
| `/api/health/html` | GET | `app/api/health/html/route.ts` | Reports whether `HTMLRewriter` is available |
| `/:[...path]` | GET, HEAD | `app/[[...path]]/route.ts` | The catch-all: public pages, redirects, static fallback, 404 |

---

## Admin Routes

See [Admin Routes](./02-admin/routes.md) for complete `/admin/*` inventory.

---

## Catch-all and diagnostics

Everything that is not an App Router page is served by the catch-all,
`/:[...path]`. It renders the pages the database owns, falls back to the
original `site-public` markup for the rest, and answers with `404.html` when
neither exists. Only app-owned prefixes are handed to the App Router -- the
public paths have no page behind them, so delegating them recurses.

| Route | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/:[...path]` | GET, HEAD | Public | Catch-all: database-rendered pages, static fallback, 404 |
| `/media/:...path` | GET, HEAD | Public | Serves uploads from R2 by content-addressed key |
| `/api/health/db` | GET | Public | Postgres reachable; reports `schemaReady` |
| `/api/health/html` | GET | Public | HTML rewriting works in this runtime |
| `/admin/health` | GET | Public status, admin detail | Same DB check; the driver error is admin-only |
| `/admin/health/r2` | GET | Admin | Round-trips an object through R2 and reports the real S3 error |
| `/admin/seed` | GET, POST | Admin | Imports the bundled content seed into an empty database |
| `/admin/pages` | GET | Admin | The pages stored whole in `static_pages` |
| `/admin/pages/:path` | GET | Admin | One stored page: its search listing and its pictures |
| `/admin/calculator/hotels` | GET | Admin | Calculator hotels, filterable by city and name |
| `/admin/calculator/hotels/:id` | GET | Admin | One hotel and its twelve monthly prices |
| `/api/calculator/data` | GET | Public | The whole calculator dataset, from the database |
| `/data/calculator/:file` | GET | Public | The legacy data files, answered from the same tables |

The former Cloudflare worker entry and the `api/` dev handlers are gone: the
first was dead once routing moved to the App Router, and the second shadowed
`app/api/*` as Serverless Functions on Vercel.

---

## Public Site Static Routes

The public website is 292 `index.html` files in `site-public/`. Key sections:

| Path pattern | Purpose |
| --- | --- |
| `/` | Homepage |
| `/about-us/` | About page |
| `/blogs/` | Blog index |
| `/blogs/:slug` | Blog articles |
| `/blogs/category/:slug` | Category listings |
| `/blogs/tag/:slug` | Tag listings |
| `/destination-wedding/:city/` | City venue listings |
| `/destination-wedding/:city/:slug` | Venue detail pages |
| `/destination-wedding-in-:city/` | City landing pages |
| `/contact/` | Contact page |
| `/get_in_touch/` | Enquiry form |
| `/hotel-cost-calculator/` | Calculator |
| `/compare-hotel/` | Hotel comparison |
| `/appointment-booking/` | Booking flow |

**Status:** Structure documented; individual pages are not inventoried one by one.
`docs/generated/code-inventory.json` carries the full list under `staticSiteRoutes`,
regenerated by `npm run docs:inventory`.

---

## Route Access Matrix

| Route prefix | Authentication | Authorization |
| --- | --- | --- |
| `/admin/login`, `/admin/setup` | Public (conditional) | — |
| `/admin/*` (other) | Session cookie | Role-based |
| `/api/lead`, `/contact/save`, etc. | Same-origin header | — |
| `/get-cities`, calculator APIs | Same-origin (sensitive) | — |
| Public HTML | None | — |
| `?preview=1` | Admin session | Draft content |
