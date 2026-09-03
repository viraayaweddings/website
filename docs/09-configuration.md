# Configuration

Environment variables, build config, and deployment settings.

**Never commit secrets.** Use `.env.local` (gitignored) for local development.

---

## Environment Variables

Set in Vercel under **Project → Environment Variables**, for Production and
Preview. Variables added at the team level do nothing until they are *linked*
to the project on its own **Shared** tab.

### Database

| Variable | Required | Used by | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | One of these | `worker/env.ts` | Postgres connection string |
| `POSTGRES_URL` | One of these | `worker/env.ts` | Set by the Neon integration |
| `POSTGRES_PRISMA_URL` | Fallback | `worker/env.ts` | Pooled, also from Neon |
| `DATABASE_URL_UNPOOLED` | Fallback | `worker/env.ts` | Direct connection |
| `POSTGRES_URL_NON_POOLING` | Fallback | `worker/env.ts` | Direct connection |
| `POSTGRES_URL_NON_POOLED` | Fallback | `worker/env.ts` | Another Neon spelling of the same thing |
| `POSTGRES_URL_NO_SSL` | Last resort | `worker/env.ts` | Used only if nothing above is set |
| `DATABASE_SSL_NO_VERIFY` | No | `worker/db/client.ts` | `"true"` downgrades TLS to `require`, skipping certificate verification |

`getDatabaseUrl()` takes the first of these that looks like a Postgres URL —
tried in exactly the order listed — so the Neon integration works without
renaming anything. Pooled URLs come first deliberately.

`DATABASE_SSL_NO_VERIFY` exists for corporate networks that intercept TLS, where
the certificate the client sees is not Neon's. It must be set deliberately;
otherwise the client verifies with `rejectUnauthorized: true`. **Do not set it in
production** — it disables the check that the database is the real one.

### Object storage (Cloudflare R2)

| Variable | Required | Used by | Purpose |
| --- | --- | --- | --- |
| `R2_ACCOUNT_ID` | For uploads | `worker/env.ts` | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | For uploads | `worker/env.ts` | 32-char hex from the R2 API token |
| `R2_SECRET_ACCESS_KEY` | For uploads | `worker/env.ts` | **64-char hex**, not the token value |
| `R2_BUCKET_NAME` | For uploads | `worker/env.ts` | Bucket, e.g. `viraaya-media` |
| `R2_BUCKET` | Alias | `worker/env.ts` | Accepted when `R2_BUCKET_NAME` is unset |
| `R2_PUBLIC_BASE_URL` | No | `worker/env.ts` | Custom domain in front of the bucket |
| `MEDIA_PUBLIC_BASE_URL` | No | `worker/env.ts` | Alias for the above, used when it is unset |

All four of the first group must be present or `getR2Config()` returns null and
uploads are refused. The token creation screen shows three fields; the S3 API
needs **Secret Access Key**, not **Token value** — using the latter gives
`SignatureDoesNotMatch`, which reads like a wrong key rather than a wrong field.

Check it with `GET /admin/health/r2`, which round-trips an object and reports
the real error.

### Email (Resend)

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | Prod: yes | — | Resend API auth |
| `RESEND_FROM_EMAIL` | Prod: yes | — | Sender address |
| `RESEND_REPLY_TO` | No | — | Reply-to address |
| `RESEND_TO_EMAIL` / `LEAD_EMAIL_TO` | Prod: yes | — | Where lead notifications go |
| `LEAD_EMAIL_SUBJECT` | No | `Website Query` | Subject prefix |
| `RESEND_ALLOW_INSECURE_LOCAL_TLS` | No | unset | `"true"` sends the Resend call over Node's https with certificate verification off. **Local only** — for TLS-intercepting networks; ignored on a Workers runtime |

### Platform and tooling

| Variable | Set by | Used by | Purpose |
| --- | --- | --- | --- |
| `VERCEL` | Vercel | `worker/site/media.ts`, `app/[[...path]]/route.ts` | Present on Vercel; selects the fetch-through-origin path for the static fallback instead of a local file read |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel | `worker/site/media.ts`, `app/[[...path]]/route.ts` | Sent as `x-vercel-protection-bypass` when the function fetches a static file back through its own origin. **Without it, that fallback fails on a password-protected preview deployment** — the fetch gets the login page instead of the file, so legacy images and shell fallbacks 404 on previews while working in production |
| `NODE_ENV` | Toolchain | Various | Standard |
| `SITE_ORIGIN` | No | `scripts/generate-sitemap.mjs` | Origin for generated sitemap URLs. Defaults to `https://viraayaweddings.com` |
| `RESEND_ALLOW_INSECURE_LOCAL_TLS` | No | false | Local corporate-proxy testing only |

**Template:** `.env.example`

---

## Function region

`vercel.json` pins `"regions": ["sin1"]`. **Do not remove it.**

Neon is in `ap-southeast-1`; Vercel defaults functions to `iad1` (Washington).
With the two apart, every query paid a ~250ms trans-Pacific round trip, and an
admin page makes several in sequence. Measured before and after:

