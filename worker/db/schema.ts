/**
 * Admin panel database schema (PostgreSQL).
 */
import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/** Roles, most privileged first. `admin` may manage users and settings. */
export const USER_ROLES = ["admin", "editor"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Lifecycle of a captured enquiry, as shown in the admin leads list. */
export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost", "spam"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    /** `pbkdf2$<iterations>$<salt-b64>$<hash-b64>` — see worker/admin/password.ts. */
    passwordHash: text("password_hash").notNull(),
    role: text("role").$type<UserRole>().notNull().default("editor"),
    /** `disabled` keeps the row for audit history but blocks sign-in. */
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** SHA-256 of the cookie value. The raw token is never stored. */
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    /** Identifiers as submitted by the public form, e.g. `contact-form`. */
    formId: text("form_id").notNull().default(""),
    formName: text("form_name").notNull().default(""),
    pageUrl: text("page_url").notNull().default(""),
    /** Best-effort extraction so the list view is filterable without JSON parsing. */
    name: text("name").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    /** Full submitted payload, JSON-encoded. Forms vary field-by-field. */
    fields: text("fields").notNull().default("{}"),
    /** Request context: IP, user agent, referrer, source page. JSON-encoded. */
    metadata: text("metadata").notNull().default("{}"),
    status: text("status").$type<LeadStatus>().notNull().default("new"),
    notes: text("notes").notNull().default(""),
    /** 1 once Resend accepted the notification email for this lead. */
    emailSent: integer("email_sent").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("leads_created_at_idx").on(table.createdAt),
    index("leads_status_idx").on(table.status),
    index("leads_form_id_idx").on(table.formId),
    index("leads_email_idx").on(table.email),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    /** Null once the acting user is deleted; the entry itself is kept. */
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    userEmail: text("user_email").notNull().default(""),
    /** e.g. `lead.status_changed`, `user.created`. */
    action: text("action").notNull(),
    entity: text("entity").notNull().default(""),
    entityId: text("entity_id").notNull().default(""),
    detail: text("detail").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_log_created_at_idx").on(table.createdAt),
    index("audit_log_entity_idx").on(table.entity, table.entityId),
  ],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;

/* ------------------------------------------------------------------ *
 * Phase 2: site settings, hero slider and uploaded media.
 * ------------------------------------------------------------------ */

/**
 * Free-form key/value store for editable site chrome (contact details, social
 * links). JSON-encoded values keep it usable for later phases without a
 * migration per field.
 */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default("\"\""),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedBy: text("updated_by").notNull().default(""),
});

/** Files uploaded through the admin panel and stored in R2. */
export const media = pgTable(
  "media",
  {
    /** R2 object key, e.g. `hero/3f2a....jpg`. Served from /media/<key>. */
    key: text("key").primaryKey(),
    filename: text("filename").notNull().default(""),
    contentType: text("content_type").notNull().default("application/octet-stream"),
    size: integer("size").notNull().default(0),
    uploadedBy: text("uploaded_by").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("media_created_at_idx").on(table.createdAt)],
);

export const heroSlides = pgTable(
  "hero_slides",
  {
    id: serial("id").primaryKey(),
    /** Ascending display order; gaps are fine. */
    position: integer("position").notNull().default(0),
    published: integer("published").notNull().default(1),
    /** Either an R2 media key or a path already present in site-public. */
    imageKey: text("image_key").notNull().default(""),
    title: text("title").notNull().default(""),
    description: text("description").notNull().default(""),
    /** The small pill beside the three circular icons. */
    badgeTitle: text("badge_title").notNull().default(""),
    badgeSubtitle: text("badge_subtitle").notNull().default(""),
    ctaLabel: text("cta_label").notNull().default(""),
    ctaHref: text("cta_href").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("hero_slides_position_idx").on(table.position)],
);

export type Setting = typeof settings.$inferSelect;
export type MediaFile = typeof media.$inferSelect;
export type HeroSlide = typeof heroSlides.$inferSelect;

/* ------------------------------------------------------------------ *
 * Phase 3: blog posts.
 * ------------------------------------------------------------------ */

