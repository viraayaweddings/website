/**
 * Homepage hero slider content.
 *
 * The published slides are rendered into the same markup the static homepage
 * already ships, so switching the slider over to the database does not change
 * how the page looks or what it says.
 */
import { asc, eq } from "drizzle-orm";
import { getDb, type DatabaseEnv } from "../db/client";
import { heroSlides, type HeroSlide } from "../db/schema";

/** Uploaded files are served from this prefix by the worker. */
export const MEDIA_PREFIX = "/media/";

const CACHE_TTL_MS = 30_000;
let cache: { at: number; slides: HeroSlide[] } | null = null;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Resolves a stored image reference to a URL. Values starting with "/" are
 * existing site-public paths; anything else is an R2 media key.
 */
export function heroImageUrl(imageKey: string): string {
  const trimmed = imageKey.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `${MEDIA_PREFIX}${trimmed}`;
}

/**
 * Only same-origin paths and http(s) links are allowed through, so a stored
 * value can never become a javascript: or data: URL in the rendered page.
 */
export function safeHref(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "#";
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return "#";
}

/** The image URL is dropped into url('...') inside a style attribute. */
function cssUrl(url: string): string {
  // The value is always server-generated -- a media key or a site-public
  // path -- so anything that could terminate the url('...') context is
  // dropped outright rather than escaped.
  return url.replace(/[^A-Za-z0-9/_.:-]/g, "");
}

export function renderHeroSlide(slide: HeroSlide): string {
  const image = heroImageUrl(slide.imageKey);
  const style = image ? ` style="background-image: url('${escapeHtml(cssUrl(image))}');"` : "";

  return `<div class="item"${style}>
    <div class="container">
        <div class="row">
            <div class="col-lg-5">
                <div class="widget" data-aos="fade-up">
                    <h2 class="title font-family01 fs-48 fw-100 text-white">${escapeHtml(slide.title)}</h2>
                    <p class="dis text-white fw-300 font-family03 fs-16">${escapeHtml(slide.description)}</p>
                    <div class="luxury-venues-widget d-flex align-items-center">
                        <div class="luxury-img d-flex">
                            <img src="/media/legacy/437e15b54021aebc.png" width="42" height="42" loading="lazy" alt="luxury-venues" decoding="async">
                            <img src="/media/legacy/cb669b4edec4ba6c.png" width="42" height="42" loading="lazy" alt="luxury-venues" decoding="async">
                            <img src="/media/legacy/0653908ebba8610a.png" width="42" height="42" loading="lazy" alt="luxury-venues" decoding="async">
                        </div>
                        <div class="content">
                            <h5 class="font-family01 text-white fs-15 fw-500">${escapeHtml(slide.badgeTitle)}</h5>
                            <p class="m-0 fs-13 font-family01 text-white fw-300 text-uppercase">${escapeHtml(slide.badgeSubtitle)}</p>
                        </div>
                    </div>
                    <a href="${escapeHtml(safeHref(slide.ctaHref))}" class="btn white-btn font-family03 fw-600 text-uppercase">${escapeHtml(slide.ctaLabel)}</a>
                </div>
            </div>
        </div>
    </div>
</div>`;
}

export function renderHeroSlides(slides: HeroSlide[]): string {
  return slides.map(renderHeroSlide).join("\n");
}

/**
 * Published slides in display order. Returns an empty array on any failure so
 * the caller leaves the static markup untouched rather than blanking the hero.
 */
export async function loadHeroSlides(env: DatabaseEnv): Promise<HeroSlide[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.slides;

  try {
    const db = await getDb(env);
    if (!db) return [];

    const slides = await db
      .select()
      .from(heroSlides)
      .where(eq(heroSlides.published, 1))
      .orderBy(asc(heroSlides.position), asc(heroSlides.id));

    cache = { at: now, slides };
    return slides;
  } catch (error) {
    console.error("[hero] load failed", error instanceof Error ? error.message : error);
    return cache?.slides ?? [];
  }
}

export function invalidateHeroCache(): void {
  cache = null;
}
