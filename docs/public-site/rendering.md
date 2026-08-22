# Public Website — Rendering & Injection

How static HTML becomes CMS-managed content at request time.

---

## Request Flow

**Entry:** `app/[[...path]]/route.ts`

Only paths the database owns are rewritten to the function; everything else is
served straight from the CDN and never gets here.

```
GET /path
  1. App-owned prefix? → App Router (no cache)
  2. Retired URL? → 301
  3. resolvePage() succeeds? → shell from page_templates + inject (30s cache)
  4. Otherwise fetch the original markup back through the origin
       (marked x-vw-shell so the rewrite treats it as a miss)
  5. needsInjection()? → HTMLRewriter patches the managed pieces
  6. Neither? → the site's own 404.html
```

---

## Two Rendering Models

| Model | When | Source |
| --- | --- | --- |
| **Database-rendered** | `resolvePage()` returns content | `page_templates` shell + Postgres data |
| **Original + injection** | The path is managed but its shell is missing | Original markup + HTMLRewriter patches |
| **Static only** | The path is not managed | Served by the CDN, untouched |

If Postgres is unreachable or a shell was never seeded, a managed page falls
back to its original markup rather than failing. A page is never lost to a
database problem.

---

## Page Resolution (`worker/site/resolve-page.ts`)

Maps URL → stored shell + the content that fills it.

| Path | Template key | Content loaded |
| --- | --- | --- |
| `/` | `home` | `hero_slides`, settings, labels |
| `/contact/` | `contact` | settings |
| `/destination-wedding/{city}/{slug}/` | per-venue `shellKey` | `hotels` row, labels, settings |
| `/destination-wedding/{city}/` | per-city `shellKey` | `city_pages`, `city_listings` → hotels |
| `/blogs/` | `blog-listing` | published `blog_posts` |
| `/blogs/{slug}/` | per-post `shellKey` | `blog_posts` row |
| `/blogs/category\|tag/{slug}/` | `blog-tax:{type}:{slug}` | `blog_listings` → posts |

**Preview:** `?preview=1` + admin session includes draft status content.

---

## HTMLRewriter Injection (`worker/site/inject.ts`)

Patches static HTML without replacing the entire file.

| Page type | Handler module | What's replaced |
| --- | --- | --- |
| **All pages** | settings injection | WhatsApp link, Instagram/LinkedIn footer |
| **Home** | `hero.ts` | Carousel slides in `div.slider-banner` |
| **Contact** | settings | Phone, email, address blocks |
| **Blog listing** | `blog-inject.ts` | Post card grid |
| **Blog post** | `blog-inject.ts` | Title, meta, OG, canonical, banner, body, TOC, FAQ, `source_page` hidden field |
| **Blog taxonomy** | `blog-inject.ts` | Filtered post grid |
| **Venue detail** | `hotel-inject.ts` | SEO, banner, description, amenities, gallery, FAQ, nearby venues, enquiry hidden fields |
| **City listing** | `venue-listing.ts` + inject | Venue cards, pagination, results summary, title, meta, filter preselect |

### Injection handler files

| File | Purpose |
| --- | --- |
| `worker/site/inject.ts` | Orchestrator, `needsInjection()`, `applyInjection()` |
| `worker/site/blog-inject.ts` | Blog slot selectors |
| `worker/site/hotel-inject.ts` | Venue slot selectors |
| `worker/site/venue-listing.ts` | City card grid, pagination (12/page) |
| `worker/site/hero.ts` | Hero slide HTML generation |
| `worker/site/settings.ts` | Contact/social settings (30s cache) |
| `worker/site/labels.ts` | Section heading text |
| `worker/site/template.ts` | `page_templates` loader (30s cache) |
| `worker/site/render-page.ts` | Chooses database render or injected fallback |

---

## Shell Pages for DB-Only Content

When a venue or article exists in the database but has no file of its own:

| Content type | Shell borrowed from | Constant |
| --- | --- | --- |
| Blog post | `/blogs/when-to-book-a-wedding-venue/` | `BLOG_SHELL_PATH` in `blog.ts` |
| Venue | `/destination-wedding/agra/itc-mughal-agra/` | `HOTEL_SHELL_PATH` in `hotel.ts` |

The shell is loaded from `page_templates` by `shellKey`; if that row is
missing, the borrowed page's own markup is fetched back through the origin and
injected instead.

---

## Caching

| Content | Cache-Control | Served by |
| --- | --- | --- |
| Hashed assets (`/assets/*`) | `max-age=31536000, immutable` | Vercel CDN |
| Static HTML and `/storage/*` | `max-age=0, must-revalidate` | Vercel CDN |
| Managed HTML | `max-age=30` | Function |
| `/media/*` uploads | `max-age=31536000, immutable` | Function → R2 |
| Preview / admin | `no-store`, `X-Robots-Tag: noindex` | Function |

**Admin content change → public visibility:** up to 30 seconds on managed
pages. Pages the database does not own are static and do not change until the
next deploy.

---

## Preview Mode

| | |
| --- | --- |
| **URL** | Any managed page + `?preview=1` |
| **Auth** | Valid admin session cookie |
| **Effect** | Shows draft blogs/venues; no-cache, noindex |
| **Implementation** | `resolvePage(..., { preview })` in `worker/site/resolve-page.ts` |

---

## Labels Injection

Section headings on venue/blog pages come from `site_labels` table, edited at `/admin/labels`.

Examples: `venue.amenities`, `venue.faq`, `blog.toc`, `card.readMore`

Injected by `labels.ts` → used in `hotel-inject.ts`, `blog-inject.ts`.

---

## Media URLs

| Source | URL pattern | Served by |
| --- | --- | --- |
| Static clone | `/storage/hotels/thumbnails/...` | Vercel CDN |
| Admin upload | `/media/{key}` | R2 via `worker/site/media.ts` |

Upload keys are the SHA-256 of the file, so the same picture uploaded twice is
stored once, and an immutable cache is safe.

---

## Admin → Public Rendering Chain

```
Admin saves venue
  → UPDATE hotels
  → Cache invalidation (module-level)
  → Next GET /destination-wedding/{city}/{slug}/
  → loadHotels / resolvePage
  → hotel-inject.applyHotelHandlers
  → Patched HTML to visitor
```

See [Website ↔ Admin Map](./website-admin-map.md) for every admin module's rendering impact.
