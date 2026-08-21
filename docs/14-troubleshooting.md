# Troubleshooting

Common problems, causes, and resolutions.

---

## Admin Panel

### Cannot access admin — redirected to setup

| | |
| --- | --- |
| **Symptom** | Visiting `/admin` redirects to `/admin/setup` |
| **Cause** | Zero users in D1 database |
| **Verify** | Check `users` table is empty |
| **Resolution** | Complete setup form to create first admin |
| **Files** | `app/admin/_lib/auth.ts` → `hasAnyUser` |

### Cannot login — "Invalid email or password"

| | |
| --- | --- |
| **Symptom** | Login fails with error message |
| **Cause** | Wrong credentials, disabled account, or rate limited |
| **Verify** | Check `users.status = 'active'`; check rate limit (8/15min) |
| **Resolution** | Reset password via another admin, or wait for throttle |
| **Files** | `app/admin/login/actions.ts` |

### Admin shows "No database is bound"

| | |
| --- | --- |
| **Symptom** | `DatabaseUnavailableError` |
| **Cause** | D1 binding missing in deployment |
| **Verify** | Check `.openai/hosting.json` has `"d1": "DB"` |
| **Resolution** | Configure D1 binding and redeploy |
| **Files** | `app/admin/_lib/auth.ts`, `worker/db/client.ts` |

### Editor sees "Access denied"

| | |
| --- | --- |
| **Symptom** | Redirect to `/admin?denied=1` |
| **Cause** | Editor role accessing admin-only page |
| **Verify** | Check user role in `users` table |
| **Resolution** | Expected behavior; admin must grant admin role |
| **Files** | `app/admin/_lib/auth.ts` → `requireRole` |

---

## Content & Media

### Uploaded image not appearing on public site

| | |
| --- | --- |
| **Symptom** | Image shows in admin but not on public page |
| **Cause** | Content not saved, cache delay, or draft status |
| **Verify** | Check content saved; wait 60s for cache; check status |
| **Resolution** | Save content; publish if draft; hard refresh |
| **Files** | Worker cache headers in `worker/index.ts` |

### Cannot delete media — "in use"

| | |
| --- | --- |
| **Symptom** | Delete rejected |
| **Cause** | Image referenced in content tables |
| **Verify** | Run reference scan logic in `image-references.ts` |
| **Resolution** | Remove image from content first, then delete |
| **Files** | `worker/admin/image-references.ts`, `app/admin/media/actions.ts` |

### Rich text content stripped

| | |
| --- | --- |
| **Symptom** | Scripts/links removed from saved content |
| **Cause** | HTML sanitizer removes dangerous elements |
| **Verify** | Check `worker/admin/rich-text.ts` rules |
| **Resolution** | Expected security behavior; avoid script tags |
| **Files** | `worker/admin/rich-text.ts` |

---

## Leads & Email

### Lead saved but no email notification

| | |
| --- | --- |
| **Symptom** | Lead in admin with `email_sent = 0` |
| **Cause** | Resend API failure or missing API key |
| **Verify** | Check `RESEND_API_KEY` and other env vars |
| **Resolution** | Configure Resend; use "Resend email" in lead detail |
| **Files** | `worker/lead-email.ts`, `app/admin/leads/actions.ts` |

### Form submission returns error

| | |
| --- | --- |
| **Symptom** | Public form shows error |
| **Cause** | Validation failure, rate limit, or same-origin check |
| **Verify** | Browser network tab for status code (400/429/403) |
| **Resolution** | Fix form fields; check origin header; wait for rate limit |
| **Files** | `worker/lead-email.ts` |

---

## Build & Deploy

### Build fails

| | |
| --- | --- |
| **Symptom** | `npm run build` errors |
| **Verify** | Run `npm run lint` for TypeScript/ESLint issues |
| **Resolution** | Fix reported errors; ensure Node 24.x |
| **Files** | `vite.config.ts`, `package.json` |

### Migrations not applied

| | |
| --- | --- |
| **Symptom** | Missing tables or columns |
| **Cause** | Migration not in bundle or D1 not bound |
| **Verify** | Check `worker/db/migrations.ts` includes migration; check `__migrations` table |
| **Resolution** | Add migration import; redeploy with D1 binding |
| **Files** | `worker/db/client.ts`, `worker/db/migrations.ts` |

### Static pages show old content

| | |
| --- | --- |
| **Symptom** | Public page doesn't reflect admin changes |
| **Cause** | 60s worker cache or browser cache |
| **Verify** | Add `?preview=1` as admin to bypass cache |
| **Resolution** | Wait 60s; hard refresh; use preview mode |
| **Files** | `worker/index.ts` cache headers |

---

## Documentation

### Documentation validation fails

| | |
| --- | --- |
| **Symptom** | `npm run docs:validate` exits 1 |
| **Cause** | New routes/actions/tables not documented |
| **Verify** | Read `docs/generated/validation-report.json` |
| **Resolution** | Update relevant docs; run `npm run docs:sync` |
| **Files** | `scripts/docs-validate.mjs` |

---

## Verification Scripts

Python scripts in `build/` compare worker-rendered pages vs static originals:

```bash
python build/verify-blog-render.py
python build/verify-city-render.py
python build/verify-hotel-render.py
python build/verify-singleton-render.py
```

Use after changing injection logic.