export const POST_STATUSES = ["published", "draft"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

/**
 * One row per article. The surrounding page shell stays in site-public and is
 * streamed through HTMLRewriter, so only the parts an editor controls live here.
 */
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    status: text("status").$type<PostStatus>().notNull().default("draft"),
    /** Ascending order on the /blogs listing. */
    position: integer("position").notNull().default(0),

    /** Browser tab and search results; usually differs from the on-page heading. */
    seoTitle: text("seo_title").notNull().default(""),
    metaDescription: text("meta_description").notNull().default(""),
    /** Social preview image, separate from the banner on most posts. */
    ogImage: text("og_image").notNull().default(""),

    bannerImage: text("banner_image").notNull().default(""),
    category: text("category").notNull().default(""),
    /** The <h1> shown over the banner. */
    heading: text("heading").notNull().default(""),
    /** Date exactly as printed, e.g. "August 07, 2026". */
    publishedLabel: text("published_label").notNull().default(""),
    /** Empty on posts that deliberately show no byline. */
    author: text("author").notNull().default(""),

    /** The article itself, as stored HTML. */
    bodyHtml: text("body_html").notNull().default(""),
    /** JSON array of { id, question, answer }; id keeps accordion anchors stable. */
    faqs: text("faqs").notNull().default("[]"),

    /** Which page_templates row renders this article. */
    shellKey: text("shell_key").notNull().default("blog:a"),

    /** Listing card, which often uses a shorter title than the heading. */
    cardTitle: text("card_title").notNull().default(""),
    cardExcerpt: text("card_excerpt").notNull().default(""),
    cardImage: text("card_image").notNull().default(""),

    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("blog_posts_slug_unique").on(table.slug),
    index("blog_posts_position_idx").on(table.position),
    index("blog_posts_status_idx").on(table.status),
  ],
);

export type BlogPost = typeof blogPosts.$inferSelect;
export interface BlogFaq {
  id: number;
  question: string;
  answer: string;
}

/* ------------------------------------------------------------------ *
 * Phase 4: hotel venue pages.
 * ------------------------------------------------------------------ */

/**
 * One row per venue page under /destination-wedding/<city>/<slug>.
 *
 * As with blogs, the page shell stays in site-public and only the editable
 * slots are replaced at request time.
 */
export const hotels = pgTable(
  "hotels",
  {
    id: serial("id").primaryKey(),
    /** URL segments, e.g. "agra" and "itc-mughal-agra". */
    city: text("city").notNull(),
    slug: text("slug").notNull(),
    status: text("status").$type<PostStatus>().notNull().default("published"),

    seoTitle: text("seo_title").notNull().default(""),
    metaDescription: text("meta_description").notNull().default(""),
    metaKeywords: text("meta_keywords").notNull().default(""),
    ogImage: text("og_image").notNull().default(""),

    bannerImage: text("banner_image").notNull().default(""),
    name: text("name").notNull().default(""),
    address: text("address").notNull().default(""),
    /** Free text as printed, e.g. "30 minutes". */
    airportTime: text("airport_time").notNull().default(""),
    stationTime: text("station_time").notNull().default(""),

    /** Overview copy, stored as HTML. */
    description: text("description").notNull().default(""),

    /** The five "at a glance" values, in the order the template lays them out. */
    roomInventory: text("room_inventory").notNull().default(""),
    indoorVenues: text("indoor_venues").notNull().default(""),
    outdoorVenues: text("outdoor_venues").notNull().default(""),
    guestCapacity: text("guest_capacity").notNull().default(""),
    receptionCapacity: text("reception_capacity").notNull().default(""),

    /** JSON array of { image, title }; pages carry between two and six. */
    highlights: text("highlights").notNull().default("[]"),
    /** JSON array of { id, question, answer }; id keeps accordion anchors stable. */
    faqs: text("faqs").notNull().default("[]"),

    /** Card image used by city listings and the nearby-venues strip. */
    thumbnailImage: text("thumbnail_image").notNull().default(""),
    /**
     * Venue type shown on city cards, e.g. "Luxury Hotel". The templates
     * currently emit it commented out, so it is carried but not displayed.
     */
    venueCategory: text("venue_category").notNull().default(""),
    /**
     * Guest figure for listing cards. A handful of venues describe capacity in
     * prose on their own page ("Approximately 650 to 670 guests") but show a
     * plain number on cards; this holds that number. Empty means use
     * guestCapacity.
     */
    cardPax: text("card_pax").notNull().default(""),
    /** Location line on those cards, e.g. "Agra" or "Agra, India". */
    cityLabel: text("city_label").notNull().default(""),
    /** JSON array of "city/slug" shown in this venue's nearby strip, in order. */
    nearbySlugs: text("nearby_slugs").notNull().default("[]"),

    /** Which page_templates row renders this venue. */
    shellKey: text("shell_key").notNull().default("venue:a"),
    /** YouTube id for the tour video, when the venue has one. */
    videoId: text("video_id").notNull().default(""),

    /** Identifiers the enquiry form and cost calculator post back. */
    externalHotelId: text("external_hotel_id").notNull().default(""),
    totalRooms: text("total_rooms").notNull().default(""),

    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("hotels_city_slug_unique").on(table.city, table.slug),
    index("hotels_city_idx").on(table.city),
    index("hotels_status_idx").on(table.status),
  ],
);

