import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_CSRF_FIELD,
  adminCsrfTokensMatch,
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

test("adminCsrfTokensMatch uses constant-time comparison", () => {
  assert.equal(adminCsrfTokensMatch("same-token", "same-token"), true);
  assert.equal(adminCsrfTokensMatch("wrong", "same-token"), false);
  assert.equal(adminCsrfTokensMatch("", "same-token"), false);
});
