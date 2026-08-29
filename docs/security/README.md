# Security

Security documentation for the full project.

---

## Public Website Security

| Control | Implementation | File |
| --- | --- | --- |
| CSP | Restricts scripts, frames, connect sources | `build/sites-vite-plugin.ts` (`_headers`) |
| HSTS | Strict-Transport-Security on HTTPS | Vercel + `_headers` |
| X-Frame-Options | SAMEORIGIN | `build/sites-vite-plugin.ts` |
| Same-origin API guard | Lead endpoints, admin upload, logout | `worker/lead-email.ts`, `app/admin/*/route.ts` |
| Lead honeypot | Hidden fields rejected server-side | `worker/lead-email.ts` |
| Lead rate limit | 8/10min/IP (Postgres `rate_limits`) | `worker/lead-email.ts`, `worker/admin/rate-limit.ts` |
| Form same-origin | POST must match origin | `worker/lead-email.ts` |
| Body size limit | 20KB max on lead POST | `worker/lead-email.ts` |
| HTML sanitization | Admin rich text only | `worker/admin/rich-text.ts` |
| Image upload validation | Magic-byte type check | `worker/admin/image-type.ts` |
| No public auth | Anonymous site — no attack surface for user accounts | — |
| Preview gate | Admin session required for `?preview=1` | `worker/site/resolve-page.ts` |

**Website security issues:** [WEBSITE-AUDIT-FINDINGS.md](../WEBSITE-AUDIT-FINDINGS.md) — Security Issues

---

## Admin Panel Security

| Control | Implementation | File |
| --- | --- | --- |
| Password hashing | PBKDF2-SHA256 | `worker/admin/password.ts` |
| Session tokens | SHA-256 hash stored; raw token in cookie only | `worker/admin/session.ts` |
| Session TTL | 7 days | `worker/admin/session.ts` |
| Open redirect prevention | `safeReturnPath()` | `app/admin/_lib/auth.ts` |
| Role-based access | `requireRole("admin")` | `app/admin/_lib/auth.ts` |
| Login rate limit | 8/15min/IP+email + 25/hour/account (Postgres) | `app/admin/login/actions.ts`, `worker/admin/rate-limit.ts` |
| Admin noindex | robots + cache headers | `app/admin/layout.tsx`, worker |
| Constant-time login | Unknown email hash comparison | `app/admin/login/actions.ts` |
| Last admin guard | Cannot delete/demote last admin | `app/admin/users/actions.ts` |
| Session invalidation | On password reset, disable, role change | `worker/admin/session.ts` |
| Admin CSRF tokens | Double-submit cookie + form field / upload header | `worker/admin/csrf.ts`, `worker/admin/csrf-tokens.ts` |
| Trusted client IP | Rate limits use Vercel-forwarded headers only | `worker/request-ip.ts` |
| Production error logging | Structured JSON lines for log drains (no secrets) | `worker/monitoring.ts` |

**Admin security issues:** [AUDIT-FINDINGS.md](../AUDIT-FINDINGS.md) — Security Issues

---

## Data Protection

| Data | Storage | Exposure |
| --- | --- | --- |
| Lead PII | Postgres `leads` table | Admin panel only |
| Admin passwords | Postgres `users.password_hash`, PBKDF2-SHA256 at 600k iterations | Never returned to the client |
| Session tokens | Cookie; only the SHA-256 is stored | HttpOnly, SameSite=Lax |
| Uploaded media | R2 (private bucket, served via worker) | Public URLs when referenced |
| Resend API key | Environment variable | Server-side only |
| Calculator data | Worker bundle | Public (non-sensitive pricing) |

---

## Threat Model Summary

| Threat | Mitigation | Gap |
| --- | --- | --- |
| XSS on public pages | CSP; admin content sanitized | Static HTML trusted clone |
| XSS via admin content | rich-text sanitizer | Large HTML in RichText editor |
| CSRF on forms | Lead double-submit; admin double-submit (`vw_admin_csrf` HttpOnly + `_csrf` field / `x-csrf-token` header) | `worker/lead-csrf.ts`, `worker/admin/csrf.ts`, `worker/admin/csrf-tokens.ts` |
| Lead spam | Rate limit + honeypot | Postgres-backed; trusted IP via `worker/request-ip.ts` |
| Admin brute force | Login throttle | Postgres-backed; trusted IP via `worker/request-ip.ts` |
| IDOR on admin | Session + role checks | N/A for public (no user data) |
| File upload attacks | Magic-byte validation, no SVG | — |
| Secret exposure | Env vars, not in repo | `.env.local` gitignored |

---

## Security Headers (All Responses)

Written into `_headers` by `build/sites-vite-plugin.ts`:

- Content-Security-Policy
- Strict-Transport-Security
- Cross-Origin-Opener-Policy
- Cross-Origin-Resource-Policy
- Referrer-Policy
- X-Content-Type-Options
- X-Frame-Options

---

## Recommendations

See audit findings documents for full list. Top priorities:

1. Postgres-backed rate limiting — implemented for login and leads
2. ~~CSRF tokens on admin server actions~~ — implemented (`assertAdminRequest`)
3. Schema.org + SEO hardening (not security but trust)
4. Cookie consent integration with analytics
