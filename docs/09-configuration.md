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
| `POSTGRES_URL_NON_POOLING` | Fallback | `worker/env.ts` | Direct connection |

`getDatabaseUrl()` takes the first of these that looks like a Postgres URL, so
the Neon integration works without renaming anything. Pooled URLs are preferred.

### Object storage (Cloudflare R2)

| Variable | Required | Used by | Purpose |
| --- | --- | --- | --- |
| `R2_ACCOUNT_ID` | For uploads | `worker/env.ts` | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | For uploads | `worker/env.ts` | 32-char hex from the R2 API token |
| `R2_SECRET_ACCESS_KEY` | For uploads | `worker/env.ts` | **64-char hex**, not the token value |
| `R2_BUCKET_NAME` | For uploads | `worker/env.ts` | Bucket, e.g. `viraaya-media` |
| `R2_PUBLIC_BASE_URL` | No | `worker/env.ts` | Custom domain in front of the bucket |

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
| `docs:inventory` / `docs:validate` / `docs:sync` | Documentation tooling |

The build ends with a check that the Vercel output is deployable: `config.json`
present, a filesystem handler, a route to the function, and `static/index.html`.
A Nitro misconfiguration can otherwise produce a build that reports success and
deploys with no routes at all.

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
