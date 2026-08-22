# Public Website — Architecture

Technical architecture of the customer-facing layer.

---

## Stack

| Layer | Technology |
| --- | --- |
| Pages | Static HTML, cloned from the original site |
| Runtime | Vercel serverless function (Node 24), plus the Vercel CDN |
| Content | Neon Postgres, injected through HTMLRewriter |
| Media | R2 uploads at `/media/*`, plus static `/storage/` |
| Client JS | jQuery, Bootstrap, vanilla JS |
| CSS | `site-public/user/assets/css/style.css` |
| No SPA framework | — |

---

## Layer Diagram

```
┌──────────────────────────────────────────────────┐
│  Browser                                          │
│  ├── HTML (CDN file, or rendered from the DB)    │
│  ├── site-public/js/*.js                         │
│  ├── user/assets/js/custom.js                    │
│  └── Inline page scripts                          │
└──────────────────────┬───────────────────────────┘
                       │ HTTP
┌──────────────────────▼───────────────────────────┐
│  Vercel routing (.vercel/output/config.json)      │
│  ├── redirects                                    │
│  ├── rewrite database-owned paths → function      │
│  ├── handle: filesystem → CDN                     │
│  └── catch-all → function                         │
└──────────┬───────────────────────────┬───────────┘
           │                           │
           ▼                           ▼
   Static file from CDN        Serverless function
   (about-us, faqs, images)    ├── render-page.ts
                               ├── inject via HTMLRewriter
                               └── shell fallback via origin
                                        │
                            ┌───────────┴──────────┐
                            ▼                      ▼
                      Neon Postgres            R2 (uploads)
```

Most of the site never reaches the function at all. Only the paths the database
owns are rewritten to it.

---

## Content sources by priority

For a URL that reaches the function:

1. **App-owned prefix** (`/admin`, `/api`, `/media`, …) → App Router
2. **Redirect** → 301 for a retired URL
3. **`resolvePage()`** → shell from `page_templates`, filled with database content
4. **Original markup** → fetched back through the origin, then injected
5. **404** → the site's own `404.html`

---

## Security Model (Public)

| Control | Implementation |
| --- | --- |
| CSP | `form-action 'self'` — forms submit same-origin only |
| HSTS | On HTTPS responses |
| X-Frame-Options | SAMEORIGIN |
| Same-origin guard | Lead endpoints and the admin upload route |
| No public auth | Every visitor page is anonymous |
| Preview gate | Admin session required for `?preview=1` |

---

## Performance Characteristics

| Aspect | Behaviour |
| --- | --- |
| Rendering | Server-side HTML rewriting, not React SSR |
| Static pages | Served by the CDN; no function invocation |
| Managed pages | ~0.3–0.9s, `max-age=30` |
| Hashed assets | 1-year immutable cache |
| Images | ~280MB of static `/storage/` plus R2 uploads |
| Calculator data | Bundled into the function |
| Third-party scripts | Google Analytics only |

The function runs in `sin1` alongside the database. Splitting them across
regions previously cost ~250ms on every query.

---

## Deployment

The public site deploys as part of the same build — there is no separate
frontend build.

```
npm run build → .vercel/output/{static,functions,config.json}
```

See [Architecture](../01-architecture.md) and
[Deployment](../deployment/vercel-postgres-r2.md).

---

## Relationship to the Admin Panel

| Concern | Public | Admin |
| --- | --- | --- |
| URL prefix | `/` (except app-owned prefixes) | `/admin/*` |
| Rendering | Static HTML, or shell + injection | Vinext/React on the server |
| Auth | None | Session cookie |
| Cache | `max-age=30` managed, revalidate for static | `no-store` |
| Data writes | Leads only, via forms | Full CMS CRUD |

See [Website ↔ Admin Map](./website-admin-map.md).

---

## Key Files

| File | Role |
| --- | --- |
| `app/[[...path]]/route.ts` | Public request handler |
| `worker/site/render-page.ts` | Database render, or patch the original markup |
| `worker/site/resolve-page.ts` | URL → stored shell + content |
| `worker/site/inject.ts` | HTMLRewriter orchestrator |
| `worker/lead-email.ts` | Form handler |
| `worker/calculator-data.ts` | Pricing and search data |
| `site-public/js/lead-forms.js` | Form client |
| `site-public/index.html` | Homepage markup |
