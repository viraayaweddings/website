# Integrations

External services the site depends on.

---

## Platform

| Service | Purpose | Configured in |
| --- | --- | --- |
| Vercel | Hosting, CDN, serverless function | `vercel.json` |
| Neon | Postgres database, `ap-southeast-1` | `DATABASE_URL` / `POSTGRES_URL` |
| Cloudflare R2 | Admin-uploaded images, over the S3 API | `R2_*` variables |
| Resend | Lead notification email | `RESEND_*` variables |

There are no Cloudflare Workers, D1, KV or ASSETS bindings. R2 is the only
Cloudflare service still in use, and it is reached as plain S3 — no binding,
no Wrangler.

---

## Neon (Postgres)

| | |
| --- | --- |
| **Purpose** | All persistent data: leads, users, content, sessions |
| **Client** | `postgres.js` through Drizzle ORM (`worker/db/client.ts`) |
| **Pool** | One connection per function instance, 20s idle, 10min lifetime |
| **Migrations** | Bundled SQL, applied on first use per instance |
| **Health** | `GET /api/health/db` |

The connection is memoised per instance, and the schema check runs once behind
the same promise, so a warm instance pays neither cost again.

Keep the function in the same region as the database — see
[Configuration](./09-configuration.md#function-region).

---

## Cloudflare R2 (Object Storage)

| | |
| --- | --- |
| **Purpose** | Store images uploaded through the admin panel |
| **Access** | S3 API via `@aws-sdk/client-s3` (`worker/storage/r2.ts`) |
| **Endpoint** | `https://<account>.r2.cloudflarestorage.com` |
| **Upload** | `worker/admin/media-store.ts` → `uploadImage` |
| **Serve** | `GET /media/<key>` via `worker/site/media.ts` |
| **Dedup** | Keys are the SHA-256 of the file, so identical uploads share one object |
| **Delete** | Reference-aware, via `worker/admin/image-references.ts` |
| **Health** | `GET /admin/health/r2` — round-trips an object, admin only |

### Allowed types

Magic-byte detection in `worker/admin/image-type.ts`: JPEG, PNG, WebP, AVIF.
SVG is rejected outright — it can carry script.

### Credentials

The R2 token screen shows three values. The S3 API needs **Secret Access Key**
(64 hex), not **Token value** (53 chars, mixed case). The wrong one produces
`SignatureDoesNotMatch`.

---

## Resend (Email)

| | |
| --- | --- |
| **Purpose** | Lead notification emails |
| **Handler** | `worker/lead-email.ts` |
| **API** | `POST https://api.resend.com/emails` |
| **Trigger** | Public form submission; admin resend |

### Data exchanged

- **Outbound:** lead name, email, phone, submitted fields, page URL
- **Inbound:** Resend response (email id on success)

### Failure behaviour

The lead is written to Postgres regardless of whether the email sends;
`leads.email_sent` stays `0` on failure and the dashboard surfaces the count.
There is no automatic retry — an admin resends from the lead detail screen via
`resendLeadEmailAction`.

---

## YouTube (embed only)

| | |
| --- | --- |
| **Purpose** | Venue tour videos |
| **Field** | `hotels.video_id` |
| **Integration** | Iframe injected into the page shell |
| **CSP** | `frame-src` allows YouTube |
| **API key** | None |

---

## WhatsApp and social links

Generated from the `settings` table by `worker/site/settings.ts` and injected
into every managed page. `wa.me` links only; no API.

---

## Calculator data

| | |
| --- | --- |
| **Source** | Postgres: `calculator_cities`, `calculator_hotels`, `calculator_prices`, `calculator_currencies` |
| **Seed** | `worker/calculator-data.ts`, imported once into empty tables |
| **Editing** | Admin → Calculator pricing |
| **Scope** | India-only cities, hotels and prices |

Reads go through `worker/site/calculator-store.ts`, cached 30 seconds per
instance. The bundled table is only a seed and a fallback: if the tables are
empty the data files still answer from it, so an unseeded deployment prices
normally rather than quoting zero.

---

## Integration dependency chain

```
Form submit      → Postgres (leads) → Resend (email)
Admin upload     → R2 (object)      → Postgres (media metadata)
Managed page     → Postgres (shell + content) → HTMLRewriter → HTML
Static page      → Vercel CDN, function not involved
Media request    → Postgres (key lookup) → R2 → response
```
