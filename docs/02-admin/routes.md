# Admin Routes

Complete route inventory for `/admin/*`.

---

## Page Routes

| Route | File | Module | Auth | Purpose |
| --- | --- | --- | --- | --- |
| `/admin` | `app/admin/page.tsx` | Dashboard | `requireUser` | Stats, charts, recent leads |
| `/admin/login` | `app/admin/login/page.tsx` | Auth | Public* | Sign in |
| `/admin/setup` | `app/admin/setup/page.tsx` | Auth | Public* | First admin creation |
| `/admin/leads` | `app/admin/leads/page.tsx` | Submissions | `requireUser` | Lead list with filters |
| `/admin/leads/:id` | `app/admin/leads/[id]/page.tsx` | Submissions | `requireUser` | Lead detail + notes |
| `/admin/activity` | `app/admin/activity/page.tsx` | Audit | `requireRole("admin")` | Activity timeline |
| `/admin/hotels` | `app/admin/hotels/page.tsx` | Venues | `requireUser` | Venue list |
| `/admin/hotels/new` | `app/admin/hotels/new/page.tsx` | Venues | `requireUser` | Create venue |
| `/admin/hotels/:id` | `app/admin/hotels/[id]/page.tsx` | Venues | `requireUser` | Edit venue |
| `/admin/blogs` | `app/admin/blogs/page.tsx` | Articles | `requireUser` | Article list |
| `/admin/blogs/new` | `app/admin/blogs/new/page.tsx` | Articles | `requireUser` | Create article |
| `/admin/blogs/:id` | `app/admin/blogs/[id]/page.tsx` | Articles | `requireUser` | Edit article |
| `/admin/blogs/sections` | `app/admin/blogs/sections/page.tsx` | Articles | `requireRole("admin")` | Category/tag listings |
| `/admin/cities` | `app/admin/cities/page.tsx` | Cities | `requireRole("admin")` | City index list |
| `/admin/cities/:city` | `app/admin/cities/[city]/page.tsx` | Cities | `requireRole("admin")` | Edit city page |
| `/admin/hero` | `app/admin/hero/page.tsx` | Hero | `requireUser` | Carousel management |
| `/admin/media` | `app/admin/media/page.tsx` | Media | `requireUser` | Image library |
| `/admin/settings` | `app/admin/settings/page.tsx` | Settings | `requireRole("admin")` | Contact details |
| `/admin/labels` | `app/admin/labels/page.tsx` | Labels | `requireRole("admin")` | Section headings |
| `/admin/users` | `app/admin/users/page.tsx` | Users | `requireRole("admin")` | User management |

\*Public only when appropriate: login when users exist; setup when zero users.

---

## API Route Handlers

| Route | Methods | File | Auth | Response |
| --- | --- | --- | --- | --- |
| `/admin/logout` | POST | `app/admin/logout/route.ts` | None | 303 → login |
| `/admin/search` | GET | `app/admin/search/route.ts` | Session (401) | JSON `{ hits }` |
| `/admin/leads/export` | GET | `app/admin/leads/export/route.ts` | Session (401) | CSV download |
| `/admin/media/upload` | GET, POST | `app/admin/media/upload/route.ts` | Session (401) | JSON library / upload result |

---

## Route Details

### `/admin/search`

**Query:** `q` (search term)  
**Searches:** `hotels`, `blogPosts`, `leads`; `cityPages` (admin only)  
**Returns:** `{ hits: [{ type, title, href, snippet }] }`

### `/admin/leads/export`

**Query:** Same filters as leads list (`q`, `form`, `from`, `to`, `sort`, `dir`)  
**Output:** CSV with IST timestamps, formula-injection guard  
**Cap:** 5000 rows (silent truncate — see Audit Findings)

### `/admin/media/upload`

**GET:** Returns recent media library JSON  
**POST:** Multipart upload → R2 + `media` row; requires same-origin header

---

## Layout & Metadata

**File:** `app/admin/layout.tsx`

- `export const dynamic = "force-dynamic"`
- Metadata: `robots: { index: false, follow: false }`
- Wraps children in theme bootstrap + `.vw-admin` class

---

## Related Routes (Non-Admin)

See [Route Map](../03-routes.md) for public site and worker routes.