| Route | `iad1` | `sin1` |
| --- | --- | --- |
| `/admin` cold | 8,401ms | 633ms |
| `/admin` warm | ~2,400ms | 305ms |
| `/admin/leads` | 2,353ms | 200ms |

Verify with the `x-vercel-id` response header: `bom1::sin1::…` is right,
`bom1::iad1::…` means the pin was lost. If the database moves, move this with it.

---

## Build Configuration

### `vercel.json`

| Setting | Value |
| --- | --- |
| `buildCommand` | `NITRO_PRESET=vercel npm run build` |
| `installCommand` | `npm install` |
| `framework` | `null` — the Build Output is deployed directly |
| `regions` | `["sin1"]` |

### `vite.config.ts`

| Setting | Value |
| --- | --- |
| `publicDir` | `site-public` |
| `ssr.external` | `html-rewriter-wasm` — must not be bundled |
| Nitro `preset` | `vercel` |
| Nitro `publicAssets` | `site-public` registered explicitly |
| Nitro `routeRules` | Redirects, emitted ahead of the filesystem handler |
| Nitro `traceDeps` | `html-rewriter-wasm*` |
| Nitro `vercel.config.routes` | Rewrites for database-owned paths |

`html-rewriter-wasm` has to stay a live import. Its CJS glue reads the `.wasm`
through a `__dirname`-relative `readFileSync` and requires `./asyncify.js`
relatively; bundled, neither resolves and the function throws at module load,
so **every** route returns 500.

### `drizzle.config.ts`

| Setting | Value |
| --- | --- |
| Schema | `./worker/db/schema.ts` |
| Output | `./drizzle-pg` |
| Dialect | PostgreSQL |

### `package.json`

| Script | Command |
| --- | --- |
| `dev` | `vinext dev` |
| `build` | `vinext build && node scripts/verify-vercel-output.mjs` |
| `start` | `vinext start` |
| `test` | `node --test tests/*.test.mjs` |
| `lint` | ESLint on app/worker/config |
| `db:migrate` | Apply Postgres migrations |
| `db:seed` | Seed content |
| `test:ci` | `test` then `build` |
| `lint` | ESLint on app/worker/config |
| `docs:inventory` / `docs:validate` / `docs:sync` | Documentation tooling |

The build ends with a check that the Vercel output is deployable: `config.json`
present, a filesystem handler, a route to the function, and `static/index.html`.
A Nitro misconfiguration can otherwise produce a build that reports success and
deploys with no routes at all.

#### The production deploy chain

`vercel.json` sets `buildCommand` to `npm run vercel-build`, so **this is what
runs on every deployment** — not `npm run build`:

```
vercel-build
  = NITRO_PRESET=vercel npm run build      # vinext build + verify-vercel-output
  + npm run db:deploy
      = db:migrate --if-configured         # apply drizzle-pg migrations
      + pages:deploy                       # seed-static-pages.mjs   --apply --if-configured
      + templates:deploy                   # seed-page-templates.mjs --apply --if-configured
      + stored:deploy                      # migrate-stored-pages.mjs --apply --if-configured
      + cities:deploy                      # retire-cities-db.mjs    --apply --if-configured
      + media:cleanup                      # cleanup-watermarked-media.mjs --apply --if-configured
```

| Script | What it does on deploy |
| --- | --- |
| `vercel-build` | The whole chain above. `tests/vercel-config.test.mjs` asserts it stays under Vercel's 256-character `buildCommand` limit and that every script it names exists |
| `db:deploy` | The six database steps, in order |
| `pages:deploy` | Seeds `static_pages` rows for pages that have none |
| `templates:deploy` | Seeds `page_templates` shells |
| `stored:deploy` | Migrates pages into the stored-page model |
| `cities:deploy` | Removes the retired cities' rows if any survive |
| `media:cleanup` | Drops watermarked media rows and objects |

**Every step takes `--if-configured`,** which exits 0 rather than failing when
there is no `DATABASE_URL`. That is what lets a preview build succeed without a
database — and it is also why a *misconfigured* database produces a green build
with an unseeded site rather than a failure.

`pages:deploy` and `templates:deploy` only **insert**. Pushing a changed shell to
a row that already exists needs an explicit `--refresh <path>` (repeatable), or
`--refresh-calculators` for the calculator-bearing pages; without one the deploy
reports success and the old shell keeps serving. The deploy chain passes neither,
so a shell edited on disk does not reach an existing row by deploying.

`stored:deploy` is the exception, and the reason markup changes to the
calculators are written as transforms rather than as new shells. It runs
`scripts/migrate-stored-pages.mjs`, which **edits stored markup in place** — so
an admin's own edits to a page survive — and applies both passes:

| Pass | Transform | What it does |
| --- | --- | --- |
| `page-data` | `scripts/lib/page-data-transform.mjs` | Detaches a page from the tax rates, city list and wedding types compiled into it |
| `budget` | `scripts/lib/calculator-budget-transform.mjs` | Swaps the hotel picker for the budget picker, adds the shared script, drops the home-page packages strip |
| `packages` | `scripts/lib/unpublish-packages-transform.mjs` | Unpublishes the wedding packages area: drops its header and footer links, and marks its five pages `noindex` |

