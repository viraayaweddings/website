import assert from "node:assert/strict";
import test from "node:test";
import { renderCityHeading } from "../worker/site/city-heading.ts";

/**
 * A city index page's heading is stored in two halves because the markup styles
 * it as a plain word followed by an emphasised span. It is written into the
 * page as HTML, so what it does with an apostrophe or an angle bracket in a
 * city name matters.
 */

test("both halves render as the markup shapes them", () => {
  assert.equal(
    renderCityHeading({ heading: "Luxury", headingEmphasis: "Hotels" }),
    'Luxury <span class="fw-600 text-primary">Hotels</span>',
  );
});

test("a plain heading renders as text alone", () => {
  assert.equal(renderCityHeading({ heading: "Wedding Venues", headingEmphasis: "" }), "Wedding Venues");
});

test("an emphasis-only heading does not leave a leading space", () => {
  assert.equal(
    renderCityHeading({ heading: "", headingEmphasis: "Hotels" }),
    '<span class="fw-600 text-primary">Hotels</span>',
  );
});

test("nothing stored renders nothing, so the shipped wording is left alone", () => {
  assert.equal(renderCityHeading({ heading: "", headingEmphasis: "" }), "");
});

test("markup in a stored heading is escaped rather than rendered", () => {
  const html = renderCityHeading({
    heading: '<img src=x onerror="alert(1)">',
    headingEmphasis: "Tom & Jerry's",
  });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
  assert.match(html, /Tom &amp; Jerry&#39;s/);
});
