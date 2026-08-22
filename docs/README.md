# Viraaya Weddings — Master Project Documentation

> **Single source of truth** for developers and AI coding agents working on this repository.

| | |
| --- | --- |
| **Documentation version** | 1.1.0 |
| **Project** | `viraaya-weddings-site` v0.1.0 |
| **Last audited** | See [META.md](./META.md) |
| **Sync status** | Run `npm run docs:validate` |

---

> **These pages still describe the Cloudflare deployment.** The site runs on
> Vercel with Neon Postgres and Cloudflare R2 for uploads only. Anything below
> that mentions Cloudflare Workers, D1, the `ASSETS` binding, `worker/index.ts`
> or the `api/` handlers describes an architecture that is no longer live --
> the first two files were removed once routing moved to the App Router.
>
> Accurate as of now: [03-routes.md](./03-routes.md) for the route map,
> [deployment/vercel-postgres-r2.md](./deployment/vercel-postgres-r2.md) for how
> it is deployed, and `02-admin/` for the panel. The rest is being migrated.

---

## Quick Start

```bash
npm run docs:sync      # Regenerate inventory + validate
npm run docs:validate  # Check code ↔ documentation sync
npm run docs:inventory # Scan codebase only
```

---

## Table of Contents

### Core

| # | Document | Scope |
| --- | --- | --- |
| — | [META.md](./META.md) | Version, timestamps, change history |
| 1 | [Architecture](./01-architecture.md) | System design, deployment, data flow |
| 2 | [Admin Panel](./02-admin/README.md) | **Complete** admin CMS documentation |
| 3 | [Route Map](./03-routes.md) | All app + worker routes |
| 4 | [API Reference](./04-api.md) | HTTP endpoints, request/response |
| 5 | [Database](./05-database.md) | D1 schema, tables, relationships |
| 6 | [Authentication & Authorization](./06-auth.md) | Sessions, roles, guards |
| 7 | [Workflows](./07-workflows.md) | End-to-end process flows |
| 8 | [Integrations](./08-integrations.md) | Resend, R2, Cloudflare bindings |
| 9 | [Configuration](./09-configuration.md) | Env vars, build config |
| 10 | [Reusable Components](./10-components.md) | Shared admin UI primitives |
| 11 | [File Index](./11-file-index.md) | Searchable file inventory |
| 12 | [Dependency Map](./12-dependency-map.md) | Module relationships |
| 13 | [Change Impact Map](./13-change-impact.md) | What breaks when X changes |
| 14 | [Troubleshooting](./14-troubleshooting.md) | Common problems |
| 15 | [AI Agent Instructions](./15-ai-agent-instructions.md) | How agents should use this docs |
| 16 | [Documentation Sync System](./16-sync-system.md) | How sync/validation works |
| — | [Documentation Coverage Report](./DOCUMENTATION-COVERAGE-REPORT.md) | Coverage metrics from audit |

### Admin Panel Detail

| Document | Contents |
| --- | --- |
| [Admin Overview](./02-admin/README.md) | Modules, navigation, roles |
| [Admin Routes](./02-admin/routes.md) | Every `/admin/*` route |
| [Server Actions](./02-admin/actions.md) | Every server action |
| [Form Fields](./02-admin/forms.md) | Every form field |
| [Admin Workflows](./02-admin/workflows.md) | CRUD flows per module |

### Public Website (Complete)

| Document | Contents |
| --- | --- |
| [Website Overview](./public-site/README.md) | Architecture, key facts, index |
| [Website Routes](./public-site/routes.md) | All 367+ URL patterns |
| [Page Types](./public-site/page-types.md) | Page taxonomy and UI anatomy |
| [Public Forms](./public-site/forms.md) | Every lead/enquiry form |
| [JavaScript](./public-site/javascript.md) | Client-side behavior |
| [Rendering & Injection](./public-site/rendering.md) | HTMLRewriter, D1 shells |
| [Search & Calculator](./public-site/search-calculator.md) | Discovery and pricing tools |
| [Booking & Consultation](./public-site/booking-consultation.md) | Appointment flows |
| [SEO](./public-site/seo.md) | Metadata, gaps, admin overrides |
| [Content Management](./public-site/content-management.md) | CMS vs static content |
| [Website ↔ Admin Map](./public-site/website-admin-map.md) | Admin change → site effect |
| [Website Workflows](./public-site/workflows.md) | Visitor end-to-end flows |
| [Website Architecture](./public-site/architecture.md) | Public app layer |

### Backend & Infrastructure

| Section | Status |
| --- | --- |
| [Backend / Worker](./backend/README.md) | Worker modules documented |
| [Testing](./testing/README.md) | Placeholder |
| [Deployment](./deployment/README.md) | Partial — see Architecture |
| [Security](./security/README.md) | Public + admin security |
| [Technical Debt](./technical-debt/README.md) | See audit findings |

### Separate (not master docs)

| Document | Purpose |
| --- | --- |
| [AUDIT-FINDINGS.md](./AUDIT-FINDINGS.md) | Admin bugs/issues |
| [WEBSITE-AUDIT-FINDINGS.md](./WEBSITE-AUDIT-FINDINGS.md) | Website bugs/issues |

---

## Project Summary

**Viraaya Weddings** is a hybrid static-site + CMS deployment:

- **Public site**: Cloned HTML in `site-public/`, served via Cloudflare Workers with runtime HTML injection from D1.
- **Admin panel**: Next.js-compatible App Router UI at `/admin/*` (Vinext on Vite).
- **Database**: Cloudflare D1 (SQLite) via Drizzle ORM — schema at `worker/db/schema.ts`.
- **Storage**: Cloudflare R2 for admin-uploaded images.
- **Email**: Resend API for lead notifications.
- **Deployment**: OpenAI Sites / Cloudflare Workers via `.openai/hosting.json`.

---

## Glossary

| Term | Meaning |
| --- | --- |
| **Vinext** | Vite-based Next.js App Router compatibility layer |
| **D1** | Cloudflare's SQLite edge database |
| **R2** | Cloudflare object storage (media bucket) |
| **Shell** | HTML page template in `page_templates` table |
| **Injection** | HTMLRewriter patches static HTML with DB content at request time |
| **Lead** | Form submission stored in `leads` table |
| **Venue** | Hotel/venue page (`hotels` table) at `/destination-wedding/<city>/<slug>` |
