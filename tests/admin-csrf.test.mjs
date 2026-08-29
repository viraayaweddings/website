import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_CSRF_FIELD,
  adminCsrfTokensMatch,
  issueAdminCsrfToken,
  readAdminCsrfCookie,
} from "../worker/admin/csrf-tokens.ts";

test("admin CSRF constants are stable", () => {
  assert.equal(ADMIN_CSRF_COOKIE, "vw_admin_csrf");
  assert.equal(ADMIN_CSRF_FIELD, "_csrf");
});

test("readAdminCsrfCookie parses the cookie header", () => {
  const request = new Request("https://viraayaweddings.com/admin", {
    headers: {
      cookie: "other=1; vw_admin_csrf=abc-123; session=xyz",
    },
  });
  assert.equal(readAdminCsrfCookie(request), "abc-123");
});

test("issueAdminCsrfToken sets an HttpOnly admin-scoped cookie", () => {
  const { token, cookie } = issueAdminCsrfToken(true);
  assert.match(token, /^[0-9a-f-]{36}$/);
  assert.match(cookie, /Path=\/admin/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /; Secure$/);
});
