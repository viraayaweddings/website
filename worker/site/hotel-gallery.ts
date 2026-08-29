/**
 * A venue's Event Spaces Gallery.
 *
 * Apart from hotel.ts for the reason escape.ts is apart from the injectors: it
 * needs no database access, so keeping it here lets the renderers be loaded and
 * tested without pulling in the client, which reaches for a connection the
 * moment it is imported.
 *
 * The gallery used to be computed on every request from the banner image
 * followed by the highlight images, with the highlight titles as captions. It
 * is stored now -- see drizzle-pg/0010_hotel_gallery.sql -- and that derivation
 * survives only as the fallback in galleryFor.
 */
import { escapeHtml } from "./escape.ts";
import type { HotelGalleryImage, HotelHighlight } from "../db/schema.ts";

/**
 * The stored Event Spaces Gallery.
 *
 * Tolerant in the same way parseHighlights is: anything that will not parse,
 * or is not an array, reads as "nothing stored", which sends the caller to the
 * derived fallback rather than rendering an empty gallery. A caption is
 * optional -- an image with none still belongs in the gallery -- so only the
 * image is required.
 */
export function parseGallery(value: string): HotelGalleryImage[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => Boolean(item) && typeof item === "object")
      .map((item) => ({ image: String(item.image ?? ""), caption: String(item.caption ?? "") }))
      .filter((item) => item.image);
  } catch {
    return [];
  }
}

/**
 * The pictures to show, stored ones first.
 *
 * Falls back to what the gallery was before it became editable -- the banner
 * followed by the highlight images -- whenever nothing is stored. That covers
 * a venue created before the backfill ran, one whose gallery an editor has
 * emptied entirely, and the window during a deploy where the column exists but
 * the row has not been filled. The rule is that a venue page never renders an
 * empty gallery while it still has a banner or a highlight to show.
 */
export function galleryFor(
  // Structural rather than `Hotel`, so the admin's image-reference scan can ask
  // the same question from its narrower select and get the same answer. Two
  // implementations of "what is in this gallery" is how the media library ends
  // up offering to delete a picture that is live on a page.
  hotel: { gallery?: string; bannerImage: string; name: string },
  highlights: HotelHighlight[],
): HotelGalleryImage[] {
  const stored = parseGallery(hotel.gallery ?? "[]");
  if (stored.length) return stored;

  const derived: HotelGalleryImage[] = [];
  if (hotel.bannerImage) {
    derived.push({ image: hotel.bannerImage, caption: `${hotel.name} header image` });
  }
  for (const highlight of highlights) {
    derived.push({ image: highlight.image, caption: highlight.title });
  }
  return derived;
}

/**
 * The main slider.
 *
 * Takes the resolved image list rather than the venue, so this and the
 * thumbnail strip below cannot disagree about what is in the gallery -- slick
 * pairs them by index, and a main slider with more figures than thumbnails
 * scrolls onto blanks.
 *
 * The venue name is passed separately because it labels every figure in the
 * overlay, which is the venue's name and not the picture's caption.
 */
export function renderGallery(images: HotelGalleryImage[], venueName: string): string {
  const name = escapeHtml(venueName);

  return images
    .map(({ image, caption }) => {
      const src = escapeHtml(image);
      // A picture with no caption still needs an accessible name and a lightbox
      // label; the venue name is the only thing true of every image.
      const label = escapeHtml(caption || venueName);
      return `<figure class="position-relative" data-aos="fade-up">
    <img class="img-fluid w-100" alt="${label}" src="${src}" style="opacity: 1;" decoding="async" loading="lazy" >
    <div class="content-widget w-100 px-4 py-3 d-flex justify-content-between align-items-center position-absolute b-0">
        <h4>${name}</h4>
        <a href="${src}" data-fancybox="gallery" data-caption="${label}"><i class="fa-jelly fa-regular fa-magnifying-glass-plus" aria-hidden="true"></i></a>
    </div>
</figure>`;
    })
    .join("\n");
}

/** The thumbnail strip beneath the gallery, in the same order and count. */
export function renderGalleryThumbnails(images: HotelGalleryImage[], venueName: string): string {
  return images
    .map(({ image, caption }) => {
      const label = escapeHtml(`${caption || venueName} thumbnail`);
      return `<figure>
    <img src="${escapeHtml(image)}" class="img-fluid" alt="${label}" decoding="async" loading="lazy">
</figure>`;
    })
    .join("\n");
}
