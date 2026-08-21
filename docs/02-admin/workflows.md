# Admin Workflows

End-to-end workflows for each admin module.

---

## First Run / Bootstrap

```mermaid
flowchart TD
  A[Visit /admin] --> B{Users exist?}
  B -->|No| C[/admin/setup]
  C --> D[createFirstAdminAction]
  D --> E[Session cookie set]
  E --> F[/admin dashboard]
  B -->|Yes| G{Session valid?}
  G -->|No| H[/admin/login]
  H --> I[loginAction]
  I --> F
  G -->|Yes| F
```

---

## Login Flow

1. User visits `/admin/login` (or redirected with `?next=`)
2. Submits `email`, `password`
3. `loginAction` validates:
   - Rate limit: 8 attempts / 15 min per IP+email (in-memory per isolate)
   - Constant-time hash check for unknown emails
   - User status must be `active`
4. Updates `users.last_login_at`
5. Creates `sessions` row (SHA-256 token hash, 7-day TTL)
6. Sets `vw_admin_session` cookie (HttpOnly, Secure in production)
7. Redirects to `safeReturnPath(next)` or `/admin`
8. Audit: `user.login`

**Failure:** Redirect to login with `?error=` message

---

## Logout Flow

1. POST `/admin/logout` (form in SideNav)
2. `destroySessionByToken` deletes session row
3. Clears cookie
4. 303 redirect to `/admin/login`

---

## Article CRUD

### Create
1. `/admin/blogs/new` → `PostForm`
2. `createPostAction`: validate → upload images → INSERT `blog_posts`
3. Redirect with `?saved=1`

### Edit
1. `/admin/blogs/:id` → `PostForm` pre-filled
2. `updatePostAction`: validate → update images → UPDATE
3. If slug changed: UPDATE `blog_listings.post_slug`
4. Preview draft: public URL + `?preview=1`

### Reorder
1. List page up/down buttons → `movePostAction`
2. Rewrites all positions

### Delete (admin)
1. List `?delete=id` banner or edit danger zone
2. `deletePostAction`: DELETE post + listings + release images

### Section assignments (admin)
1. `/admin/blogs/sections`
2. Edit textarea of post slugs per category/tag
3. `saveSectionAction`: replace `blog_listings` rows

---

## Venue CRUD

### Create
1. `/admin/hotels/new` — city + slug **immutable after creation**
2. `createHotelAction`: validate uniqueness → INSERT

### Edit
1. `/admin/hotels/:id` — full form including highlights, FAQs, nearby
2. `updateHotelAction`: UPDATE + image cleanup

### Delete (admin)
1. Confirm banner → `deleteHotelAction`
2. Removes row; deletes `city_listings` references
3. Admin-added venues removed; seeded venues revert to static

---

## City Page Configuration (admin)

1. `/admin/cities` → select city
2. Edit venue order (textarea), SEO, `cityId`, `totalVenues`
3. Sidebar shows available venues with copy buttons
4. `saveCityAction`: UPDATE `city_pages` + replace `city_listings`

---

## Hero Slider

1. `/admin/hero` — inline per-slide forms + add sidebar card
2. Create: `createSlideAction` (image required)
3. Update: `updateSlideAction` (optional image replace)
4. Reorder: `moveSlideAction`
5. Delete (admin): `deleteSlideAction` + image release

---

## Submissions / Leads

### List
1. `/admin/leads` — filters (q, form, date range, sort)
2. Pagination 50/page
3. Bulk status (all roles) / bulk delete (admin)

### Detail
1. `/admin/leads/:id` — view JSON fields + metadata
2. Update status/notes → `updateLeadAction`
3. Resend email → `resendLeadEmailAction` → Resend API

### Export
1. GET `/admin/leads/export` with current filters
2. CSV download (5000 cap)

---

## Media Library

### Upload
1. Drop zone on `/admin/media` or RichText editor
2. POST `/admin/media/upload` → content-hash dedup → R2 + `media` row
3. Returns `/media/<key>` URL

### Delete (admin, unused only)
1. `deleteMediaAction` checks `findImageReferences`
2. If unused: R2 delete + `media` row delete

---

## Users (admin)

1. Create with temp password → `createUserAction`
2. Update role/status → last-admin guard → may destroy sessions
3. Reset password → destroys all user sessions
4. Delete → cannot delete self or last admin

---

## Settings & Labels (admin)

1. Bulk save all fields
2. `writeSettings` / `writeLabels` upsert key-value rows
3. Public site cache invalidates (~60s refresh)

---

## Permission Denied Flow

1. Editor visits admin-only URL (e.g. `/admin/users`)
2. `requireRole("admin")` redirects to `/admin?denied=1`
3. Dashboard shows denial alert via `?denied=1` query param

---

## Preview Mode (public site)

1. Admin with valid session visits public URL + `?preview=1`
2. Worker `isPreviewRequest()` includes draft content
3. Response: no-cache, noindex
