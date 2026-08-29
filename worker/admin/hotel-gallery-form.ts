/**
 * Reading the venue gallery's form rows.
 *
 * Here rather than in app/admin/hotels/actions.ts because that file is a
 * `"use server"` module: every one of its exports has to be an async server
 * action, so a plain helper cannot be exported from it and therefore cannot be
 * tested on its own. The same reason form-rows.ts and media-path.ts, which this
 * builds on, already live here.
 *
 * Returns a result rather than redirecting, so the decision to fail the save
 * stays with the action that owns the request.
 */
import { readRowIndices, TooManyRowsError } from "./form-rows.ts";
import { readMediaPathValue } from "./media-path.ts";
import type { HotelGalleryImage } from "../db/schema.ts";

/** Long enough for a sentence; the caption is a label, not a paragraph. */
const MAX_CAPTION = 300;
/** Matches the other stored image columns. */
const MAX_PATH = 400;

export type GalleryRowsResult = { images: HotelGalleryImage[] } | { error: string };

/**
 * The gallery an editor has posted, in row order.
 *
 * Keyed on the picture rather than the caption, which is the opposite of the
 * highlight rows: a highlight with no title has nothing to show, but a gallery
 * image with no caption is ordinary -- the renderer falls back to the venue
 * name. Clearing the picture is therefore how a row is deleted, which is what
 * the form tells the editor.
 *
 * Every path goes through readMediaPathValue, so only `/media/<key>` references
 * from the R2-backed library can be stored; a typed-in external URL or a
 * traversal attempt is refused rather than written into a `src` on a public
 * page.
 */
export function readGalleryRows(formData: FormData): GalleryRowsResult {
  let indices: string[];
  try {
    indices = readRowIndices(formData, "gallery_image_", "gallery images");
  } catch (error) {
    return {
      error: error instanceof TooManyRowsError ? error.message : "Too many gallery images.",
    };
  }

  const images: HotelGalleryImage[] = [];

  for (const index of indices) {
    const raw = String(formData.get(`gallery_image_${index}`) || "");
    const result = readMediaPathValue(raw);
    if ("error" in result) return { error: result.error };
    // An empty row is a deleted one, not a failure: the form ships spare rows,
    // and clearing a picture is how an image is removed.
    if (!result.path) continue;

    const caption = String(formData.get(`gallery_caption_${index}`) || "").trim();
    images.push({
      image: result.path.slice(0, MAX_PATH),
      caption: caption.slice(0, MAX_CAPTION),
    });
  }

  return { images };
}
