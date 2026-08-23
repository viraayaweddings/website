import assert from "node:assert/strict";
import test from "node:test";
import { issueLeadCsrfToken } from "../worker/lead-csrf.ts";

/**
 * The token endpoint lived only in the Cloudflare worker entry. On Vercel it
 * answered 404, so lead-forms.js got an empty token, every submission failed
 * the double-submit check, and no enquiry reached the panel. These pin the two
 * halves that have to agree.
 */
test("the issued cookie carries the same token as the body", () => {
  const { token, cookie } = issueLeadCsrfToken(true);
  assert.match(token, /^[0-9a-f-]{36}$/);
  assert.ok(cookie.startsWith(`lead_csrf=${token};`), cookie);
});

test("the cookie is scoped and short-lived", () => {
  const { cookie } = issueLeadCsrfToken(true);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Max-Age=3600/);
  assert.match(cookie, /; Secure$/);
});

test("Secure is dropped for plain http, or the cookie never arrives in dev", () => {
  assert.doesNotMatch(issueLeadCsrfToken(false).cookie, /Secure/);
});
