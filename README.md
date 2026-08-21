# Viraaya Weddings Website

Production-ready clone of [viraayaweddings.com](https://viraayaweddings.com) on **Vercel** (PostgreSQL + Vinext admin) with **Cloudflare R2** for uploaded media and Resend for lead email.

## Requirements

- Node.js `>=22.13.0` (CI uses 24.x)
- npm
- Optional: Python 3 for render verification scripts

## Commands

```bash
npm install
npm run dev          # Vinext dev server
npm run build        # Production bundle (set NITRO_PRESET=vercel for Vercel)
npm run db:migrate   # Apply PostgreSQL migrations (requires DATABASE_URL)
npm run lint
npm run test         # Node unit tests
npm run docs:validate
npm run docs:sync    # Regenerate docs after behaviour changes
npm run sitemap:generate
```

## Project layout

| Path | Purpose |
| --- | --- |
| `site-public/` | Static HTML, CSS, JS, images (~370 pages) |
| `worker/` | Shared server logic (DB, R2, lead email, legacy HTML injection) |
| `app/admin/` | CMS admin panel (Vinext App Router) |
| `app/api/` | Public API routes (lead, currencies, etc.) |
| `drizzle-pg/` | PostgreSQL migrations |
| `drizzle/` | Legacy SQLite/D1 migrations (reference only) |
| `docs/` | Architecture and runbooks (`docs/README.md`) |

Generated folders (`dist/`, `.next/`, `.vinext/`, `.wrangler/`, `tmp/`, `output/`, `outputs/`) are gitignored and regenerated locally. Do not commit audit scratch files or Chrome profile dumps under `tmp/`.

## Deployment

See **[docs/deployment/vercel-postgres-r2.md](docs/deployment/vercel-postgres-r2.md)**.

1. Create Postgres (Neon or Vercel Postgres) and set `DATABASE_URL`.
2. Create an R2 bucket and API token; set `R2_*` env vars in Vercel.
3. `npm run db:migrate` (or let the app migrate on first request).
4. Deploy to Vercel (`vercel.json` uses `NITRO_PRESET=vercel`).

Set secrets: `RESEND_*`, `DATABASE_URL`, `R2_*` (see `.env.example` and `docs/09-configuration.md`).

## Pre-commit hooks

Optional docs guard: copy `.githooks/pre-commit` into `.git/hooks/pre-commit` and make it executable, or run `git config core.hooksPath .githooks` locally.

## Verification

CI runs lint, docs validation, unit tests, and build. Python render checks (`build/verify-*-render.py`) run when Python is available — start the dev server on port 8799 before running them locally.
