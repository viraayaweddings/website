import assert from "node:assert/strict";
import test from "node:test";
import { sanitiseRichText } from "../worker/admin/rich-text.ts";

// These ran on Cloudflare's HTMLRewriter and threw ReferenceError on Vercel's
// Node runtime, which is what made saving any article or venue fail.

test("markup the sanitiser does not touch round-trips byte-for-byte", async () => {
  const html =
    '<div class="blog-body"><h2 id="x">Venues</h2><p>Udaipur &amp; Jaipur &mdash; <em>the</em> "classics".</p>' +
    '<img src="/storage/hotels/a.jpg" alt="A &quot;quoted&quot; caption" loading="lazy"></div>';
  assert.equal(await sanitiseRichText(html), html);
});

test("script and base elements are removed", async () => {
  assert.equal(await sanitiseRichText("<p>a</p><script>steal()</script>"), "<p>a</p>");
  assert.equal(await sanitiseRichText('<base href="https://evil.test/"><p>a</p>'), "<p>a</p>");
});

test("event handler attributes are stripped, siblings kept", async () => {
  assert.equal(
    await sanitiseRichText('<div class="k" onclick="steal()" data-x="1">a</div>'),
    '<div class="k" data-x="1">a</div>',
  );
});

test("javascript: urls are dropped, real ones kept", async () => {
  assert.equal(await sanitiseRichText('<a href="javascript:steal()">x</a>'), "<a>x</a>");
  assert.equal(
    await sanitiseRichText('<a href="/real-weddings">x</a>'),
    '<a href="/real-weddings">x</a>',
  );
});

test("entity-encoded javascript: urls are decoded before the check", async () => {
  assert.equal(await sanitiseRichText('<a href="java&#115;cript:steal()">x</a>'), "<a>x</a>");
});

test("iframe srcdoc is dropped", async () => {
  assert.equal(
    await sanitiseRichText('<iframe src="https://www.youtube.com/embed/x" srcdoc="&lt;b&gt;"></iframe>'),
    '<iframe src="https://www.youtube.com/embed/x"></iframe>',
  );
});

test("empty input is safe", async () => {
  assert.equal(await sanitiseRichText(""), "");
});
