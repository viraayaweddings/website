# Change Impact Map

What else could be affected when modifying a feature or module.

---

## Admin Panel Modules

### Users (`/admin/users`)

**If changed, may affect:**
- `users` table schema → login, all auth checks
- `sessions` table → all authenticated requests
- `audit_log.user_id` FK → activity log display
- Password hashing → login compatibility for existing users
- Role definitions → nav.ts filtering, all `requireRole` checks

### Articles / Blogs

**If changed, may affect:**
- `blog_posts` schema → public blog pages, search, dashboard counts
- `blog_listings` → category/tag listing pages
- Slug changes → `blog_listings.post_slug`, public URLs, redirects
- Image fields → R2 storage, `image-references`, media library
- `blog-inject.ts` → public HTML rendering
- Rich text sanitizer → all content with HTML body

### Venues / Hotels

**If changed, may affect:**
- `hotels` schema → public venue pages, city listings, search
- `city_listings` → city index pages (if venue deleted)
- City/slug immutability → URL stability, nearby_slugs references
- `hotel-inject.ts` → public HTML rendering
- Calculator `external_hotel_id` → form/calculator integration

### City Pages

**If changed, may affect:**
- `city_pages` → city index SEO, pagination
- `city_listings` → venue grid on city pages
- `totalVenues` → pagination "Showing X of Y" text
- `venue-listing.ts` → public rendering

### Hero Slider

**If changed, may affect:**
- `hero_slides` → homepage carousel
- `inject.ts` home handler → homepage rendering
- Zero published slides → empty carousel (UX issue)

### Settings (Contact Details)

**If changed, may affect:**
- `settings` table → contact page, footer, injected site-wide
- `settings.ts` cache → 30s delay before public update
- WhatsApp link generation → client-side `wa.me` URLs

### Labels (Section Headings)

**If changed, may affect:**
- `site_labels` → all venue/blog page section headings
- `labels.ts` → public rendering
- Label key additions → need admin UI + inject handler updates

### Media Library

**If changed, may affect:**
- R2 bucket contents → all `/media/*` URLs site-wide
- `media` table → library UI, upload API
- `image-references.ts` → delete protection logic
- All content referencing `/media/<key>` → broken images if deleted

### Leads / Submissions

**If changed, may affect:**
- `leads` table → admin inbox, export, dashboard stats
- `lead-email.ts` → public form submission flow
- Resend integration → email notifications
- All public forms posting to lead endpoints

---

## Worker Modules

### `worker/index.ts` (Router)

**If changed, may affect:**
- All request routing (admin, API, static, injection)
- Security headers on every response
- Cache policies
- Calculator endpoint availability

### `worker/site/inject.ts`

**If changed, may affect:**
- All managed public page rendering
- Hero, settings, labels, blog, hotel injection

### `worker/db/schema.ts`

**If changed, may affect:**
- Requires new Drizzle migration
- All queries referencing changed tables/columns
- Admin forms and actions
- Public injection handlers
- Run `docs:sync` after schema changes

### `worker/lead-email.ts`

**If changed, may affect:**
- All public form submissions
- Rate limiting behavior
- Email notification content/format

---

## Cross-Cutting Impact Chains

### Delete a venue

```
deleteHotelAction
  → DELETE hotels
  → DELETE city_listings (references)
  → releaseImage (R2 cleanup)
  → invalidateHotelCache
  → Public: venue page falls back to static or 404
  → City pages: venue removed from grid
  → nearby_slugs on other venues may reference dead slug
```

### Change article slug

```
updatePostAction (slug change)
  → UPDATE blog_posts.slug
  → UPDATE blog_listings.post_slug
  → Old public URL breaks (no redirect)
  → Search index updates on next query
```

### Disable last admin

```
updateUserAction
  → Blocked by last-admin guard
  → No change (intentional)
```

### Schema migration

```
New drizzle/*.sql
  → worker/db/migrations.ts import
  → Runtime auto-apply on first D1 access
  → Admin forms may need new fields
  → Public inject may need new patches
  → Documentation must update (docs:sync)
```

---

## Safe Change Guidelines

| Change type | Check first |
| --- | --- |
| Add DB column | Migration + admin form + inject handler + docs |
| Change slug | Update listings + check nearby_slugs + blog_listings |
| Delete content | Check image-references + listing references |
| Change auth | All admin pages + API routes + session handling |
| Change Resend config | Test lead submission + resend action |
| Modify inject.ts | Test all page types with verify-*.py scripts |