Both are idempotent, which is what makes running them on every deploy safe:
each rewrites a row once and is a no-op afterwards.

The matching pass over the **files** — `site-public/**/*.html` and
`worker/db/page-templates.generated.ts` — is a development-time step, already
applied and committed:

```bash
node scripts/apply-calculator-budget.mjs --check
node scripts/unpublish-packages.mjs --check
```

### Reinstating the wedding packages pages

The packages area is unpublished, not deleted: `/wedding-packages`, `/package`
and the three tier pages still answer with their content intact, but nothing on
the site links to them, they carry `noindex, nofollow`, and they are out of the
sitemap. Bringing them back is four edits, not a rebuild:

1. restore the two `Wedding Packages` entries in `worker/site/footer.ts`;
2. revert the header-link and robots-tag changes (`git revert` of the
   `unpublish-packages` commit, or delete the transform and re-run the pass);
3. drop the five `/wedding-packages`-family entries from `EXCLUDED_EXACT` in
   `scripts/generate-sitemap.mjs` and re-run `npm run sitemap:generate`;
4. deploy, so `stored:deploy` rewrites the stored rows.

Worth doing alongside a look at the prices: the cheapest tier reads
"1.00 CR starting price" while the calculator's lowest band starts at ₹70 Lakh.

Before pushing a calculator change to an existing database, take the restore
point that covers the rows a deploy rewrites; `git revert` restores the files
and leaves every visitor on the new markup otherwise:

```bash
node --env-file=.env.local scripts/backup-calculator-rows.mjs
```

#### Operational scripts (not run by the deploy)

| Script | Purpose |
| --- | --- |
| `db:generate` | `drizzle-kit generate` — regenerate `drizzle-pg/` after editing `worker/db/schema.ts` |
| `pages:seed` / `templates:seed` | The same seeders against `.env.local`, for local use |
| `data:detach` / `data:audit` / `data:migrate` | The stored-page data-source tooling |
| `media:upload-static` | Push `site-public` images into R2 |
| `media:migrate` | The original image → R2 migration; writes `scripts/image-migration-map.json` |
| `media:audit` | Report on the media library against R2 and the database |
| `cities:retire` / `cities:audit` | The retired-cities transform over files and rows |
| `leads:purge` | Delete leads past a retention window |
| `sitemap:generate` | Write `site-public/sitemap.xml` |

`scripts/image-migration-map.json` is **not** a build artefact — it is imported
at runtime by `worker/site/media.ts` to map a legacy `/media/<key>` back to its
original `site-public` path when R2 does not have the object. Deleting it breaks
that fallback.

### `tsconfig.json`

Strict TypeScript, `allowImportingTsExtensions`, path alias `@/*` → project root.

### `eslint.config.mjs`

ESLint 9 flat config: React, Next, jsx-a11y, plus an `argsIgnorePattern` of `^_`
matching the codebase's convention for deliberately unused parameters.

---

## Runtime Configuration

| Setting | Location | Notes |
| --- | --- | --- |
| Node engine | `package.json` | 24.x |
| Session TTL | `worker/admin/session.ts` | 7 days, refreshed after 1 day |
| Password hashing | `worker/admin/password.ts` | PBKDF2-SHA256, 600,000 iterations |
| Settings cache | `worker/site/settings.ts` | 30 seconds |
| Page template cache | `worker/site/template.ts` | 30 seconds, per instance |
| Managed page cache | `worker/site/render-page.ts` | 30 seconds |
| Shell fallback timeout | `app/[[...path]]/route.ts` | 5 seconds |
| Login throttle | `app/admin/login/actions.ts` | 8 per 15 min, per IP+email |
| Lead export cap | `app/admin/leads/export/route.ts` | 5000 rows |
| Bulk action cap | `app/admin/leads/actions.ts` | 200 IDs |

---

## Feature Flags

No formal feature flag system. Behaviour is controlled by:

- Database content (published/draft status)
- Role checks (admin vs editor)
- Environment presence — email is skipped without a Resend key, uploads are
  refused without R2 credentials

---

## Local Development

```bash
npm install
npm run dev          # Vinext dev server on port 3000
```

To exercise the real deploy output instead:

```bash
NITRO_PRESET=vercel npm run build
npx srvx --static .vercel/output/static .vercel/output/functions/__server.func/index.mjs
```

Booting the built function is the only way to catch failures that happen at
module load — a build that succeeds can still produce a function that cannot
start.

---

## Git Configuration

Optional documentation hook:

```bash
git config core.hooksPath .githooks
```

Runs `docs:validate` before commit.

### Repository hygiene

Local-only paths, listed in `.gitignore`:

| Path | Purpose |
| --- | --- |
| `dist/`, `.next/`, `.vinext/`, `.vercel/` | Build output |
| `tmp/`, `output/` | Scratch logs and one-off exports |
| `node_modules/` | npm dependencies |
| `.env*` (except `.env.example`) | Secrets and local env |
| `.claude/`, `.cursor/` | Local AI/IDE configs |

Regenerate after clone:

```bash
npm install
npm run build
```
