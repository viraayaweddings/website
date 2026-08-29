import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

// From hotel-gallery.ts rather than hotel.ts: the latter imports the database
// client, which a file-only test cannot and should not load.
import {
  galleryFor,
  parseGallery,
  renderGallery,
  renderGalleryThumbnails,
} from "../worker/site/hotel-gallery.ts";
import { readGalleryRows } from "../worker/admin/hotel-gallery-form.ts";
import { MAX_FORM_ROWS } from "../worker/admin/form-rows.ts";

/**
 * The Event Spaces Gallery became stored data rather than something derived
 * from the banner and the highlights.
 *
 * Two failures matter more than the rest. A gallery that renders empty takes
 * the most visual part of a venue page with it, so the derived list stays as a
 * fallback and is tested here. And the main slider and the thumbnail strip are
 * paired by index by slick, so a difference of one between them scrolls onto
 * blanks -- they are built from a single resolved list, and that is asserted.
 */

const venue = {
  name: "Andaz New delhi",
  bannerImage: "/media/banner.jpg",
  gallery: JSON.stringify([
    { image: "/media/a.jpg", caption: "Courtyard" },
    { image: "/media/b.jpg", caption: "Ballroom" },
  ]),
};

const highlights = [
  { image: "/media/h1.jpg", title: "Grand baraat entry" },
  { image: "/media/h2.jpg", title: "3+ restaurants" },
];

test("parseGallery reads stored images in order", () => {
  const parsed = parseGallery(venue.gallery);
  assert.deepEqual(parsed, [
    { image: "/media/a.jpg", caption: "Courtyard" },
    { image: "/media/b.jpg", caption: "Ballroom" },
  ]);
});

test("parseGallery survives anything an editor or a bad write can leave behind", () => {
  assert.deepEqual(parseGallery(""), []);
  assert.deepEqual(parseGallery("[]"), []);
  assert.deepEqual(parseGallery("{not json"), []);
  assert.deepEqual(parseGallery('{"image":"/media/x.jpg"}'), [], "an object is not a gallery");
  assert.deepEqual(parseGallery("[null, 3, \"x\"]"), []);
  // An image with no caption is ordinary; one with no image is not a picture.
  assert.deepEqual(parseGallery('[{"image":"/media/x.jpg"}]'), [{ image: "/media/x.jpg", caption: "" }]);
  assert.deepEqual(parseGallery('[{"caption":"no image"}]'), []);
});

test("a stored gallery wins over the derived one", () => {
  const images = galleryFor(venue, highlights);
  assert.deepEqual(images.map((i) => i.image), ["/media/a.jpg", "/media/b.jpg"]);
});

test("an empty gallery falls back to banner then highlights", () => {
  // This is what every venue rendered before the column existed, and what one
  // created before the backfill ran still needs.
  const images = galleryFor({ ...venue, gallery: "[]" }, highlights);
  assert.deepEqual(images, [
    { image: "/media/banner.jpg", caption: "Andaz New delhi header image" },
    { image: "/media/h1.jpg", caption: "Grand baraat entry" },
    { image: "/media/h2.jpg", caption: "3+ restaurants" },
  ]);
});

test("the fallback also covers a row written before the column existed", () => {
  const images = galleryFor({ name: "X", bannerImage: "/media/b.jpg" }, []);
  assert.deepEqual(images, [{ image: "/media/b.jpg", caption: "X header image" }]);
});

test("a venue with nothing to show renders nothing rather than a broken figure", () => {
  const images = galleryFor({ name: "X", bannerImage: "", gallery: "[]" }, []);
  assert.deepEqual(images, []);
  assert.equal(renderGallery(images, "X"), "");
  assert.equal(renderGalleryThumbnails(images, "X"), "");
});

test("the main slider and the thumbnail strip always pair up", () => {
  for (const images of [
    galleryFor(venue, highlights),
    galleryFor({ ...venue, gallery: "[]" }, highlights),
    galleryFor({ ...venue, gallery: "[]", bannerImage: "" }, []),
  ]) {
    const main = (renderGallery(images, venue.name).match(/<figure/g) || []).length;
    const thumbs = (renderGalleryThumbnails(images, venue.name).match(/<figure/g) || []).length;
    assert.equal(main, images.length);
    assert.equal(thumbs, images.length, "slick pairs these by index");
  }
});

