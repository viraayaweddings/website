# Security

Security documentation for the full project.

---

## Public Website Security

| Control | Implementation | File |
| --- | --- | --- |
| CSP | Restricts scripts, frames, connect sources | `worker/index.ts` SECURITY_HEADERS |
| HSTS | Strict-Transport-Security on HTTPS | `worker/index.ts` |
| X-Frame-Options | SAMEORIGIN | `worker/index.ts` |
| Same-origin API guard | Calculator + lead endpoints | `worker/index.ts` |
| Lead honeypot | Hidden fields rejected server-side | `worker/lead-email.ts` |
| Lead rate limit | 8/10min/IP (in-memory) | `worker/lead-email.ts` |
| Form same-origin | POST must match origin | `worker/lead-email.ts` |
| Body size limit | 20KB max on lead POST | `worker/lead-email.ts` |
| HTML sanitization | Admin rich text only | `worker/admin/rich-text.ts` |
| Image upload validation | Magic-byte type check | `worker/admin/image-type.ts` |
| No public auth | Anonymous site — no attack surface for user accounts | — |
| Preview gate | Admin session required for `?preview=1` | `worker/index.ts` |

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
| Login rate limit | 8/15min/IP+email (in-memory) | `app/admin/login/actions.ts` |
| Admin noindex | robots + cache headers | `app/admin/layout.tsx`, worker |
| Constant-time login | Unknown email hash comparison | `app/admin/login/actions.ts` |
| Last admin guard | Cannot delete/demote last admin | `app/admin/users/actions.ts` |
| Session invalidation | On password reset, disable, role change | `worker/admin/session.ts` |

**Admin security issues:** [AUDIT-FINDINGS.md](../AUDIT-FINDINGS.md) — Security Issues

---

## Data Protection

| Data | Storage | Exposure |
| --- | --- | --- |
| Lead PII | D1 `leads` table | Admin panel only |
| Admin passwords | D1 `users.password_hash` | Never returned to client |
| Session tokens | Cookie + D1 hash | HttpOnly cookie |
| Uploaded media | R2 (private bucket, served via worker) | Public URLs when referenced |
| Resend API key | Environment variable | Server-side only |
| Calculator data | Worker bundle | Public (non-sensitive pricing) |

---

## Threat Model Summary

| Threat | Mitigation | Gap |
| --- | --- | --- |
| XSS on public pages | CSP; admin content sanitized | Static HTML trusted clone |
| XSS via admin content | rich-text sanitizer | Large HTML in RichText editor |
| CSRF on forms | Same-origin check | No CSRF tokens |
| Lead spam | Rate limit + honeypot | Per-isolate rate limit |
| Admin brute force | Login throttle | Per-isolate throttle |
| IDOR on admin | Session + role checks | N/A for public (no user data) |
| File upload attacks | Magic-byte validation, no SVG | — |
| Secret exposure | Env vars, not in repo | `.env.local` gitignored |

---

## Security Headers (All Responses)

Set in `worker/index.ts`:

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

1. D1/KV-based rate limiting (public + admin)
2. CSRF tokens on state-changing endpoints
3. Schema.org + SEO hardening (not security but trust)
4. Cookie consent integration with analytics
