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
| **Validation** | Required fields; email format; active status. Two rate limits, either of which throttles: 8/15min on `login:<ip>:<email>`, and 25/60min on `login-account:<email>` so the ceiling holds when an attacker changes address |
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

## Account Actions (`app/admin/account/actions.ts`)

The only actions any signed-in role may call on itself. Everything else in this
document is `requireRole("admin")` unless stated.

| Action | Auth | Input | Writes | Audit |
| --- | --- | --- | --- | --- |
| `changeOwnPasswordAction` | any signed-in | `current`, `password`, `confirm` | `users.password_hash`; revokes the user's other sessions | `user.password_changed`, or `user.password_change_failed` on a wrong current password |
| `updateOwnProfileAction` | any signed-in | `name` (≤120 chars) | `users.name` | `user.profile_updated` |
| `signOutEverywhereAction` | any signed-in | none | Deletes every `sessions` row for the user | `user.sessions_cleared` |

Re-entering the current password is what makes `changeOwnPasswordAction` safe to
expose to every role: a borrowed unlocked laptop cannot be used to lock the
owner out. Wrong current passwords are themselves rate limited — 6 in 15 minutes
— and each one is audited, so a guessing attempt against an open session leaves
a trail.

Before this existed the only way a password changed was an admin resetting it,
so an editor who thought theirs was compromised had to find an admin, say a new
password out loud, and trust them with it.

---

## Activity Actions (`app/admin/activity/actions.ts`)

| Action | Auth | Input | Writes | Audit |
| --- | --- | --- | --- | --- |
| `deleteActivityEntryAction` | admin | `id` | Deletes one `audit_log` row | `activity.deleted` |
| `bulkDeleteActivityAction` | admin | `ids` (≤200) | Deletes the selected `audit_log` rows | `activity.bulk_deleted` |
| `pruneActivityAction` | admin | `days` | Deletes `audit_log` rows older than the window | `activity.pruned` |

**Deleting from the log is itself logged**, so the trail cannot be quietly
erased: a gap always has an entry beside it saying who made it. `pruneActivityAction`
is the routine way to keep the log a workable size; deleting rows one at a time
is for the odd mistake, not for housekeeping.

---

## Bulk Actions

Thirteen actions share one shape, so they are documented as a pattern rather than
one at a time. Every one of them:

- is `admin` only, and calls `assertSameOrigin()` first;
- reads its selection from repeated `ids` form fields, de-duplicated and
  validated per-row (a malformed id is dropped, not rejected);
- refuses an empty selection, and refuses more than **200** in one call;
- re-checks that every selected row still exists and fails with "Refresh and try
  again" if not, so a stale list cannot delete the wrong thing;
