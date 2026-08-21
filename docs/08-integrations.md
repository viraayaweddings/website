# Integrations

External services and Cloudflare bindings.

---

## Cloudflare Bindings

Configured in `.openai/hosting.json`, applied at build via Vite Cloudflare plugin.

| Binding | Name | Purpose | Files |
| --- | --- | --- | --- |
| D1 Database | `DB` | All persistent data | `worker/db/client.ts` |
| R2 Bucket | `MEDIA` | Admin-uploaded images | `worker/admin/media-store.ts` |
| Static Assets | `ASSETS` | `site-public/` files | `worker/index.ts` |
| Cloudflare Images | `IMAGES` | On-the-fly transforms | `worker/index.ts` (`/_vinext/image`) |

---

## Resend (Email)

| | |
| --- | --- |
| **Purpose** | Lead notification emails |
| **Handler** | `worker/lead-email.ts` |
| **API** | `POST https://api.resend.com/emails` |
| **Trigger** | Public form submission; admin resend |

### Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | Yes (prod) | API authentication |
| `RESEND_FROM_EMAIL` | Yes | Sender address |
| `RESEND_REPLY_TO` | Yes | Reply-to header |
| `RESEND_TO_EMAIL` | Yes | Notification recipient(s) |
| `LEAD_EMAIL_SUBJECT` | No | Subject prefix (default in code) |
| `RESEND_ALLOW_INSECURE_LOCAL_TLS` | No | Dev-only TLS bypass |

### Data Exchanged

- **Outbound:** Lead name, email, phone, form fields, page URL
- **Inbound:** Resend API response (email ID on success)

### Failure Behavior

- Lead saved to D1 regardless of email success
- `leads.email_sent` set to 0 on failure
- Admin can resend via `resendLeadEmailAction`

### Retry

No automatic retry. Manual resend from admin lead detail page.

---

## Cloudflare R2 (Object Storage)

| | |
| --- | --- |
| **Purpose** | Store admin-uploaded images |
| **Upload** | `worker/admin/media-store.ts` → `uploadImage` |
| **Serve** | GET `/media/<key>` via `worker/site/media.ts` |
| **Dedup** | Content-hash based keys |
| **Delete** | Reference-aware via `image-references.ts` |

### Allowed Types

Magic-byte detection in `worker/admin/image-type.ts`:
- JPEG, PNG, WebP, AVIF
- SVG explicitly rejected

---

## YouTube (Embed Only)

| | |
| --- | --- |
| **Purpose** | Venue tour videos |
| **Field** | `hotels.video_id` |
| **Integration** | Embedded iframe in injected HTML |
| **CSP** | `frame-src` allows YouTube in worker security headers |
| **API key** | None — embed only |

---

## WhatsApp / Social (Client-Side Links)

| | |
| --- | --- |
| **Purpose** | Contact links from site settings |
| **Source** | `settings` table via `worker/site/settings.ts` |
| **Behavior** | `wa.me` links generated client-side; no API |

---

## Calculator Data (Static, No External Service)

| | |
| --- | --- |
| **Source** | `worker/calculator-data.ts` |
| **Storage** | In-memory in Worker bundle |
| **Updates** | Code change + redeploy required |
| **Scope** | India-only cities/hotels/prices |

---

## OpenAI Sites Deployment

| | |
| --- | --- |
| **Config** | `.openai/hosting.json` |
| **Project ID** | `appgprj_6a782449ea908191bd4dbbd0a7fbd7a1` |
| **Bindings** | D1 as `DB`, R2 as `MEDIA` |
| **Build plugin** | `build/sites-vite-plugin.ts` copies config to `dist/` |

---

## Legacy Node API Handlers

| File | Purpose | When used |
| --- | --- | --- |
| `api/lead.ts` | Lead handler | Non-Worker local dev |
| `api/currencies.ts` | Currency API | Non-Worker local dev |

Production uses Worker handlers exclusively.

---

## Integration Dependency Chain

```
Form submit → D1 (leads) → Resend (email)
Admin upload → R2 (MEDIA) → D1 (media metadata)
Public page → D1 (content) → ASSETS (shell) → HTMLRewriter
Image optimize → R2/ASSETS → IMAGES binding
```
