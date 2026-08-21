# Vinext dev-server API handlers

These files mirror production behaviour handled by `worker/index.ts` on Cloudflare.

| File | Production equivalent |
| --- | --- |
| `api/lead.ts` | `POST /api/lead` |
| `api/currencies.ts` | `GET /api/currencies` |
| `api/currencies/select.ts` | `POST /api/currencies/select` |

Prefer editing `worker/public-endpoints.ts`, `worker/lead-email.ts`, and `app/api/lead/route.ts` so dev and production stay aligned.

Legacy HTML form actions (`/contact/save`, `/blog-form-submit`, `/get_in_touch/store`) are deprecated — use `POST /api/lead` with a CSRF token from `GET /api/lead/csrf`.
