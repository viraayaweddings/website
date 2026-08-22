# Admin Server Actions

Every exported server action in `app/admin/**/actions.ts`.

---

## Auth Actions

### `loginAction`

| | |
| --- | --- |
| **File** | `app/admin/login/actions.ts` |
| **Auth** | None |
| **Params** | `email`, `password`, `next` |
| **Validation** | Required fields; rate limit 8/15min per IP+email; email format; active status |
| **DB** | UPDATE `users.last_login_at`; INSERT `sessions` |
| **Audit** | `user.login` |
| **Redirect** | `safeReturnPath(next)` or `/admin` |

### `createFirstAdminAction`

| | |
| --- | --- |
| **File** | `app/admin/setup/actions.ts` |
| **Auth** | None (blocked if any user exists) |
| **Params** | `name`, `email`, `password`, `confirm` |
| **Validation** | Name+email required; email regex; passwords match; `validatePasswordStrength` (≥10 chars, letter+number) |
| **DB** | INSERT `users` (role=admin); INSERT `sessions` |
| **Audit** | `user.created` (firstAdmin) |

---

## Blog Actions (`app/admin/blogs/actions.ts`)

### `createPostAction`

**Auth:** `requireUser`  
**Validation:** Slug normalized + unique; required heading/seoTitle/cardTitle; rich text sanitized; FAQ via `readRichText`; images uploaded after validation  
**DB:** INSERT `blog_posts` (position=max+1); cache invalidation  
**Audit:** `blog.created`

### `updatePostAction`

**Auth:** `requireUser`  
**Validation:** Same as create; slug clash check excluding self  
**DB:** UPDATE `blog_posts`; if slug changed UPDATE `blog_listings.post_slug`; release orphaned images  
**Audit:** `blog.updated`

### `deletePostAction`

**Auth:** `requireRole("admin")`  
**DB:** DELETE `blog_posts`; DELETE `blog_listings`; release images  
**Audit:** `blog.deleted`

### `movePostAction`

**Auth:** `requireUser`  
**Params:** `id`, `direction` (`up`/`down`)  
**DB:** Rewrites all `blog_posts.position`  
**Audit:** `blog.reordered`

---

## Blog Section Actions (`app/admin/blogs/sections/actions.ts`)

### `saveSectionAction`

**Auth:** `requireRole("admin")`  
**Params:** `taxonomy`, `slug`, `posts` (textarea, one slug per line)  
**Validation:** taxonomy ∈ {category, tag}; slug `/^[a-z0-9-]+$/i`; lines deduped  
**DB:** DELETE + INSERT `blog_listings`; cache invalidation  
**Audit:** `blog_section.updated`

---

## Hotel Actions (`app/admin/hotels/actions.ts`)

### `createHotelAction`

**Auth:** `requireUser`  
**Validation:** city/slug normalized; unique city+slug; name required; description sanitized  
**DB:** INSERT `hotels`; cache invalidation  
**Audit:** `hotel.created`

### `updateHotelAction`

**Auth:** `requireUser`  
**Validation:** Name required; status fallback `published` if invalid; nearby slugs max 12  
**DB:** UPDATE `hotels`; release unused images  
**Audit:** `hotel.updated`

### `deleteHotelAction`

**Auth:** `requireRole("admin")`  
**DB:** DELETE `hotels`; DELETE `city_listings`; release images  
**Audit:** `hotel.deleted`

---

## City Actions (`app/admin/cities/actions.ts`)

### `saveCityAction`

**Auth:** `requireRole("admin")`  
**Params:** `city`, `venues`, `seoTitle`, `metaDescription`, `cityId`, `totalVenues`  
**Validation:** city slug valid; seoTitle required; venues parsed; totalVenues ≥ 0  
**DB:** UPDATE `city_pages`; DELETE + INSERT `city_listings`; cache invalidation  
**Audit:** `city.updated`

---

## Hero Actions (`app/admin/hero/actions.ts`)

| Action | Auth | Key validation | DB | Audit |
| --- | --- | --- | --- | --- |
| `createSlideAction` | `requireUser` | title required; ctaLabel requires ctaHref; image required | INSERT `hero_slides` | `hero.slide_created` |
| `updateSlideAction` | `requireUser` | Same + optional image replace | UPDATE `hero_slides` | `hero.slide_updated` |
| `deleteSlideAction` | `requireRole("admin")` | Valid id | DELETE; release image | `hero.slide_deleted` |
| `moveSlideAction` | `requireUser` | direction up/down | Rewrite positions | `hero.reordered` |

---

## Label Actions (`app/admin/labels/actions.ts`)

### `saveLabelsAction`

**Auth:** `requireRole("admin")`  
**Params:** `value_{key}`, `emphasis_{key}` for each label definition  
**Validation:** At least one non-empty value; max 200 chars  
**DB:** `writeLabels` → upsert `site_labels`  
**Audit:** `labels.updated`

---

## Settings Actions (`app/admin/settings/actions.ts`)

### `saveSettingsAction`

**Auth:** `requireRole("admin")`  
**Params:** phone, whatsappNumber, email, address, instagramUrl, linkedinUrl  
**Validation:** phone required; WhatsApp ≥10 digits; email regex; social URLs must start `https://`  
**DB:** `writeSettings` → upsert `settings`  
**Audit:** `settings.updated`

---

## User Actions (`app/admin/users/actions.ts`)

| Action | Auth | Key rules | DB | Audit |
| --- | --- | --- | --- | --- |
| `createUserAction` | admin | email unique; password strength | INSERT `users` | `user.created` |
| `updateUserAction` | admin | Cannot demote/disable last admin; destroys sessions on disable/role change | UPDATE `users` | `user.updated` |
| `resetPasswordAction` | admin | Password strength | UPDATE passwordHash; destroy sessions | `user.password_reset` |
| `deleteUserAction` | admin | Cannot delete self or last admin | destroy sessions; DELETE | `user.deleted` |

---

## Media Actions (`app/admin/media/actions.ts`)

### `deleteMediaAction`

**Auth:** `requireRole("admin")`  
**Params:** `key`  
**Validation:** Refuses if `findImageReferences` non-empty  
**DB/R2:** `releaseImage`  
**Audit:** `media.deleted`

---

## Lead Actions (`app/admin/leads/actions.ts`)

| Action | Auth | Params | DB / External | Audit |
| --- | --- | --- | --- | --- |
| `updateLeadAction` | `requireUser` | id, status, notes | UPDATE `leads` | status/notes change |
| `deleteLeadAction` | admin | id | DELETE | `lead.deleted` |
| `bulkStatusAction` | `requireUser` | ids[], bulkStatus, returnTo | UPDATE many (max 200) | `lead.bulk_status` |
| `bulkDeleteAction` | admin | ids[], returnTo | DELETE many | `lead.bulk_deleted` |
| `resendLeadEmailAction` | `requireUser` | id | Resend API; sets emailSent | `lead.email_resent` / failed |

---

## Content seeding

| Action | Auth | Input | Writes | Audit |
| --- | --- | --- | --- | --- |
| `importSiteContentAction` | admin | none | Bundled seed SQL, then `page_templates` | `content.imported` |

Defined in `app/admin/settings/seed-actions.ts`. Runs the same import as
`POST /admin/seed`, from the Contact details screen, so an empty database can be
filled without a shell.

---

## Action Count Summary

Total server actions: **28** (verified by inventory scan).
