# Complete Route Map

All routes in the Vinext app router and Cloudflare Worker.

---

## Public Website Routes

**Complete documentation:** [Public Website Route Map](./public-site/routes.md)

367 static HTML pages in `site-public/` plus worker-managed dynamic routes. See public-site docs for full taxonomy.

### Public site has NO user authentication

No `/login`, `/register`, `/account`, or protected user routes exist. See [Public Website Overview](./public-site/README.md).

---

## App Router Pages

| Route | File | Auth | Purpose |
| --- | --- | --- | --- |
| `/` | `app/page.tsx` | None | Returns null — homepage is static HTML |

---

## App Router API Routes

| Route | Methods | File | Auth | Purpose |
| --- | --- | --- | --- | --- |
| `/api/lead` | POST, OPTIONS | `app/api/lead/route.ts` | Same-origin | Lead capture |
| `/contact/save` | POST, OPTIONS | `app/contact/save/route.ts` | Same-origin | Contact form |
| `/get_in_touch/store` | POST, OPTIONS | `app/get_in_touch/store/route.ts` | Same-origin | Get-in-touch form |
| `/blog-form-submit` | POST, OPTIONS | `app/blog-form-submit/route.ts` | Same-origin | Blog enquiry form |
| `/hotel-search` | GET | `app/hotel-search/route.ts` | None | Hotel autocomplete |

All lead routes delegate to `app/lead-route.ts` → `worker/lead-email.ts`.

---

## Admin Routes

See [Admin Routes](./02-admin/routes.md) for complete `/admin/*` inventory.

---

## Server Routes (`app/[[...path]]/route.ts`)

### Lead & Form Endpoints

| Route | Method | Auth | Handler |
| --- | --- | --- | --- |
| `/api/lead` | POST | Same-origin | `handleLeadRequest` |
| `/contact/save` | POST | Same-origin | `handleLeadRequest` |
| `/get_in_touch/store` | POST | Same-origin | `handleLeadRequest` |
| `/blog-form-submit` | POST | Same-origin | `handleLeadRequest` |

### Calculator / Search (static data)

| Route | Method | Auth | Data source |
| --- | --- | --- | --- |
| `/data/calculator/cities.json` | GET | None | `calculator-data.ts` (India only) |
| `/data/calculator/currencies.json` | GET | None | Static INR |
| `/data/calculator/hotels-by-city.json` | GET | None | Static |
| `/data/calculator/hotels.json` | GET | None | Static |
| `/data/calculator/prices.json` | GET | None | Static |
| `/api/currencies` | GET | None | Static INR |
| `/api/currencies/select` | GET | None | Stub `{ok:true}` |
| `/hotel-search` | GET | None | Static search index |
| `/get-cities` | GET | Same-origin | City autocomplete |
| `/get-hotels-by-city` | GET | Same-origin | Compare hotels |
| `/get-hotels-by-city/:cityId` | GET | Same-origin | Hotels for city |
| `/get-hotel-price/:id/:month` | GET | Same-origin | Monthly prices |
| `/get-hotel-prices` | POST | Same-origin | Batch price lookup |
| `/api/calculator/availability-data` | GET | Same-origin | Cities + hotels |
| `/appointment/slots` | GET | None | Hardcoded slots |

**Blocked (404):** `/data/calculator/calculator-data.json`, `/data/calculator/availability-data.json`

### Media & Images

| Route | Method | Purpose |
| --- | --- | --- |
| `/media/*` | GET/HEAD | Serve R2 objects |
| `/_vinext/image` | GET | Image optimization |

### Admin & App Router

| Route | Method | Purpose |
| --- | --- | --- |
| `/admin/*` | GET/POST | Vinext app router (no-cache) |

### Public HTML

| Route | Method | Purpose |
| --- | --- | --- |
| `/*` | GET/HEAD | Static assets or managed page injection |
| `/wedding-consultation` | GET | 308 → trailing slash |
| `/storage` | GET | Empty HTML stub |

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

The former Cloudflare worker entry and the `api/` dev handlers are gone: the
first was dead once routing moved to the App Router, and the second shadowed
`app/api/*` as Serverless Functions on Vercel.

---

## Public Site Static Routes

The public website consists of ~1000+ HTML pages in `site-public/`. Key sections:

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

**Status:** Structure documented; individual pages not individually inventoried (static clone).

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
