# Backend / Worker

Documentation for the Cloudflare Worker runtime that serves both the public website and admin panel.

**Entry point:** `worker/index.ts` (861 lines)

---

## Module Map

| Directory | Purpose | Documented in |
| --- | --- | --- |
| `worker/index.ts` | Main fetch router, caching, security headers | [Architecture](../01-architecture.md) |
| `worker/lead-email.ts` | Lead capture, validation, Resend | [API](../04-api.md), [Public Forms](../public-site/forms.md) |
| `worker/calculator-data.ts` | Static pricing/search dataset | [Search & Calculator](../public-site/search-calculator.md) |
| `worker/db/` | D1 schema, client, migrations | [Database](../05-database.md) |
| `worker/admin/` | Session, passwords, media, leads, rich-text | [Auth](../06-auth.md), [Admin](../02-admin/README.md) |
| `worker/site/` | Public HTML injection layer | [Rendering](../public-site/rendering.md) |

---

## Worker Site Modules (`worker/site/`)

| File | Purpose |
| --- | --- |
| `inject.ts` | HTMLRewriter orchestrator, `needsInjection()` |
| `resolve-page.ts` | URL → D1 template + content bundle |
| `blog.ts` | Blog path parsing, data loading |
| `blog-inject.ts` | Blog HTML slot replacement |
| `hotel.ts` | Venue path parsing, data loading |
| `hotel-inject.ts` | Venue HTML slot replacement |
| `venue-listing.ts` | City card grid, pagination |
| `hero.ts` | Homepage carousel rendering |
| `settings.ts` | Site settings loader (30s cache) |
| `labels.ts` | Section heading loader |
| `template.ts` | `page_templates` queries |
| `media.ts` | R2 media serving at `/media/*` |

---

## Request Routing Priority

See [Public Website Architecture](../public-site/architecture.md) for full flow.

1. `/admin/*` → Vinext app router
2. JSON/API endpoints → lead, calculator, search handlers
3. `resolvePage()` → full D1 HTML render
4. ASSETS static fetch → optional injection
5. Shell fallback for DB-only slugs
6. Platform 404

---

## Legacy Handlers

| File | Purpose |
| --- | --- |
| `api/lead.ts` | Node dev fallback for leads |
| `api/currencies.ts` | Node dev fallback for currencies |

Production uses worker handlers exclusively.

---

## Build & Deploy

Worker built via `npm run build` → `dist/server/`.  
Wrangler config generated at `dist/server/wrangler.json`, patched by `build/sites-vite-plugin.ts`.

See [Deployment](./../deployment/README.md).
