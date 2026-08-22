# Public Website — Content Management

What content comes from where, and how it reaches visitors.

---

## Content Source Matrix

| Content | Source | Admin location | Rendering |
| --- | --- | --- | --- |
| Homepage hero | Postgres `hero_slides` | `/admin/hero` | `hero.ts` → inject |
| Contact details | Postgres `settings` | `/admin/settings` | `settings.ts` → inject |
| Social links | Postgres `settings` | `/admin/settings` | inject (footer) |
| Section headings | Postgres `site_labels` | `/admin/labels` | `labels.ts` → inject |
| Venue pages | Postgres `hotels` | `/admin/hotels` | `hotel-inject.ts` |
| City listings | Postgres `city_pages` + `city_listings` | `/admin/cities` | `venue-listing.ts` |
| Blog articles | Postgres `blog_posts` | `/admin/blogs` | `blog-inject.ts` |
| Blog taxonomies | Postgres `blog_listings` | `/admin/blogs/sections` | `blog-inject.ts` |
| Uploaded images | R2 + Postgres `media` | `/admin/media` | `/media/{key}` |
| Page shells | Postgres `page_templates` | *(seeded, not editable in admin UI)* | `template.ts` |
| Calculator prices | Worker bundle | *(code change)* | API endpoints |
| Static images | `site-public/storage/` | *(HTML edit)* | Direct serve |
| Real weddings | Static HTML | *(HTML edit)* | Direct serve |
| Packages | Static HTML | *(HTML edit)* | Direct serve |
| Legal pages | Static HTML | *(HTML edit)* | Direct serve |
| Nav/footer structure | Static HTML | *(HTML edit)* | Direct serve |

---

## Rendering Mechanisms

| Mechanism | When used | Files |
| --- | --- | --- |
| **Database render** | `resolvePage()` match | `resolve-page.ts`, `inject.ts` |
| **HTMLRewriter injection** | Static file + managed content | `inject.ts`, `*-inject.ts` |
| **Static serve** | Unmanaged pages | Vercel CDN |
| **Shell + inject** | DB-only slug without static file | `blog.ts`, `hotel.ts` shells |

---

## Caching Impact on Content

| Content type | Cache TTL | Admin change visible after |
| --- | --- | --- |
| Settings | 30s (module cache) | ≤30s |
| Injected HTML pages | 60s | ≤60s |
| Static unmanaged HTML | 300s | ≤300s (unless redeployed) |
| Static assets | 1 year | Requires redeploy/file change |
| R2 media | Immutable long cache | New URLs on upload |

---

## Validation & Sanitization

| Content | Validation |
| --- | --- |
| Rich text (admin) | `worker/admin/rich-text.ts` — strips scripts, dangerous URLs |
| Images (admin) | Magic-byte check — JPEG/PNG/WebP/AVIF only |
| Lead form input | `lead-email.ts` — length limits, type checks |
| Settings URLs | Must start `https://` (admin action validation) |

Public static HTML is **not** sanitized at serve time — trusted clone content.

---

## SEO Content Flow

```
Admin sets seo_title, meta_description on venue/blog/city
  → Stored in Postgres
  → inject handler replaces <title>, <meta>, OG tags
  → Crawler sees updated metadata after cache expiry
```

See [SEO](./seo.md).

---

## Static Content Edit Workflow

For non-CMS pages (real-weddings, packages, legal):

1. Edit HTML file in `site-public/{path}/index.html`
2. Redeploy; the file ships with the next build
3. No admin panel involvement
4. Run `npm run docs:sync` if routes/structure changed

---

## Page Templates (Shells)

**Table:** `page_templates`  
**Seeded from:** `worker/db/page-templates.generated.ts`  
**Not editable via admin UI** — requires code/migration change

| Key | Kind | Used by |
| --- | --- | --- |
| `home` | home | Homepage |
| `contact` | contact | Contact page |
| `venue:a` | venue | Default venue shell |
| `blog:a` | blog | Default blog shell |
| `city` | city | City listing shell |
| `blog-tax:category:{slug}` | blog-listing | Category pages |

Individual venues/posts can override via `shell_key` column.

---

## Content NOT in Database

| Data | Location | Update process |
| --- | --- | --- |
| Hotel listing metadata | `site-public/data/hotel-listing-data.json` | Manual JSON edit |
| Calculator cities/hotels/prices | `worker/calculator-data.ts` + static JSON | Code edit + deploy |
| YouTube embed IDs (static venues) | Static HTML | HTML edit |
| Google Analytics ID | Inline in all pages | HTML edit |
| Megamenu city list | Static HTML | HTML edit |

---

## Admin ↔ Website Content Map

Full dependency diagram: [Website ↔ Admin Map](./website-admin-map.md)
