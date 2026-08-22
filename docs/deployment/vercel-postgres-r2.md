# Vercel + Postgres + R2

| Concern | Service |
| --- | --- |
| App (admin, APIs, `/media/*`, managed pages) | Vercel serverless function, Nitro `vercel` preset |
| Database | Neon Postgres (`ap-southeast-1`) |
| Uploaded images | Cloudflare R2, over the S3 API |
| Static marketing HTML | `site-public/`, served by the Vercel CDN |

R2 is the only Cloudflare product still in use, and it is reached as plain S3.
There are no Workers, no D1 and no Wrangler bindings.

## 1. Environment variables

Set in **Project → Environment Variables**, for Production and Preview. See
[Configuration](../09-configuration.md#environment-variables) for the full list
and what each one does.

- `DATABASE_URL`, or let the Neon integration provide `POSTGRES_URL`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_TO_EMAIL` / `LEAD_EMAIL_TO`

Two traps worth knowing before you start:

- **Team-level variables do nothing until linked.** A variable added on the
  team's Environment Variables page still has to be linked to the project on
  the project's own **Shared** tab, or the runtime never sees it.
- **`R2_SECRET_ACCESS_KEY` is not the token value.** The R2 token screen shows
  *Token value* (53 chars), *Access Key ID* (32 hex) and *Secret Access Key*
  (64 hex). The S3 API wants the last one. The wrong one gives
  `SignatureDoesNotMatch`, which reads like a bad key rather than a wrong field.

## 2. Database

```bash
npm install
npm run db:migrate
```

Migrations live in `drizzle-pg/` and are also bundled, so the app applies them
itself on the first request to a new instance. Create the first admin at
`/admin/setup` — that screen disables itself permanently once any user exists.

**Seed content.** Venues, articles, hero slides, labels and the page shells all
ship with the app. Import them from **Contact details → Import site content**,
or `POST /admin/seed` as a signed-in admin.

The import can exceed the function's time limit on a cold database and stop
part-way; it is safe to run again, and it only inserts what is missing. If it
stops before the shells are written, `page_templates` will be empty and every
managed page falls back to its original markup — visible as a public site that
ignores admin edits.

## 3. Images

Admin uploads go to R2 and are recorded in `media`, which is what makes an
image appear at `/admin/media`.

The images that shipped with the clone are a separate matter: 1,768 content
files under `site-public/storage` and `site-public/uploads`, referenced from
1,431 places in the database, none of them in `media` and none replaceable from
the panel. `scripts/migrate-images-to-r2.mjs` moves them:

```bash
vercel env pull .env.vercel.local     # R2 credentials live only in Vercel
node --env-file=.env.local scripts/migrate-images-to-r2.mjs --dry-run
node --env-file=.env.local --env-file=.env.vercel.local   scripts/migrate-images-to-r2.mjs --apply
```

It hashes first, so identical files share one object and a second run is a
no-op. It repoints all three shapes the references take: the seven single-image
columns, the `hotels.highlights` JSON, and the `<img>` tags inside the sixteen
stored page shells.

Two deliberate exclusions. SVG stays on the static path -- the panel refuses SVG
uploads because the format can carry script, and serving one from `/media`
would route around that. `site-public/user/assets` and `site-public/vendor` stay
too: they are the theme's own chrome, referenced from stylesheets rather than
from anything the panel edits.

The image files under `site-public` are left in place as the fallback, but their
*references* are repointed too, by `scripts/repoint-static-images.mjs`:

```bash
node scripts/repoint-static-images.mjs --dry-run
node scripts/repoint-static-images.mjs --apply
```

That second pass matters more than it looks. Thirteen of the fifty-three cities
have no `city_pages` row, so their pages are served from the cloned file rather
than rendered from a shell, and every managed page falls back to its file when a
shell is missing. Without it, changing a picture in the panel would visibly fail
to take on exactly those pages. It rewrote 5,749 references across 349 files and
found no path without an object.

Note that `/media/<key>` sets a one-year immutable cache while the static path is
served `max-age=0, must-revalidate`, so migrating an image makes it cheaper to
serve, not dearer.

The render-diff harnesses in `build/` compare rendered pages against the static
originals and will report every migrated `<img src>` as a difference. That is
the migration showing up, not a regression.

## 4. Deploy

`vercel.json` sets the build command, the install command, `framework: null`,
and pins the function to `sin1`. Connect the GitHub repo and add the variables
above.

**Keep the region pin.** Neon is in Singapore; Vercel defaults to Washington,
and the split cost ~250ms on every query — an admin page went from ~300ms to
over two seconds. See
[Configuration](../09-configuration.md#function-region).

The build ends with `scripts/verify-vercel-output.mjs`, which fails rather than
shipping an output with no routing config. That failure mode is otherwise
silent: the build reports success and every URL on the deployed site returns a
platform 404.

## 5. Verifying a deployment

| Check | Expected |
| --- | --- |
| `GET /api/health/db` | `{"ok":true}` |
| `GET /api/health/html` | `{"ok":true,"rewriter":"available"}` |
| `GET /admin/health/r2` (admin) | `{"ok":true,...,"roundTrip":"put/head/delete"}` |
| `x-vercel-id` response header | `bom1::sin1::…` |
| `GET /` | 200, `cache-control: public, max-age=30` |
| `GET /about-us` | 200, `max-age=0, must-revalidate` (CDN) |

The `max-age` difference is how you tell a database-rendered page from a static
one without opening either.
