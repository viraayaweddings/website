/**
 * The one stored form of an image reference: `/media/<key>`.
 *
 * Every renderer -- venue banners, listing cards, article covers, the hero
 * slider -- drops the stored value straight into a `src` or a `url()`, so a
 * bare R2 key stored in one of those columns resolves relative to the page and
 * the picture disappears. The seeded rows are all `/media/...`; these helpers
 * keep anything the panel writes in the same shape, and give the media store
 * the bare key it needs for reference counting.
 */

const MEDIA_PREFIX = "/media/";

/** Rejects traversal and anything that is not a plain key or media path. */
const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9/_.-]*$/;

/** The bare R2 key behind a stored value, or "" when there is not one. */
export function mediaKeyFrom(value: string): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith(MEDIA_PREFIX)) return trimmed.slice(MEDIA_PREFIX.length);
  if (trimmed.startsWith("/")) return "";
  return trimmed;
}

export type MediaPathResult = { path: string } | { error: string };

/**
 * Normalises a typed or uploaded reference to `/media/<key>`.
 *
 * An empty value is allowed and comes back as an empty path; anything that is
 * not a media reference is refused rather than stored, because the value ends
 * up in a `src` attribute on a public page.
 */
export function readMediaPathValue(value: string): MediaPathResult {
  const trimmed = String(value || "").trim();
  if (!trimmed) return { path: "" };

  if (trimmed.startsWith("/") && !trimmed.startsWith(MEDIA_PREFIX)) {
    return { error: "Use a /media/... path from the image library." };
  }

  const key = mediaKeyFrom(trimmed);
  if (!key || key.includes("..") || !SAFE_KEY.test(key)) {
    return { error: "Use a valid /media/... path from the image library." };
  }

  return { path: `${MEDIA_PREFIX}${key}` };
}

/** The stored form for a key an upload just produced. */
export function mediaPathFromKey(key: string): string {
  const trimmed = String(key || "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `${MEDIA_PREFIX}${trimmed}`;
}

/**
 * The URL a stored reference is served from, for a preview or an `img` tag.
 *
 * The same operation as `mediaPathFromKey`, under the name the display side
 * reaches for. It lives here, in a plain module, rather than beside the picker:
 * exports of a `"use client"` module become client references, so a server
 * component that called one crashed the page it was rendering.
 */
export function mediaSrc(value: string): string {
  return mediaPathFromKey(value);
}