export type Hotel = typeof hotels.$inferSelect;
export interface HotelHighlight {
  image: string;
  title: string;
}

/* ------------------------------------------------------------------ *
 * Phase 5: derived venue listings.
 * ------------------------------------------------------------------ */

/**
 * Which venues a city index page shows, and in what order.
 *
 * Held separately from the hotels table because a city page lists a curated
 * subset, not every venue in the city: Delhi NCR, for instance, has 25 venue
 * pages but lists 12. Regenerating the list from the hotels table would change
 * what those pages show.
 */
export const cityListings = pgTable(
  "city_listings",
  {
    id: serial("id").primaryKey(),
    /** City whose index page this row belongs to. */
    city: text("city").notNull(),
    /** Venue shown, as city/slug so cross-city entries stay possible. */
    venueCity: text("venue_city").notNull(),
    venueSlug: text("venue_slug").notNull(),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    uniqueIndex("city_listings_unique").on(table.city, table.venueCity, table.venueSlug),
    index("city_listings_city_idx").on(table.city, table.position),
  ],
);

export type CityListing = typeof cityListings.$inferSelect;

/**
 * Which posts a blog category or tag page lists, and in what order.
 *
 * Stored rather than derived for the same reason as city listings: the
 * "Wedding Planning" page shows 9 of the 11 posts that carry that category, so
 * regenerating the list from the posts table would change the page.
 */
export const blogListings = pgTable(
  "blog_listings",
  {
    id: serial("id").primaryKey(),
    /** "category" or "tag". */
    taxonomy: text("taxonomy").notNull(),
    /** URL segment, e.g. "weeding-planning". */
    taxonomySlug: text("taxonomy_slug").notNull(),
    postSlug: text("post_slug").notNull(),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    uniqueIndex("blog_listings_unique").on(table.taxonomy, table.taxonomySlug, table.postSlug),
    index("blog_listings_page_idx").on(table.taxonomy, table.taxonomySlug, table.position),
  ],
);

export type BlogListing = typeof blogListings.$inferSelect;

/* ------------------------------------------------------------------ *
 * Phase 6: page shells, so pages render from the database alone.
 * ------------------------------------------------------------------ */

/**
 * The surrounding markup for a page type: head, navigation, styles, footer and
 * scripts. Content is written over it at request time by the same handlers that
 * used to run against the files in site-public.
 *
 * Near-identical variants exist because a few pages carry an extra optional
 * script block, so each page records which shell it uses.
 */
export const pageTemplates = pgTable("page_templates", {
  /** e.g. "venue:a", "blog:a", "city", "home". */
  key: text("key").primaryKey(),
  /** Groups the variants: "venue", "blog", "city", "blog-listing", "home", "contact". */
  kind: text("kind").notNull(),
  html: text("html").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

/** The per-city bits of a city index page; the venue grid comes from city_listings. */
export const cityPages = pgTable("city_pages", {
  city: text("city").primaryKey(),
  seoTitle: text("seo_title").notNull().default(""),
  metaDescription: text("meta_description").notNull().default(""),
  /** Numeric id the venue filter form posts back. */
  cityId: text("city_id").notNull().default(""),
  /**
   * How many venues the city has in total. The page shows the first twelve and
   * paginates the rest onto /hotel-listing, so this drives both the "Showing
   * 1 - 12 of 30" line and the pager.
   */
  totalVenues: integer("total_venues").notNull().default(0),
  shellKey: text("shell_key").notNull().default("city"),
});

/**
 * Pages with no content model of their own -- the calculators, the city landing
 * pages, the policy and story pages. They were served straight from their cloned
 * file, so nothing an admin changed ever reached them.
 *
 * The whole page is stored, not a shell plus fields: there is no repeating
 * structure to model here, and the point is to make the markup itself something
 * the panel owns. The panel edits the parts that are safe to edit -- the SEO
 * fields, and which image sits in each slot -- rather than exposing the markup,
 * because several of these pages carry inline scripts the calculators need.
 */
export const staticPages = pgTable(
  "static_pages",
  {
    /** Request path, no trailing slash: "/about-us". */
    path: text("path").primaryKey(),
    title: text("title").notNull().default(""),
    metaDescription: text("meta_description").notNull().default(""),
    html: text("html").notNull().default(""),
    published: integer("published").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedBy: text("updated_by").notNull().default(""),
  },
  (table) => [index("static_pages_published_idx").on(table.published)],
);

export type StaticPage = typeof staticPages.$inferSelect;

export type PageTemplate = typeof pageTemplates.$inferSelect;
export type CityPage = typeof cityPages.$inferSelect;

/**
 * Fixed wording on the pages: section headings and field labels.
 *
 * Several headings are styled as a plain part followed by an emphasised span
 * ("Hotel <b>Amenities</b>"), so both halves are stored. `emphasis` is empty
 * for a plain label.
 */
export const siteLabels = pgTable("site_labels", {
  /** e.g. "venue.amenities", "venue.glance.rooms". */
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  emphasis: text("emphasis").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedBy: text("updated_by").notNull().default(""),
});

export type SiteLabel = typeof siteLabels.$inferSelect;

/** Cross-isolate rate limiting (admin login, etc.). */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true, mode: "date" }).notNull(),
});

