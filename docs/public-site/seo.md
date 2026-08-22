# Public Website — SEO

Technical SEO audit of the customer-facing site.

---

## Metadata Present (Static HTML)

Found on essentially all 367 pages:

| Tag | Present | Notes |
| --- | --- | --- |
| `<title>` | ✓ | Per-page unique titles |
| `<meta name="description">` | ✓ | |
| `<meta name="keywords">` | ✓ | Legacy but present |
| `<link rel="canonical">` | ✓ | Absolute URLs to viraayaweddings.com |
| Open Graph (`og:title`, `og:description`, `og:image`, `og:type`, `og:url`) | ✓ | |
| Twitter Card (`twitter:card`, `twitter:title`, etc.) | ✓ | |
| Google site verification | ✓ | `ydB7h9Qd_UIkEWpYTUby9ZqApwL_3btRIDjVjanKfBA` |
| Google Analytics | ✓ | `G-8KV1YV2GD8` via gtag |
| `<meta name="robots">` | ✗ | Not in static HTML |
| `hreflang` | ✗ | Not present (single locale: en) |
| Schema.org JSON-LD | ✗ | **Zero** `application/ld+json` blocks found |

---

## CMS-Injected SEO

When content is managed via admin, injection handlers override static meta:

| Page type | Injected by | Fields overridden |
| --- | --- | --- |
| Blog post | `blog-inject.ts` | title, description, OG, Twitter, canonical, banner |
| Venue detail | `hotel-inject.ts` | title, description, keywords, OG, Twitter, canonical |
| City listing | `inject.ts` | title, meta description |
| Blog listing | `blog-inject.ts` | listing meta |

**Admin fields:** `seo_title`, `meta_description`, `meta_keywords`, `og_image` on `blog_posts` and `hotels`; `seo_title`, `meta_description` on `city_pages`.

**Draft content:** Not indexed — excluded unless `?preview=1` (served with `X-Robots-Tag: noindex`).

---

## Heading Structure

| Page type | Typical H1 | Notes |
| --- | --- | --- |
| Homepage | Hero slide title | Multiple H2 sections below |
| Venue detail | Hotel name | Injected from `hotels.heading` / name |
| Blog post | Article heading | Injected from `blog_posts.heading` |
| City listing | City name + "Destination Wedding" | Static + injected |
| Contact | "Contact Us" | Static |

**Potential issues:** Some pages may have multiple H1s from static clone — not systematically verified per page.

---

## Technical SEO Gaps

| Item | Status | Impact |
| --- | --- | --- |
| `robots.txt` | **Missing** | Crawlers use default behavior |
| `sitemap.xml` | **Missing** | No automated URL discovery for crawlers |
| Custom 404 page | **Missing** | Platform default 404 |
| Structured data | **Missing** | No rich snippets (Hotel, Article, FAQ schema) |
| Trailing slash consistency | Mixed | Worker 308 redirect on `/wedding-consultation` only |

---

## URL Structure

| Pattern | SEO quality |
| --- | --- |
| `/destination-wedding/{city}/{hotel-slug}/` | Good — descriptive slugs |
| `/blogs/{article-slug}/` | Good |
| `/destination-wedding-in-{city}/` | Good — landing page keywords |
| `/blogs/category/weeding-planning/` | Typo in slug ("weeding" not "wedding") — preserved intentionally |

---

## Internal Linking

| Mechanism | Source |
| --- | --- |
| Megamenu city tabs | Static HTML — all major cities |
| Venue nearby strip | Injected from `hotels.nearby_slugs` |
| City listing cards | Injected from `city_listings` |
| Blog taxonomy links | Static + injected listing cards |
| Footer links | Static — legal, contact, social |

**Orphan pages:** Static-only pages (real-weddings, packages) linked from nav/footer but not from CMS.

---

## Indexability

| Content | Indexable | Condition |
| --- | --- | --- |
| Published CMS content | Yes | Normal crawl |
| Draft CMS content | No | Excluded from published queries |
| Preview URLs | No | `X-Robots-Tag: noindex` |
| Admin panel | No | `noindex` metadata + headers |
| Blocked calculator JSON | N/A | 404 — not HTML |

---

## Pagination

| Page | Pattern | SEO note |
| --- | --- | --- |
| City listing | 12 venues/page → `/hotel-listing?city_ids[]=&page=` | Pagination links injected |
| Blog listing | Single page grid | No pagination |
| Hotel listing filter | Client-side + GET params | |

---

## Duplicate Content Risk

| Scenario | Mitigation |
| --- | --- |
| Static HTML + injected content | Injection replaces content in-place — canonical points to clean URL |
| `/wedding-consultation` vs `/appointment-booking` | Near-identical pages — potential duplicate |
| Static venue page + CMS override | Same URL, content replaced — no duplicate URL |

---

## SEO Issues (see Audit Findings)

Reported separately in [WEBSITE-AUDIT-FINDINGS.md](../WEBSITE-AUDIT-FINDINGS.md) — SEO Issues section.

---

## Admin SEO Workflow

```
Admin edits seo_title / meta_description on venue or blog
  → save action updates Postgres
  → Next request: inject handler replaces <title> and <meta>
  → Visible to crawlers after cache expiry (≤60s)
```

**Files to change for SEO behavior:**
- Admin forms: `app/admin/blogs/_form.tsx`, `app/admin/hotels/[id]/page.tsx`, `app/admin/cities/[city]/page.tsx`
- Injection: `worker/site/blog-inject.ts`, `worker/site/hotel-inject.ts`, `worker/site/inject.ts`
