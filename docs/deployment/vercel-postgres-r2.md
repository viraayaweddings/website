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

Admin uploads already go to R2. To bulk-upload existing files:

```bash
node scripts/upload-static-images-to-r2.mjs --dry-run
node scripts/upload-static-images-to-r2.mjs
```

The `/storage/...` paths in the cloned HTML are served from the CDN and do not
need migrating; only uploads use R2.

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