export type RateLimit = typeof rateLimits.$inferSelect;

/* ---------------------------------------------------------------------------
 * Hotel cost calculator
 *
 * The dataset the public calculator prices from. It used to be a 748KB bundled
 * file plus a copy under site-public, editable only by redeploying; these are
 * the same records, owned by the admin panel.
 *
 * Ids are the originals from that dataset, not new ones: the venue pages carry
 * `<input id="hotelId" value="100">` in their markup, so renumbering would
 * silently unprice every venue page.
 * ------------------------------------------------------------------------- */

/** Months the calculator prices, in calendar order. */
export const CALCULATOR_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
export type CalculatorMonth = (typeof CALCULATOR_MONTHS)[number];

export const calculatorCities = pgTable(
  "calculator_cities",
  {
    /** Original dataset id, referenced by the public pages. */
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    /** Hidden from the picker without losing its hotels or their prices. */
    published: integer("published").notNull().default(1),
    position: integer("position").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("calculator_cities_name_idx").on(table.name)],
);

export type CalculatorCity = typeof calculatorCities.$inferSelect;

export const calculatorHotels = pgTable(
  "calculator_hotels",
  {
    /** Original dataset id; the venue pages hardcode it. */
    id: integer("id").primaryKey(),
    cityId: integer("city_id").notNull(),
    name: text("name").notNull(),
    /** Caps the rooms-per-night input on the venue calculator. */
    totalRooms: integer("total_rooms").notNull().default(0),
    published: integer("published").notNull().default(1),
    position: integer("position").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("calculator_hotels_city_idx").on(table.cityId),
    index("calculator_hotels_name_idx").on(table.name),
  ],
);

export type CalculatorHotel = typeof calculatorHotels.$inferSelect;

/**
 * One row per hotel per month. Prices are text, matching the dataset: they
 * arrive as "145000.00" and the calculator parses them, so storing them as
 * numeric would change what the page receives for no benefit.
 */
export const calculatorPrices = pgTable(
  "calculator_prices",
  {
    id: serial("id").primaryKey(),
    hotelId: integer("hotel_id").notNull(),
    month: text("month").$type<CalculatorMonth>().notNull(),
    roomPrice: text("room_price").notNull().default("0.00"),
    lunchPrice: text("lunch_price").notNull().default("0.00"),
    hiteaPrice: text("hitea_price").notNull().default("0.00"),
    dinnerPrice: text("dinner_price").notNull().default("0.00"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("calculator_prices_hotel_month_idx").on(table.hotelId, table.month),
  ],
);

export type CalculatorPrice = typeof calculatorPrices.$inferSelect;

export const calculatorCurrencies = pgTable("calculator_currencies", {
  /** ISO code, e.g. INR. */
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull().default(""),
  /** How many of this currency one USD buys; the calculator converts through USD. */
  rateToUsd: text("rate_to_usd").notNull().default("1"),
  isDefault: integer("is_default").notNull().default(0),
  position: integer("position").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export type CalculatorCurrency = typeof calculatorCurrencies.$inferSelect;
