# Public Website — Workflows

End-to-end visitor workflows.

---

## 1. Browse Homepage

```
GET /
  → resolvePage (home template) OR static index.html
  → inject hero slides from hero_slides
  → inject WhatsApp/social from settings
  → Return HTML (60s cache)
```

**CTAs:** Book Consultation modal, Explore venues megamenu

---

## 2. Find a Venue

### Via megamenu
```
Click city in Hotels tab → GET /destination-wedding/{city}/
  → inject venue cards from city_listings
  → Show 12 venues + pagination
```

### Via search
```
Type in #searchbox → GET /hotel-search?q=
  → Click result → GET /destination-wedding/{city}/{slug}/
```

### Via calculator
```
/hotel-cost-calculator/ → select city/hotels → view pricing
  → Optional: submit enquiry form
```

---

## 3. View Venue Detail

```
GET /destination-wedding/{city}/{slug}/
  → resolvePage or static + hotel-inject
  → Full venue content rendered
  → User can: enquire, use calculator, view nearby venues
```

**Enquiry:**
```
Fill #enquiryForm → lead-forms.js → POST /api/lead
  → Postgres leads + Resend email → success message
```

---

## 4. Read Blog Article

```
GET /blogs/{slug}/
  → blog-inject replaces content
  → Sidebar form → POST /api/lead
```

---

## 5. Book Consultation

```
/wedding-consultation/
  → Select date + time slot
  → Fill consultation form
  → POST /api/lead (appointment mode)
  → Confirmation shown (no calendar booking created)
```

---

## 6. Check Availability

```
/check-hotel-availability/
  → 4-step wizard
  → POST /api/lead with plan/hotel/date selections
  → UI shows "BOOKED" (cosmetic)
  → Admin sees lead in /admin/leads
```

---

## 7. Compare Hotels

```
/compare-hotel/
  → Select city + up to 5 hotels + date range
  → POST /get-hotel-prices
  → Client renders comparison table
  → No form submission required
```

---

## 8. Contact Us

```
/contact/
  → Injected phone/email/address from settings
  → Submit #contactForm → POST /api/lead
```

---

## 9. Preview Draft Content (Admin)

```
Admin logged in → visit public URL?preview=1
  → isPreviewRequest validates session
  → resolvePage includes draft status
  → no-cache, noindex response
```

---

## 10. Admin Content Change → Visitor Sees Update

```
Admin saves venue at /admin/hotels/:id
  → UPDATE hotels in Postgres
  → Cache invalidation
  → Within 60s: visitor GET sees updated content
```

---

## Failure Flows

| Scenario | Visitor experience |
| --- | --- |
| Lead API rate limit | "Too many submissions" error on form |
| Lead validation fail | Inline field errors |
| Database unavailable | Falls back to the page's original markup |
| Resend email fail | Form shows success; admin sees email_sent=0 |
| Calculator API blocked (cross-origin) | Empty/broken calculator |
| Unknown URL | Platform 404 |

---

## Workflows That Do NOT Exist

| Workflow | Status |
| --- | --- |
| User registration/login | Not implemented |
| Online payment | Not implemented |
| Real booking confirmation | Not implemented |
| User dashboard | Not implemented |
| Live chat | Not implemented |
| Email verification | Not implemented |