- writes in a single transaction, then calls `publishContentChange()` — the
  local `invalidate*Cache()` calls only reach the instance that handled the
  request (see [`content_version`](../05-database.md#content_version));
- records one audit entry for the whole batch, with a `count`.

| Action | Module | Deletes / updates | Audit |
| --- | --- | --- | --- |
| `bulkDeletePostsAction` | blogs | `blog_posts` | `blog.bulk_deleted` |
| `bulkDeleteSlidesAction` | hero | `hero_slides` | `hero.bulk_deleted` |
| `bulkDeleteHotelsAction` | hotels | `hotels` | `hotel.bulk_deleted` |
| `bulkDeleteUsersAction` | users | `users` + their `sessions`; refuses to remove the last admin (counted in SQL, not by loading rows) | `user.bulk_deleted` |
| `bulkDeleteMediaAction` | media | Each key through `releaseImage`, which **keeps** any image still referenced and deletes only the unused ones | `media.bulk_deleted` |
| `bulkDeleteCitiesAction` | cities | `city_pages` + `city_listings` | `city.bulk_deleted` |
| `bulkPublishCitiesAction` | cities | `city_pages.published` | `city.updated` |
| `bulkPublishPagesAction` | pages | `static_pages.published` | `page.bulk_published` |
| `bulkResetPagesAction` | pages | Clears stored HTML so pages fall back to their cloned file | `page.bulk_reset` |
| `bulkDeleteCalculatorCitiesAction` | calculator | `calculator_cities` | `calculator.city_bulk_deleted` |
| `bulkDeleteCalculatorHotelsAction` | calculator | `calculator_hotels` (+ prices, by cascade) | `calculator.hotel_bulk_deleted` |
| `bulkDeleteCalculatorTaxesAction` | calculator | `calculator_taxes` | `calculator.tax_bulk_deleted` |
| `bulkDeleteCurrenciesAction` | calculator | `calculator_currencies` | `calculator.currency_bulk_deleted` |

`app/admin/_components/BulkBar.tsx` provides the selection UI (`BulkSelection`,
`RowCheckbox`) for all of them.

---

## Blog Actions (`app/admin/blogs/actions.ts`)

### `createPostAction`

**Auth:** `requireUser`  
**Validation:** Slug normalized + unique; required heading/seoTitle/cardTitle; rich text sanitized; FAQ via `readRichText`; images uploaded after validation  
**DB:** INSERT `blog_posts` (position=min−1, so a new article lands at the top of
`/blogs`, of its category page and of the admin list — all three sort on
position ascending); cache invalidation  
**Audit:** `blog.created`

Positions go negative and that is fine. `movePostAction` renumbers the whole
sequence from zero whenever anyone reorders, so they stay dense in practice.

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

### Wedding type vocabulary

The filter on the venue listing offers whatever `venue_types` holds. These two
actions edit that vocabulary; tagging a venue is part of `updateHotelAction`.

| Action | Auth | Input | Writes | Audit |
| --- | --- | --- | --- | --- |
| `saveVenueTypeAction` | admin | `slug` (lowercased, `[a-z0-9-]` only), `label` (≤60 chars), `position`, `published` | INSERT or UPDATE `venue_types` | `venue_type.saved` |
| `deleteVenueTypeAction` | admin | `id` | DELETE `venue_types` | `venue_type.deleted` |

`deleteVenueTypeAction` **refuses** while any venue still carries the slug in its
`wedding_types`, rather than deleting and leaving those venues tagged with a type
that no longer exists. To retire a type without untagging anything, unpublish it
instead — the filter option disappears and the tags survive.

`bulkDeleteHotelsAction` follows the [shared bulk pattern](#bulk-actions).

---

## City Actions (`app/admin/cities/actions.ts`)

### `saveCityAction`

**Auth:** `requireRole("admin")`  
**Params:** `city`, `venues`, `seoTitle`, `metaDescription`, `cityId`, `totalVenues`  
**Validation:** city slug valid; seoTitle required; venues parsed; totalVenues ≥ 0  
**DB:** UPDATE `city_pages`; DELETE + INSERT `city_listings`; cache invalidation  
**Audit:** `city.updated`

### `createCityAction`

**Auth:** `requireRole("admin")`  
**Params:** `city` slug, plus the same SEO fields as `saveCityAction`  
**DB:** INSERT `city_pages`  
**Audit:** `city.created`

### `deleteCityAction`

**Auth:** `requireRole("admin")`  
**DB:** DELETE `city_listings` then `city_pages`, in one transaction  
**Audit:** `city.deleted`

### `syncCityTotalAction`

**Auth:** `requireRole("admin")`  
**Params:** `city`  
**DB:** Recounts the city's venues and writes `city_pages.total_venues`  
**Audit:** `city.updated`

The total is stored rather than counted per request because the city index prints
it in its heading and its pagination, and counting on every render would cost a
query on the site's most-visited pages. Storing it means it can drift, which is
what this action is for.

Bulk equivalents — `bulkDeleteCitiesAction`, `bulkPublishCitiesAction` — follow
the [shared bulk pattern](#bulk-actions).

---

## Static Page Actions (`app/admin/pages/actions.ts`)

The `static_pages` table holds whole pages that have no content model of their
own. See [Stored pages](#stored-pages) below and
[`static_pages`](../05-database.md#static_pages).

| Action | Auth | Input | Writes | Audit |
| --- | --- | --- | --- | --- |
| `saveStaticPageAction` | admin | `path`, `title`, `metaDescription`, `html`, `published` | `static_pages` | `page.updated` |
| `createStaticPageAction` | admin | `path` + the fields above | INSERT `static_pages` | `page.created` |
| `resetStaticPageAction` | admin | `path` | Clears the stored HTML so the page falls back to its cloned file | `page.reset` |
| `replacePageImageAction` | admin | `path`, `from`, `to` | Repoints one image reference inside the stored HTML | `page.image_replaced` |

Bulk equivalents — `bulkPublishPagesAction`, `bulkResetPagesAction` — follow the
[shared bulk pattern](#bulk-actions).

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

A referenced image cannot be deleted at all — the action refuses rather than
breaking the page that uses it. `findImageReferences` is what makes that check
possible; it scans every column that can hold an image key, including the HTML
of stored pages.

### `replaceMediaAction`

**Auth:** `requireRole("admin")`  
**Params:** `key`, a new file upload  
**Validation:** The upload is sniffed by magic bytes, not trusted by extension, and content-addressed the same way an ordinary upload is  
**DB/R2:** Uploads the new object, repoints every reference from the old key to the new one, then releases the old key  
**Audit:** `media.replaced`

This exists because the alternative — delete, re-upload, then fix each reference
by hand — cannot be done at all for an image used on several pages, and the
delete is refused while any reference remains.

`bulkDeleteMediaAction` follows the [shared bulk pattern](#bulk-actions).

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

## Stored pages

Venues, articles and city indexes are rebuilt from a shell plus content rows.
The remaining 35 pages -- the calculators, the ten city landing pages, the
policy and story pages -- have no repeating structure to model, so `static_pages`
holds each one whole.

| Action | Auth | Input | Writes | Audit |
| --- | --- | --- | --- | --- |
| `saveStaticPageAction` | admin | path, title, metaDescription, published | `static_pages` | `page.updated` |
| `replacePageImageAction` | admin | path, current image, an upload | `static_pages.html`, and `media` for the upload | `page.image_replaced` |
| `resetStaticPageAction` | admin | path | Deletes the row | `page.reset` |

The panel does not expose the markup. Several of these pages carry the inline
scripts the calculators need, and the save-time sanitiser strips `script` -- so
a raw-HTML field would quietly break the page it was meant to edit. What it
exposes instead is the part that is safe and is what people actually want to
change: the search listing, and which picture sits in each slot.

`replacePageImageAction` swaps every occurrence of a path, not the first. The
same image is often on a page twice, full size and as a thumbnail, and changing
one of them looks like a bug.

Resetting deletes the row rather than restoring a backup. The cloned file is
still on disk and is still what serves when there is no stored copy, so dropping
the row *is* the undo, and the page stays up throughout.

---

## Cost calculator

| Action | Auth | Input | Writes | Audit |
| --- | --- | --- | --- | --- |
| `saveCalculatorCityAction` | admin | id?, name, position, published | `calculator_cities` | `calculator.city_created` / `_updated` |
| `deleteCalculatorCityAction` | admin | id | `calculator_cities` | `calculator.city_deleted` |
| `saveCalculatorHotelAction` | admin | id?, name, cityId, totalRooms, published | `calculator_hotels`, and twelve blank prices for a new one | `calculator.hotel_created` / `_updated` |
| `deleteCalculatorHotelAction` | admin | id | `calculator_hotels` + `calculator_prices`, in one transaction | `calculator.hotel_deleted` |
| `saveCalculatorPricesAction` | admin | hotelId, four prices per month | `calculator_prices`, twelve rows in one upsert | `calculator.prices_updated` |
| `saveCalculatorTaxAction` | admin | code, label, percent, position, published | `calculator_taxes` | `calculator.tax_saved` |
| `deleteCalculatorTaxAction` | admin | code | `calculator_taxes` | `calculator.tax_deleted` |
| `saveCalculatorBudgetAction` | admin | code, label, minAmount, maxAmount, position, published | `calculator_budgets` | `calculator.budget_saved` |
| `deleteCalculatorBudgetAction` | admin | code | `calculator_budgets` | `calculator.budget_deleted` |
| `bulkDeleteCalculatorBudgetsAction` | admin | ids | `calculator_budgets` | `calculator.budget_bulk_deleted` |
| `saveCurrencyAction` | admin | code, name, symbol, rateToUsd, isDefault | `calculator_currencies` | `calculator.currency_saved` |
| `deleteCurrencyAction` | admin | code | `calculator_currencies` | `calculator.currency_deleted` |
| `importCalculatorDataAction` | admin | none | Seeds all four tables from the bundle | `calculator.imported` |

Named `Calculator*` deliberately: `saveCityAction` and `deleteHotelAction`
already exist for city pages and venues, and the two sets are unrelated.

Deleting a city that still has hotels is refused rather than cascaded. Deleting
a currency is refused when it is the last one, and promotes another to default
so the picker never opens empty.

Tax lines are rows because CGST 9% and SGST 9% were hardcoded in four copies of
the calculator script, and the same 18% appeared as a bare `* 1.18` in a fifth.
Every calculator renders one summary row per published tax, in `position` order,
so a site needing a third line adds it with no deploy.

The four bulk deletes here — `bulkDeleteCalculatorCitiesAction`,
`bulkDeleteCalculatorHotelsAction`, `bulkDeleteCalculatorTaxesAction`,
`bulkDeleteCurrenciesAction` — follow the [shared bulk pattern](#bulk-actions).

---

## Audit Vocabulary

Every action writes one `audit_log` row, and `/admin/activity` is the only record
of who changed what. `app/admin/_lib/audit-labels.ts` turns the stored string
into the words an admin reads, and colours the row by tone.

**71 actions, all labelled.** `humanAuditAction` does fall back to the verb after
the dot, but that drops the object -- eight actions were reaching the log that
way, so `activity.deleted` printed as "Deleted" and `content.imported` as
"Imported", which beside a row saying "Article created" reads as though something
unnamed had gone. `tests/audit-labels.test.mjs` now fails if a `recordAudit` call
names an action the map does not cover, or if the map carries one nothing
records.

Tone comes from `auditActionTone`, by substring: `deleted` or `resend_failed`
→ **bad**, `created` or `resent` → **ok**, anything under `user.` → **accent**,
otherwise neutral.

**`activity`**

| Action | Shown as | Tone |
| --- | --- | --- |
| `activity.bulk_deleted` | Activity entries deleted | bad |
| `activity.deleted` | Activity entry deleted | bad |
| `activity.pruned` | Activity log pruned | neutral |

**`blog`**

| Action | Shown as | Tone |
| --- | --- | --- |
| `blog.bulk_deleted` | Articles bulk deleted | bad |
| `blog.created` | Article created | ok |
| `blog.deleted` | Article deleted | bad |
| `blog.reordered` | Article reordered | neutral |
| `blog.updated` | Article updated | neutral |

**`blog_section`**

| Action | Shown as | Tone |
| --- | --- | --- |
| `blog_section.updated` | Section listing updated | neutral |

**`calculator`**

| Action | Shown as | Tone |
| --- | --- | --- |
| `calculator.city_bulk_deleted` | Calculator cities bulk deleted | bad |
| `calculator.city_created` | Calculator city created | ok |
| `calculator.city_deleted` | Calculator city deleted | bad |
| `calculator.city_updated` | Calculator city updated | neutral |
| `calculator.currency_bulk_deleted` | Currencies bulk deleted | bad |
| `calculator.currency_deleted` | Currency deleted | bad |
| `calculator.currency_saved` | Currency saved | neutral |
| `calculator.hotel_bulk_deleted` | Calculator hotels bulk deleted | bad |
| `calculator.hotel_created` | Calculator hotel created | ok |
| `calculator.hotel_deleted` | Calculator hotel deleted | bad |
| `calculator.hotel_updated` | Calculator hotel updated | neutral |
| `calculator.budget_bulk_deleted` | Budget bands bulk deleted | bad |
| `calculator.budget_deleted` | Budget band deleted | bad |
| `calculator.budget_saved` | Budget band saved | neutral |
| `calculator.imported` | Calculator data imported | neutral |
| `calculator.prices_updated` | Prices updated | neutral |
| `calculator.tax_bulk_deleted` | Tax rates bulk deleted | bad |
| `calculator.tax_deleted` | Tax rate deleted | bad |
| `calculator.tax_saved` | Tax rate saved | neutral |

**`city`**

| Action | Shown as | Tone |
| --- | --- | --- |
| `city.bulk_deleted` | City pages bulk deleted | bad |
| `city.created` | City page created | ok |
| `city.deleted` | City page deleted | bad |
| `city.updated` | City page updated | neutral |

**`content`**

| Action | Shown as | Tone |
| --- | --- | --- |
| `content.imported` | Site content imported | neutral |

**`hero`**

| Action | Shown as | Tone |
| --- | --- | --- |
| `hero.bulk_deleted` | Slides bulk deleted | bad |
| `hero.reordered` | Slide reordered | neutral |
| `hero.slide_created` | Slide created | ok |
| `hero.slide_deleted` | Slide deleted | bad |
| `hero.slide_updated` | Slide updated | neutral |

**`hotel`**

| Action | Shown as | Tone |
| --- | --- | --- |
| `hotel.bulk_deleted` | Venues bulk deleted | bad |
| `hotel.created` | Venue created | ok |
| `hotel.deleted` | Venue deleted | bad |
| `hotel.moved` | Venue URL changed | neutral |
| `hotel.updated` | Venue updated | neutral |

**`labels`**

| Action | Shown as | Tone |
| --- | --- | --- |
| `labels.updated` | Section headings updated | neutral |

**`lead`**

| Action | Shown as | Tone |
| --- | --- | --- |
| `lead.bulk_deleted` | Bulk delete | bad |
| `lead.bulk_status` | Bulk status change | neutral |
| `lead.deleted` | Submission deleted | bad |
| `lead.email_resend_failed` | Notification resend failed | bad |
| `lead.email_resent` | Notification resent | ok |
| `lead.exported` | Submissions exported | neutral |
| `lead.notes_updated` | Notes updated | neutral |
| `lead.status_changed` | Status changed | neutral |

**`media`**

| Action | Shown as | Tone |
| --- | --- | --- |
| `media.bulk_deleted` | Images bulk deleted | bad |
| `media.deleted` | Image deleted | bad |
| `media.replaced` | Image replaced | neutral |

**`page`**

| Action | Shown as | Tone |
| --- | --- | --- |
| `page.bulk_published` | Pages shown or hidden | neutral |
| `page.bulk_reset` | Pages reset | neutral |
| `page.created` | Page created | ok |
| `page.image_replaced` | Page picture replaced | neutral |
| `page.reset` | Page reset | neutral |
| `page.updated` | Page updated | neutral |

**`settings`**

| Action | Shown as | Tone |
| --- | --- | --- |
| `settings.updated` | Contact details updated | neutral |

**`user`**

| Action | Shown as | Tone |
| --- | --- | --- |
| `user.bulk_deleted` | Users bulk deleted | bad |
| `user.created` | User created | ok |
| `user.deleted` | User deleted | bad |
| `user.login` | Signed in | accent |
| `user.password_change_failed` | Own password change refused | accent |
| `user.password_changed` | Own password changed | accent |
| `user.password_reset` | Password reset | accent |
| `user.profile_updated` | Own name changed | accent |
| `user.sessions_cleared` | Signed out everywhere | accent |
| `user.updated` | User updated | accent |

**`venue_type`**

| Action | Shown as | Tone |
| --- | --- | --- |
| `venue_type.deleted` | Wedding type deleted | bad |
| `venue_type.saved` | Wedding type saved | neutral |

### Reading a row

`user_email` is denormalised onto the row, so the log still names who acted after
the account is deleted -- the FK is `SET NULL`, not `CASCADE`, precisely so the
history survives. A bulk action writes **one** row listing every id it touched,
comma-separated, which is why the lead detail page matches history with
`string_to_array(entity_id, ',') @> ARRAY[id]` rather than an equality test: an
exact match found only the single-row edits, so a status set from the list view's
bulk bar left no trace on the enquiry's own timeline.

---

## Action Count Summary

Total server actions: **67**, every one of which must appear in this document —
`npm run docs:validate` fails on any that does not.

| Module | Actions |
| --- | --- |
| `account` | 3 |
| `activity` | 3 |
| `blogs` (+ `blogs/sections`) | 6 |
| `calculator` | 14 |
| `cities` | 6 |
| `hero` | 5 |
| `hotels` | 6 |
| `labels` | 1 |
| `leads` | 5 |
| `login` | 1 |
| `media` | 3 |
| `pages` | 6 |
| `settings` (+ `settings/seed-actions`) | 2 |
| `setup` | 1 |
| `users` | 5 |

The count was recorded as 28 here while the code had 67. It was not caught
because validation accepted an entity's presence in `docs/manifest.json` as proof
it was documented, and `docs:sync` wrote that file from the code scan — so every
new action marked itself documented. Both scripts now read only the prose. See
[Documentation Sync System](../16-sync-system.md).
