import assert from "node:assert/strict";
import test from "node:test";
import { MAX_RECORD_ID, parseRecordId } from "../worker/admin/record-id.ts";

test("an ordinary id is read as itself", () => {
  assert.equal(parseRecordId("1"), 1);
  assert.equal(parseRecordId("4212"), 4212);
  assert.equal(parseRecordId(String(MAX_RECORD_ID)), MAX_RECORD_ID);
});

/**
 * The case this exists for: /admin/leads/99999999999999999999 passed a digits
 * check, parsed to 1e20, reached Postgres as a bigint against an integer
 * column and raised an overflow -- so a crafted URL returned the admin crash
 * page rather than a 404.
 */
test("an id larger than the column could hold is refused, not passed on", () => {
  assert.equal(parseRecordId("99999999999999999999"), null);
  assert.equal(parseRecordId(String(MAX_RECORD_ID + 1)), null);
  assert.equal(parseRecordId("9".repeat(11)), null);
});

test("anything that is not a positive whole number is refused", () => {
  for (const value of ["0", "-1", "12abc", "1.5", "", "   ", "abc", null, undefined, {}, "1e5", "+1", " 1 2 "]) {
    assert.equal(parseRecordId(value), null, JSON.stringify(value));
  }
});

test("surrounding whitespace from a form field is tolerated", () => {
  assert.equal(parseRecordId(" 42 "), 42);
});
