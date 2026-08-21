# Public Website — Rendering & Injection

How static HTML becomes CMS-managed content at request time.

---

## Request Flow

**Entry:** `worker/index.ts`

```
GET /path
  1. Admin route? → Vinext app (no cache)
  2. JSON/API path? → calculator/lead handlers
  3. resolvePage() succeeds? → Full D1 HTML + inject (60s cache)
  4. Fetch static HTML from ASSETS (site-public)
  5. needsInjection()? → HTMLRewriter patches (60s cache)
  6. 404 + DB slug? → serveBlogFromShell / serveHotelFromShell
  7. Fallback → Vinext handler or platform 404
```

---

## Two Rendering Models

| Model | When | Source |
| --- | --- | --- |
| **Database-only** | `resolvePage()` returns content | `page_templates` HTML + D1 data |
| **Static + injection** | Static file exists + `needsInjection()` | `site-public` shell + HTMLRewriter patches |
| **Static only** | No injection needed | `site-public` as-is (300s cache) |

If D1 fails, database-only pages fall back to static files where they exist.

---

## Page Resolution (`worker/site/resolve-page.ts`)

Maps URL → D1 template + content bundle.

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
| `worker/site/template.ts` | `page_templates` loader |

---

## Shell Pages for DB-Only Content

When a venue/blog exists in D1 but has no static file:

| Content type | Shell borrowed from | Constant |
| --- | --- | --- |
| Blog post | `/blogs/when-to-book-a-wedding-venue/` | `BLOG_SHELL_PATH` in `blog.ts` |
| Venue | `/destination-wedding/agra/itc-mughal-agra/` | `HOTEL_SHELL_PATH` in `hotel.ts` |

Worker fetches shell HTML from ASSETS, then applies injection handlers.

---

## Caching

| Content | Cache-Control | File |
| --- | --- | --- |
| Static assets (CSS/JS/images) | `max-age=31536000, immutable` | `worker/index.ts` |
| Unmanaged HTML | `max-age=300, stale-while-revalidate=86400` | |
| Injected/managed HTML | `max-age=60` | |
| Preview / admin | `no-store`, `X-Robots-Tag: noindex` | |

**Admin content change → public visibility:** Up to 60 seconds delay for injected pages.

---

## Preview Mode

| | |
| --- | --- |
| **URL** | Any managed page + `?preview=1` |
| **Auth** | Valid admin session cookie |
| **Effect** | Shows draft blogs/venues; no-cache, noindex |
| **Implementation** | `isPreviewRequest()` in `worker/index.ts` |

---

## Labels Injection

Section headings on venue/blog pages come from `site_labels` table, edited at `/admin/labels`.

Examples: `venue.amenities`, `venue.faq`, `blog.toc`, `card.readMore`

Injected by `labels.ts` → used in `hotel-inject.ts`, `blog-inject.ts`.

---

## Media URLs

| Source | URL pattern | Served by |
| --- | --- | --- |
| Static clone | `/storage/hotels/thumbnails/...` | ASSETS |
| Admin upload | `/media/{key}` | R2 via `worker/site/media.ts` |
| Optimized | `/_vinext/image?url=...` | Cloudflare Images |

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
