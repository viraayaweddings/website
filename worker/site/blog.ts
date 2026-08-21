/**
 * Blog content, rendered into the site's existing article shell.
 *
 * The page chrome (nav, styles, forms, footer) stays in site-public and is
 * streamed through HTMLRewriter; only the slots an editor controls are
 * replaced. Posts created in the admin panel have no static file of their own,
 * so they borrow the shell of an existing article.
 */
import { asc, eq } from "drizzle-orm";
import { getDb, type DatabaseEnv } from "../db/client";
import { blogListings, blogPosts, type BlogFaq, type BlogPost } from "../db/schema";
import { escapeHtml } from "./hero";
import { renderLabel, type ResolvedLabels } from "./labels";

export const BLOG_PREFIX = "/blogs/";
export const BLOG_LISTING_PATHS = new Set(["/blogs", "/blogs/", "/blogs/index.html"]);

/**
 * Shell used for posts that have no static file. Any published article works;
 * this one is simply an existing page and is not otherwise special.
 *
 * Requested as a directory URL on purpose: the asset layer answers the
 * "/index.html" form with a 307 to the pretty URL, which would otherwise be
 * passed through to the visitor.
 */
export const BLOG_SHELL_PATH = "/blogs/when-to-book-a-wedding-venue/";

/** Listing sub-sections that are not articles. */
const NON_POST_SEGMENTS = new Set(["category", "tag", "index.html"]);

const CACHE_TTL_MS = 30_000;
let cache: { at: number; posts: BlogPost[] } | null = null;

export function invalidateBlogCache(): void {
  cache = null;
}

/** Returns the slug for an article URL, or "" for listing and category pages. */
export function blogSlugFromPath(pathname: string): string {
  if (!pathname.startsWith(BLOG_PREFIX)) return "";
  if (BLOG_LISTING_PATHS.has(pathname)) return "";

  const segments = pathname.slice(BLOG_PREFIX.length).split("/").filter(Boolean);
  if (segments.length === 0) return "";
  if (NON_POST_SEGMENTS.has(segments[0])) return "";

  // Both /blogs/<slug> and /blogs/<slug>/index.html resolve to the same post.
  const slug = segments[0];
  return /^[a-z0-9-]+$/i.test(slug) ? slug : "";
}

export function parseFaqs(value: string): BlogFaq[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is BlogFaq => Boolean(item) && typeof item === "object")
      .map((item, index) => ({
        id: Number.isFinite(item.id) && item.id > 0 ? Number(item.id) : index + 1,
        question: String(item.question ?? ""),
        answer: String(item.answer ?? ""),
      }))
      .filter((item) => item.question);
  } catch {
    return [];
  }
}

/** Minimal entity decoder for text lifted back out of stored HTML. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith("#")) {
      const hex = body[1] === "x" || body[1] === "X";
      const code = Number.parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

export interface TocEntry {
  id: string;
  text: string;
  /** 2 for a numbered top-level entry, 3 for an indented sub-entry. */
  level: 2 | 3;
}

/**
 * The table of contents mirrors the article's own headings, which is how the
 * original pages build it: <h2> entries are numbered, <h3> entries sit beneath
 * them without a number. Headings with no id are decorative spacers.
 */
export function tocEntries(bodyHtml: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const pattern = /<(h2|h3)\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(bodyHtml)) !== null) {
    // The heading is markup; strip tags, then decode, so the renderer's own
    // escaping does not double up on entities that were already there.
    const text = decodeEntities(match[3].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    if (text) {
      entries.push({ id: match[2], text, level: match[1].toLowerCase() === "h3" ? 3 : 2 });
    }
  }

  return entries;
}

export function renderTocItems(bodyHtml: string): string {
  let number = 0;

  return tocEntries(bodyHtml)
    .map((entry) => {
      const isSub = entry.level === 3;
      if (!isSub) number += 1;

      return `<li>
    <a href="#${escapeHtml(entry.id)}" class="${isSub ? "toc-level-h3" : ""}">
        <span class="blog-toc-number">
            ${isSub ? "" : String(number)}
        </span>
        <span>${escapeHtml(entry.text)}</span>
    </a>
</li>`;
    })
    .join("\n");
}

export function renderFaqItems(faqs: BlogFaq[]): string {
  return faqs
    .map(
      (faq, index) => `<div class="accordion-item ${index === 0 ? "active" : ""}">
    <h2 class="accordion-header font-family01">
        <button class="accordion-button ${index === 0 ? "" : "collapsed"}"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#blog_faq_${faq.id}">
            ${escapeHtml(faq.question)}
        </button>
    </h2>
    <div id="blog_faq_${faq.id}"
         class="accordion-collapse collapse ${index === 0 ? "show" : ""}"
         data-bs-parent="#blogFaqAccordion">
        <div class="accordion-body">
            ${faq.answer}
        </div>
    </div>
</div>`,
    )
    .join("\n");
}

/**
 * Date, then an optional byline. Posts with no author omit the separator dot
 * as well as the name, matching how the static pages render.
 */
export function renderBannerMeta(post: BlogPost): string {
  const date = `<span>
    <i class="fas fa-calendar-alt me-1"></i>
    ${escapeHtml(post.publishedLabel)}
</span>`;

  if (!post.author) return date;

  return `${date}
<span class="blog-banner-dot">•</span>
<span>
    <i class="fas fa-user-circle me-1"></i>
    ${escapeHtml(post.author)}
</span>`;
}

