# Static pages outside the CMS

Many marketing and legal pages still live only as HTML under `site-public/`. They are served as-is unless the worker injects labels, analytics, or SEO data on top.

## When to edit in place

| Page type | Location | Admin alternative |
| --- | --- | --- |
| Legal (privacy, cookies, terms) | `site-public/*/` | None — edit HTML directly |
| Real weddings, packages | `site-public/real-weddings/`, `site-public/packages/` | None |
| City landing intros (non-listing copy) | `site-public/destination-wedding-in-*/` | City totals and hero copy in `/admin/cities` |
| Venue and blog pages | Built from stored shells | `/admin/hotels`, `/admin/blogs` |

## Safe edit workflow

1. Edit the HTML file under `site-public/`.
2. Run `npm run lint` and `npm run docs:validate`.
3. If the page is linked from navigation or sitemap, run `npm run sitemap:generate`.
4. Deploy — the worker serves the updated static file with managed HTML enhancements (cookie consent, lazy images, skip link).

## Migrating a page into the CMS

1. Capture the page shell in `page_templates` (see existing seeds in `drizzle/`).
2. Move editable fields into the appropriate table (`hotels`, `blog_posts`, `city_pages`, etc.).
3. Add injection logic in `worker/site/inject.ts` if new placeholders are required.
4. Remove or redirect the old static path via `worker/site/public-routes.ts`.

Large binary assets under `site-public/storage/` should stay in R2 or static storage; prefer WebP and reasonable dimensions when adding new images.
