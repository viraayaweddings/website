import assert from "node:assert/strict";
import test from "node:test";
import { mediaKeyFrom, mediaPathFromKey, readMediaPathValue } from "../worker/admin/media-path.ts";

/**
 * Venue banners, listing thumbnails, article covers and hero backgrounds are
 * dropped verbatim into `src` attributes and `url()` values. A bare R2 key in
 * one of those columns resolves relative to the page, so the picture silently
 * disappears — which is what saving any venue through the panel used to do.
 * These pin the one stored shape, and the conversion back for reference
 * counting.
 */

test("a media path is stored unchanged", () => {
  assert.deepEqual(readMediaPathValue("/media/legacy/abc123.jpg"), { path: "/media/legacy/abc123.jpg" });
});

test("a bare key is normalised to a media path", () => {
  assert.deepEqual(readMediaPathValue("legacy/abc123.jpg"), { path: "/media/legacy/abc123.jpg" });
});

test("surrounding whitespace is trimmed", () => {
  assert.deepEqual(readMediaPathValue("  /media/a.png  "), { path: "/media/a.png" });
});

test("an empty value is allowed and clears the field", () => {
  assert.deepEqual(readMediaPathValue(""), { path: "" });
  assert.deepEqual(readMediaPathValue("   "), { path: "" });
});

test("a site path that is not media is refused", () => {
  const result = readMediaPathValue("/assets/images/hero.jpg");
  assert.ok("error" in result, "expected a non-media site path to be refused");
});

test("traversal is refused", () => {
  assert.ok("error" in readMediaPathValue("/media/../../etc/passwd"));
  assert.ok("error" in readMediaPathValue("../secrets.png"));
});

test("an absolute URL to another host is refused", () => {
  assert.ok("error" in readMediaPathValue("https://evil.example/x.jpg"));
});

test("a key that could break out of an attribute is refused", () => {
  assert.ok("error" in readMediaPathValue('a.jpg" onerror="alert(1)'));
  assert.ok("error" in readMediaPathValue("a b.jpg"));
});

test("mediaKeyFrom strips the prefix for reference counting", () => {
  assert.equal(mediaKeyFrom("/media/legacy/abc.jpg"), "legacy/abc.jpg");
  assert.equal(mediaKeyFrom("legacy/abc.jpg"), "legacy/abc.jpg");
  assert.equal(mediaKeyFrom(""), "");
});

test("mediaKeyFrom refuses to treat a non-media path as a key", () => {
  // Releasing "assets/images/hero.jpg" would try to delete an object that
  // never came from an upload.
  assert.equal(mediaKeyFrom("/assets/images/hero.jpg"), "");
});

test("an uploaded key becomes the stored path", () => {
  assert.equal(mediaPathFromKey("abc123.jpg"), "/media/abc123.jpg");
  assert.equal(mediaPathFromKey("/media/abc123.jpg"), "/media/abc123.jpg");
  assert.equal(mediaPathFromKey(""), "");
});

test("storing and reading back is stable", () => {
  const stored = mediaPathFromKey("legacy/abc.jpg");
  assert.deepEqual(readMediaPathValue(stored), { path: stored });
  assert.equal(mediaPathFromKey(mediaKeyFrom(stored)), stored);
});
