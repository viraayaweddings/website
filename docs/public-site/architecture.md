# Public Website — Architecture

Technical architecture of the customer-facing application layer.

---

## Stack

| Layer | Technology |
| --- | --- |
| Pages | Static HTML (cloned site) |
| Runtime | Cloudflare Worker |
| Content | D1 SQLite + HTMLRewriter |
| Media | R2 + static `/storage/` |
| Client JS | jQuery, Bootstrap, vanilla JS |
| CSS | `site-public/user/assets/css/style.css` |
| No SPA framework | — |

---

## Layer Diagram

```
┌─────────────────────────────────────────────────┐
│  Browser                                         │
│  ├── Static HTML (from ASSETS or D1 template)   │
│  ├── site-public/js/*.js                        │
│  ├── user/assets/js/custom.js                   │
│  └── Inline page scripts                         │
└──────────────────────┬──────────────────────────┘
                       │ HTTP
┌──────────────────────▼──────────────────────────┐
│  Cloudflare Worker (worker/index.ts)             │
│  ├── Route to ASSETS (site-public)               │
│  ├── resolvePage() → D1 full render              │
│  ├── inject.ts → HTMLRewriter patches            │
│  ├── Lead API → lead-email.ts                   │
│  ├── Calculator API → calculator-data.ts         │
│  └── /media/* → R2                               │
└──────────────────────┬──────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
    ASSETS          D1 DB         R2 MEDIA
 (site-public)   (CMS content)  (uploads)
```

---

## Content Sources by Priority

For any URL, worker tries in order:

1. **Admin/API routes** → Vinext app
2. **JSON/API endpoints** → worker handlers
3. **D1 resolvePage** → full template from `page_templates`
4. **Static ASSETS** → `site-public/{path}/index.html`
5. **Injection** → patch static HTML with D1 content
6. **Shell fallback** → DB-only blog/venue via borrowed shell
7. **404** → platform default

---

## Security Model (Public)

| Control | Implementation |
| --- | --- |
| CSP | `form-action 'self'` — forms submit same-origin only |
| HSTS | On HTTPS responses |
| X-Frame-Options | SAMEORIGIN |
| Same-origin API guard | Calculator + lead endpoints |
| No public auth | All visitor pages anonymous |
| Preview gate | Admin session for `?preview=1` |

Full security audit: [WEBSITE-AUDIT-FINDINGS.md](../WEBSITE-AUDIT-FINDINGS.md)

---

## Performance Characteristics

| Aspect | Behavior |
| --- | --- |
| SSR | Worker-side HTML injection (not React SSR) |
| Static assets | 1-year immutable cache |
| HTML cache | 60s (managed) / 300s (static) |
| JS bundle | Multiple separate files, no bundler |
| Images | Large static `/storage/` (~280MB) + R2 uploads |
| Calculator data | In-memory in worker (large bundle) |
| Third-party scripts | Google Analytics only |

---

## Deployment

Public site deploys with the worker — no separate frontend build.

```
npm run build → dist/ → Cloudflare Workers + ASSETS binding
```

See [Architecture](../01-architecture.md) and [Deployment](../deployment/README.md).

---

## Relationship to Admin Panel

| Concern | Public | Admin |
| --- | --- | --- |
| URL prefix | `/` (except `/admin`) | `/admin/*` |
| Framework | Static HTML + injection | Vinext/React SSR |
| Auth | None | Session cookie |
| Cache | 60–300s | no-store |
| Data writes | Leads only (forms) | Full CMS CRUD |

See [Website ↔ Admin Map](./website-admin-map.md).

---

## Key Files

| File | Role |
| --- | --- |
| `worker/index.ts` | Public request router |
| `worker/site/inject.ts` | HTMLRewriter |
| `worker/site/resolve-page.ts` | D1 page resolution |
| `worker/lead-email.ts` | Form handler |
| `worker/calculator-data.ts` | Pricing/search data |
| `site-public/js/lead-forms.js` | Form client |
| `site-public/index.html` | Homepage shell |
