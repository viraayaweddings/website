# Vercel + PostgreSQL + R2

The app no longer uses Cloudflare Workers or D1. Runtime target is **Vercel** with:

| Concern | Service |
|--------|---------|
| App (admin, APIs, `/media/*`) | Vercel (Vinext / Nitro `vercel` preset) |
| Database | PostgreSQL (`DATABASE_URL` — Neon or Vercel Postgres) |
| Uploaded images | Cloudflare **R2 only** (S3-compatible API) |
| Static marketing HTML | `site-public/` (served as static assets) |

R2 is the only remaining Cloudflare product. Workers, D1, and Wrangler bindings are removed from the build.

## 1. Environment variables (Vercel project settings)

Copy from `.env.example`:

- `DATABASE_URL` — Postgres connection string
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- Resend keys for lead email (unchanged)

Optional: `R2_PUBLIC_BASE_URL` if you front R2 with a custom CDN domain.

## 2. Database

```bash
npm install
npm run db:migrate
```

Migrations live in `drizzle-pg/`. On first admin request, the app also runs migrations and seeds page templates.

Create the first admin user at `/admin/setup` after deploy.

**Seed content** (blogs, hotels, hero slides, etc.) previously lived in SQLite `drizzle/*.sql` files. Those are not applied to Postgres automatically. Options:

- Re-enter content via admin, or
- Export from a D1 backup and import into Postgres (contact dev for a one-off import script).

## 3. Move images to R2

Admin uploads already go to R2. To bulk-upload existing files from `site-public/`:

```bash
node scripts/upload-static-images-to-r2.mjs --dry-run
node scripts/upload-static-images-to-r2.mjs
```

Then update DB image keys / HTML references to `/media/<key>` as needed. A full reference rewrite is a follow-up task if you want every legacy `/storage/...` path migrated.

## 4. Deploy on Vercel

`vercel.json` uses:

- `NITRO_PRESET=vercel npm run build`
- Output directory `.output`

Connect the GitHub repo and add the env vars above.

## 5. Known gap: public HTML injection

The old Cloudflare Worker rewrote static HTML at request time (hero, blogs, hotels, contact details). That worker entry is **not** used on Vercel yet. Static pages still serve from `site-public/` as exported HTML; live CMS-driven changes on the public site require porting that logic to Vinext middleware or SSR (next migration phase).

Admin panel, lead capture, and `/media/*` work on Vercel once env vars and Postgres are configured.