export function renderListingCards(posts: BlogPost[], labels?: ResolvedLabels): string {
  const readMore = labels ? renderLabel(labels, "card.readMore", "").html : "Read More";

  return posts
    .map(
      (post) => `<div class="col-lg-4 col-md-6 mb-4" data-aos="fade-up">
    <div class="widget">
        <div class="blog-img">
            <img src="${escapeHtml(post.cardImage)}" alt="Wedding Blog" class="w-100 img-fluid" decoding="async" loading="lazy">
        </div>
        <div class="blog-content">
            <div>
                <span class="blog-category">${escapeHtml(post.category)}</span>
                <h5 class="blog-title">${escapeHtml(post.cardTitle)}</h5>
                <p class="blog-text">${escapeHtml(post.cardExcerpt)}</p>
            </div>
            <a href="/blogs/${escapeHtml(post.slug)}" class="btn blog-read-more">${readMore || "Read More"} </a>
        </div>
    </div>
</div>`,
    )
    .join("\n");
}

/** Published posts in display order. Empty on failure, so callers leave the page alone. */
export async function loadPublishedPosts(env: DatabaseEnv): Promise<BlogPost[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.posts;

  try {
    const db = await getDb(env);
    if (!db) return [];

    const posts = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"))
      .orderBy(asc(blogPosts.position), asc(blogPosts.id));

    cache = { at: now, posts };
    return posts;
  } catch (error) {
    console.error("[blog] load failed", error instanceof Error ? error.message : error);
    return cache?.posts ?? [];
  }
}

/**
 * One post by slug, whatever its status.
 *
 * Deliberately uncached and separate from loadPublishedPosts: this backs the
 * draft preview, and a draft must never find its way into the cache that the
 * public pages read from.
 */
export async function findPostBySlug(env: DatabaseEnv, slug: string): Promise<BlogPost | null> {
  try {
    const db = await getDb(env);
    if (!db) return null;
    const rows = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("[blog] preview lookup failed", error instanceof Error ? error.message : error);
    return null;
  }
}

/* --- category and tag pages ------------------------------------------- */

export interface BlogTaxonomy {
  /** "category" or "tag". */
  taxonomy: string;
  slug: string;
}

/** Splits /blogs/category/<slug> or /blogs/tag/<slug>, else null. */
export function blogTaxonomyFromPath(pathname: string): BlogTaxonomy | null {
  if (!pathname.startsWith(BLOG_PREFIX)) return null;

  const segments = pathname.slice(BLOG_PREFIX.length).split("/").filter(Boolean);
  const usable = segments[segments.length - 1] === "index.html" ? segments.slice(0, -1) : segments;
  if (usable.length !== 2) return null;

  const [taxonomy, slug] = usable;
  if (taxonomy !== "category" && taxonomy !== "tag") return null;
  return /^[a-z0-9-]+$/i.test(slug) ? { taxonomy, slug } : null;
}

/** The site's own empty state, used when a page lists no posts. */
export const NO_POSTS_MARKUP = `<div class="col-12">
    <p class="text-center text-muted">No blogs found.</p>
</div>`;

export function renderTaxonomyGrid(posts: BlogPost[], labels?: ResolvedLabels): string {
  return posts.length ? renderListingCards(posts, labels) : NO_POSTS_MARKUP;
}

const listingCacheTtlMs = 30_000;
let listingCache: { at: number; rows: { taxonomy: string; taxonomySlug: string; postSlug: string }[] } | null = null;

export function invalidateBlogListingCache(): void {
  listingCache = null;
}

export async function loadBlogListings(env: DatabaseEnv) {
  const now = Date.now();
  if (listingCache && now - listingCache.at < listingCacheTtlMs) return listingCache.rows;

  try {
    const db = await getDb(env);
    if (!db) return [];

    const rows = await db
      .select({
        taxonomy: blogListings.taxonomy,
        taxonomySlug: blogListings.taxonomySlug,
        postSlug: blogListings.postSlug,
      })
      .from(blogListings)
      .orderBy(asc(blogListings.taxonomy), asc(blogListings.taxonomySlug), asc(blogListings.position));

    listingCache = { at: now, rows };
    return rows;
  } catch (error) {
    console.error("[blog] listing load failed", error instanceof Error ? error.message : error);
    return listingCache?.rows ?? [];
  }
}

/** Posts a category or tag page lists, in order. */
export async function postsForTaxonomy(
  env: DatabaseEnv,
  target: BlogTaxonomy,
  posts: BlogPost[],
): Promise<BlogPost[]> {
  const rows = await loadBlogListings(env);
  const bySlug = new Map(posts.map((post) => [post.slug, post]));

  return rows
    .filter((row) => row.taxonomy === target.taxonomy && row.taxonomySlug === target.slug)
    .map((row) => bySlug.get(row.postSlug))
    .filter((post): post is BlogPost => Boolean(post));
}

export async function loadPost(env: DatabaseEnv, slug: string): Promise<BlogPost | null> {
  const posts = await loadPublishedPosts(env);
  return posts.find((post) => post.slug === slug) ?? null;
}
