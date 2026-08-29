import assert from "node:assert/strict";
import test from "node:test";
import { trustedClientIp, trustedClientIpOrUnknown } from "../worker/request-ip.ts";

test("x-vercel-forwarded-for wins and uses the last hop", () => {
  const headers = new Headers({
    "x-vercel-forwarded-for": "203.0.113.1, 198.51.100.2",
    "x-forwarded-for": "spoofed, 10.0.0.1",
  });
  assert.equal(trustedClientIp(headers), "198.51.100.2");
});

test("x-forwarded-for uses the last hop, not the spoofable prefix", () => {
  const headers = new Headers({ "x-forwarded-for": "spoofed, 203.0.113.9" });
  assert.equal(trustedClientIp(headers), "203.0.113.9");
});

test("falls back to x-real-ip", () => {
  const headers = new Headers({ "x-real-ip": "203.0.113.5" });
  assert.equal(trustedClientIp(headers), "203.0.113.5");
});

test("unknown when no trusted headers are present", () => {
  assert.equal(trustedClientIp(new Headers()), null);
  assert.equal(trustedClientIpOrUnknown(new Headers()), "unknown");
});