test("a caption-less picture still gets an accessible name", () => {
  const html = renderGallery([{ image: "/media/x.jpg", caption: "" }], "Andaz New delhi");
  assert.match(html, /alt="Andaz New delhi"/);
  assert.match(html, /data-caption="Andaz New delhi"/);
  assert.match(renderGalleryThumbnails([{ image: "/media/x.jpg", caption: "" }], "Andaz New delhi"),
    /alt="Andaz New delhi thumbnail"/);
});

test("captions and paths are escaped", () => {
  const html = renderGallery(
    [{ image: '/media/x.jpg"onerror="alert(1)', caption: '<script>alert(1)</script>' }],
    'Venue "quoted"',
  );
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /onerror="alert/);
});

test("the gallery is registered with the image-reference system", () => {
  // Without this the media library offers to delete a picture that is live in a
  // gallery, and the replace-image flow silently skips galleries.
  const refs = readFileSync("worker/admin/image-references.ts", "utf8");
  assert.match(refs, /gallery: hotels\.gallery/, "gallery is not selected for the usage scan");
  assert.match(refs, /galleryFor\(/, "usage is not computed through galleryFor");
  assert.match(refs, /gallery: replaceImageReferencesInText\(venue\.gallery/,
    "replaceImageReferences does not repoint gallery entries");

  const cleanup = readFileSync("scripts/cleanup-watermarked-media.mjs", "utf8");
  assert.match(cleanup, /highlights, gallery, description/, "cleanup does not read the gallery");
  assert.match(cleanup, /\["gallery", hotel\.gallery\]/, "cleanup does not scan the gallery");
});

test("the admin form and the save path agree on the field names", () => {
  // The form and the reader are separate files, so the names they agree on are
  // a contract nothing else enforces.
  const form = readFileSync("app/admin/hotels/[id]/page.tsx", "utf8");
  const reader = readFileSync("worker/admin/hotel-gallery-form.ts", "utf8");
  for (const field of ["gallery_image_", "gallery_caption_"]) {
    assert.ok(form.includes(field), `${field} missing from the form`);
    assert.ok(reader.includes(field), `${field} missing from the reader`);
  }
  // Rows are keyed on the image: clearing it is how a row is removed.
  assert.match(reader, /readRowIndices\(formData, "gallery_image_"/);

  const actions = readFileSync("app/admin/hotels/actions.ts", "utf8");
  assert.equal((actions.match(/gallery: JSON\.stringify\(readGallery/g) || []).length, 2,
    "both the create and update paths must save the gallery");
});

test("the migration adds the column and backfills without clobbering edits", () => {
  const sql = readFileSync("drizzle-pg/0010_hotel_gallery.sql", "utf8");
  assert.match(sql, /ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "gallery"/);
  // Guarded, so a re-run cannot overwrite a gallery an editor has curated.
  assert.match(sql, /WHERE "gallery" = '\[\]'/);
  const body = sql.replace(/^\s*--.*$/gm, "");
  assert.doesNotMatch(body, /\bDROP\b/i);
});

/* ------------------------------------------------------------------ *
 * The admin round trip: what the form posts -> what is stored ->
 * what the page renders. Uses the same reader the server action calls.
 * ------------------------------------------------------------------ */

/** Builds the FormData the venue form actually posts for a set of rows. */
function post(rows) {
  const formData = new FormData();
  rows.forEach(([image, caption], index) => {
    formData.set(`gallery_image_${index}`, image);
    formData.set(`gallery_caption_${index}`, caption);
  });
  return formData;
}

/** One save: form rows in, stored column value out. */
function save(rows) {
  const result = readGalleryRows(post(rows));
  assert.ok(!("error" in result), `unexpected error: ${result.error}`);
  return JSON.stringify(result.images);
}

test("adding an image: a blank spare row becomes a gallery entry", () => {
  // The form always ships SPARE_ROWS empty rows, which is how every venue --
  // including one with no gallery at all -- can have images added.
  const stored = save([
    ["/media/a.jpg", "Courtyard"],
    ["", ""],
    ["", ""],
  ]);
  assert.deepEqual(JSON.parse(stored), [{ image: "/media/a.jpg", caption: "Courtyard" }]);

  const after = save([
    ["/media/a.jpg", "Courtyard"],
    ["/media/b.jpg", "Ballroom"],
    ["", ""],
  ]);
  assert.deepEqual(JSON.parse(after), [
    { image: "/media/a.jpg", caption: "Courtyard" },
    { image: "/media/b.jpg", caption: "Ballroom" },
  ]);
});

test("replacing an image: the row keeps its place", () => {
  const stored = save([
    ["/media/a.jpg", "Courtyard"],
    ["/media/REPLACED.jpg", "Ballroom"],
    ["/media/c.jpg", "Suite"],
  ]);
  assert.deepEqual(JSON.parse(stored).map((g) => g.image), [
    "/media/a.jpg",
    "/media/REPLACED.jpg",
    "/media/c.jpg",
  ]);
});

test("deleting an image: clearing the picture drops the row", () => {
  const stored = save([
    ["/media/a.jpg", "Courtyard"],
    ["", "Ballroom"],
    ["/media/c.jpg", "Suite"],
  ]);
  assert.deepEqual(JSON.parse(stored), [
    { image: "/media/a.jpg", caption: "Courtyard" },
    { image: "/media/c.jpg", caption: "Suite" },
  ]);
});

test("emptying every row stores an empty gallery, and the page falls back", () => {
  const stored = save([["", ""], ["", ""]]);
  assert.equal(stored, "[]");
  // Which is exactly the state galleryFor covers, so the page is never blank.
  const images = galleryFor({ name: "X", bannerImage: "/media/banner.jpg", gallery: stored }, []);
  assert.deepEqual(images, [{ image: "/media/banner.jpg", caption: "X header image" }]);
});

test("reordering rows reorders the gallery", () => {
  const stored = save([
    ["/media/c.jpg", "Suite"],
    ["/media/a.jpg", "Courtyard"],
  ]);
  assert.deepEqual(JSON.parse(stored).map((g) => g.image), ["/media/c.jpg", "/media/a.jpg"]);
});

test("a saved gallery renders exactly what was saved", () => {
  const stored = save([
    ["/media/a.jpg", "Courtyard"],
    ["/media/b.jpg", ""],
  ]);
  const images = galleryFor({ name: "Andaz", bannerImage: "/media/banner.jpg", gallery: stored }, []);
  assert.deepEqual(images, [
    { image: "/media/a.jpg", caption: "Courtyard" },
    { image: "/media/b.jpg", caption: "" },
  ]);
  const html = renderGallery(images, "Andaz");
  assert.equal((html.match(/<figure/g) || []).length, 2);
  assert.match(html, /src="\/media\/a\.jpg"/);
  assert.match(html, /src="\/media\/b\.jpg"/);
  assert.equal((renderGalleryThumbnails(images, "Andaz").match(/<figure/g) || []).length, 2);
});

test("only R2 library paths can be stored", () => {
  // The value lands in a src on a public page, so anything that is not a
  // /media/<key> reference is refused rather than written.
  for (const bad of [
    "https://evil.example.com/x.jpg",
    "/user/assets/images/x.jpg",
    "/media/../../etc/passwd",
    "../../secret.jpg",
  ]) {
    const result = readGalleryRows(post([[bad, "caption"]]));
    assert.ok("error" in result, `${bad} should have been refused`);
  }
  // A bare key is accepted and normalised to the stored form.
  const ok = readGalleryRows(post([["abc123.jpg", "c"]]));
  assert.deepEqual(ok.images, [{ image: "/media/abc123.jpg", caption: "c" }]);
});

test("the row cap is enforced rather than silently truncating", () => {
  const rows = Array.from({ length: MAX_FORM_ROWS + 5 }, (_, i) => [`/media/${i}.jpg`, `c${i}`]);
  const result = readGalleryRows(post(rows));
  assert.ok("error" in result, "expected the cap to refuse the save");
  assert.match(result.error, /gallery images/);
});

test("captions and paths are length-capped", () => {
  const result = readGalleryRows(post([["/media/a.jpg", "x".repeat(500)]]));
  assert.equal(result.images[0].caption.length, 300);
});
