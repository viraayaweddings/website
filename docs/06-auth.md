# Authentication & Authorization

---

## Public Website Authentication

**There is no public user authentication.**

| Feature | Status |
| --- | --- |
| Registration | Not implemented |
| Login | Not implemented |
| Password reset | Not implemented |
| Email verification | Not implemented |
| User sessions | Not implemented |
| Protected user routes | Not implemented |
| User dashboard | Not implemented |

All public pages are accessible anonymously. The only authentication on this project is the **admin panel** documented above.

**Preview mode:** Admins can view draft content on public URLs with `?preview=1` + valid admin session. See [Public Website Rendering](./public-site/rendering.md).

---

## Admin Authentication

**Type:** Cookie-based sessions (no JWT/OAuth)  
**Cookie name:** `vw_admin_session` (defined in `worker/admin/session.ts`)  
**Token storage:** SHA-256 hash in `sessions.token_hash` — raw token never stored  
**Session TTL:** 7 days  
**Password hashing:** PBKDF2-SHA256 (`worker/admin/password.ts`)  
**Format:** `pbkdf2$<iterations>$<salt-b64>$<hash-b64>`

---

## Login

| Step | Implementation |
| --- | --- |
| Form | `/admin/login` → `loginAction` |
| Validation | Email required; rate limit 8/15min per IP+email |
| Verification | `verifyPassword` against `users.password_hash` |
| Checks | User must exist, status=`active` |
| Session | INSERT `sessions`; set HttpOnly cookie |
| Secure flag | `isSecureRequest()` — HTTPS in prod, HTTP on localhost |
| Audit | `user.login` |

**First run:** If zero users, `requireUser()` redirects to `/admin/setup` instead of login.

---

## Logout

POST `/admin/logout` → `destroySessionByToken` → clear cookie → 303 to login.

---

## Authorization Helpers

**File:** `app/admin/_lib/auth.ts`

| Function | Behavior |
| --- | --- |
| `getCurrentUser()` | Returns user or null (no redirect) |
| `requireUser(returnTo?)` | Redirects to setup/login if unauthenticated |
| `requireRole("admin", returnTo?)` | Editors redirected to `/admin?denied=1` |
| `isAdmin(user)` | `user.role === "admin"` |
| `safeReturnPath(value)` | Only allows `/admin/*` paths (open redirect prevention) |
| `recordAudit(...)` | Best-effort audit insert (never blocks action) |

---

## Roles

| Role | Constant | Default |
| --- | --- | --- |
| Admin | `admin` | — |
| Editor | `editor` | Default for new users |

Defined in `USER_ROLES` at `worker/db/schema.ts`.

---

## Permission Matrix

| Capability | admin | editor |
| --- | --- | --- |
| Dashboard | ✓ | ✓ |
| View/update leads | ✓ | ✓ |
| Delete leads | ✓ | ✗ |
| Bulk delete leads | ✓ | ✗ |
| Export leads CSV | ✓ | ✓ |
| Resend lead email | ✓ | ✓ |
| Create/edit venues | ✓ | ✓ |
| Delete venues | ✓ | ✗ |
| Create/edit articles | ✓ | ✓ |
| Delete articles | ✓ | ✗ |
| Blog sections (category/tag) | ✓ | ✗ |
| Hero slider CRUD | ✓ | ✓ |
| Delete hero slides | ✓ | ✗ |
| Media view/upload | ✓ | ✓ |
| Delete unused media | ✓ | ✗ |
| City pages | ✓ | ✗ |
| Contact details | ✓ | ✗ |
| Section headings | ✓ | ✗ |
| User management | ✓ | ✗ |
| Activity log | ✓ | ✗ |
| Delete / prune activity log | ✓ | ✗ |
| Stored pages (`/admin/pages`) | ✓ | ✗ |
| Calculator data (`/admin/calculator`) | ✓ | ✗ |
| Wedding type vocabulary | ✓ | ✗ |
| Replace an image (`replaceMediaAction`) | ✓ | ✗ |
| Bulk actions (all thirteen) | ✓ | ✗ |
| Content seed import | ✓ | ✗ |
| **Own account** (`/admin/account`) | ✓ | ✓ |
| Command palette search | ✓ | ✓* |

\*Editors cannot search city pages.

`/admin/account` is the one screen an editor may act on without an admin: it
changes only the signed-in user's own name, password and sessions, and the
password change requires re-entering the current one. Before it existed, an
editor who thought their password was compromised had to ask an admin to reset
it, which meant saying a new password out loud.

Every capability marked ✗ is enforced by `requireRole("admin")` inside the action
or page, not by hiding the link — the nav omits them too, but the guard is what
matters.

---

## Protected Routes

All `/admin/*` except:
- `/admin/login` (when users exist)
- `/admin/setup` (when zero users)
- `/admin/logout` (POST, unauthenticated)

**API routes:** Return 401 JSON without session.

---

## Protected Operations (Server Actions)

Destructive actions require `requireRole("admin")`:
- `deletePostAction`, `deleteHotelAction`, `deleteSlideAction`
- `deleteMediaAction`, `deleteLeadAction`, `bulkDeleteAction`
- `saveSectionAction`, `saveCityAction`, `saveSettingsAction`, `saveLabelsAction`
- All user management actions

---

## Session Invalidation

Sessions destroyed when:
- User logs out
- Admin resets user password
- Admin disables user or changes role
- Admin deletes user

---

## Preview Mode (Public Site)

`?preview=1` on public URLs requires valid admin session (`worker/site/resolve-page.ts`, via the `preview` option). Allows viewing draft content with noindex/no-cache headers.

---

## Security Notes

- Open redirect prevented via `safeReturnPath`
- Login throttle is Postgres-backed (`rate_limits` table); see `worker/admin/rate-limit.ts`
- Admin CSRF uses `assertAdminRequest()` — cookie issued by `worker/admin/csrf.ts`, constants and header checks in `worker/admin/csrf-tokens.ts`
- Client IP for throttling comes from `worker/request-ip.ts` (not spoofable `x-forwarded-for` prefixes)
- Logout has no CSRF token (benign — only clears own session)
- Admin panel: `robots: noindex` in layout metadata

---

## Who Can Access What

| Resource | Who | Why |
| --- | --- | --- |
| Admin panel | Authenticated users | Session cookie required |
| User/settings management | Admin role only | Sensitive configuration |
| Content deletion | Admin role only | Prevent accidental data loss |
| Lead management | All authenticated | Editors handle enquiries |
| Public site | Everyone | No auth required |
| Lead form POST | Same-origin only | CSRF protection |
| Preview drafts | Admin session | Content review before publish |
