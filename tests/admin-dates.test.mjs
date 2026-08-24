import assert from "node:assert/strict";
import test from "node:test";

import {
  formatDate,
  formatDateTime,
  formatRelative,
  formatStoredTimestamp,
} from "../app/admin/_lib/dates.ts";

/**
 * The panel shows one date format everywhere: `DD-MM-YYYY`, 24-hour `HH:MM`, IST.
 *
 * Locked down here because the failure mode is silent. A timestamp rendered in
 * UTC, or with a 12-hour clock and no meridiem, is still a plausible-looking
 * date -- nothing throws, no test goes red, and the reader has no way to tell
 * from the screen that the number is five and a half hours out.
 */

/** 2026-08-24 21:35:09 IST. */
const EVENING = new Date("2026-08-24T16:05:09.000Z");

test("a date and time reads DD-MM-YYYY, HH:MM in IST", () => {
  assert.equal(formatDateTime(EVENING), "24-08-2026, 21:35");
});

test("the date alone keeps the same order and separator", () => {
  assert.equal(formatDate(EVENING), "24-08-2026");
});

test("the clock is 24-hour, so morning and evening cannot be confused", () => {
  const morning = new Date("2026-08-24T02:35:00.000Z"); // 08:05 IST
  const evening = new Date("2026-08-24T14:35:00.000Z"); // 20:05 IST
  assert.equal(formatDateTime(morning), "24-08-2026, 08:05");
  assert.equal(formatDateTime(evening), "24-08-2026, 20:05");
});

test("1 pm is 13:00, not 01:00", () => {
  assert.equal(formatDateTime(new Date("2026-08-24T07:30:00.000Z")), "24-08-2026, 13:00");
});

test("day and month are zero-padded, so the columns line up", () => {
  // 09-08, not 9-8: an unpadded list is unreadable and sorts wrongly by eye.
  assert.equal(formatDateTime(new Date("2026-08-09T01:34:00.000Z")), "09-08-2026, 07:04");
});

test("midnight IST is 00:00 on the next day, never 24:00", () => {
  // hourCycle "h24" renders this instant as 24:00 on some ICU builds, which
  // would print a date and a time that disagree about which day it is.
  assert.equal(formatDateTime(new Date("2026-08-24T18:30:00.000Z")), "25-08-2026, 00:00");
});

test("the IST offset moves the date across a year boundary", () => {
  // 2025-12-31T18:35Z is already 2026 in India.
  assert.equal(formatDateTime(new Date("2025-12-31T18:35:00.000Z")), "01-01-2026, 00:05");
});

test("a timestamp is read in IST, not UTC", () => {
  const utc = EVENING.toISOString().slice(11, 16);
  assert.equal(utc, "16:05");
  assert.notEqual(formatDateTime(EVENING).slice(-5), utc);
});

test("epoch milliseconds are accepted as well as a Date", () => {
  assert.equal(formatDateTime(EVENING.getTime()), formatDateTime(EVENING));
  assert.equal(formatDate(EVENING.getTime()), formatDate(EVENING));
});

test("nothing to show renders as an em dash rather than Invalid Date", () => {
  for (const value of [null, new Date("not a date"), Number.NaN]) {
    assert.equal(formatDateTime(value), "—");
    assert.equal(formatDate(value), "—");
    assert.equal(formatRelative(value, EVENING.getTime()), "—");
  }
});

test("recent times stay relative, and older ones fall back to the date", () => {
  const now = EVENING.getTime();
  const ago = (seconds) => formatRelative(new Date(now - seconds * 1000), now);

  assert.equal(ago(10), "just now");
  assert.equal(ago(600), "10 min ago");
  assert.equal(ago(3 * 3600), "3 hours ago");
  assert.equal(ago(24 * 3600), "yesterday");
  assert.equal(ago(3 * 24 * 3600), "3 days ago");
  // Past a week it becomes a date, which must use the same format as everywhere.
  assert.equal(ago(30 * 24 * 3600), "25-07-2026");
});

test("a stored ISO instant is shown in the panel's format", () => {
  // worker/lead-email.ts writes metadata["Submitted At"] as an ISO string.
  assert.equal(formatStoredTimestamp("2026-08-24T16:05:09.123Z"), "24-08-2026, 21:35");
  assert.equal(formatStoredTimestamp("2026-08-24T16:05:09Z"), "24-08-2026, 21:35");
  assert.equal(formatStoredTimestamp("2026-08-24T21:35:09+05:30"), "24-08-2026, 21:35");
});

test("free-form metadata that merely looks date-ish is left alone", () => {
  // The same card renders page URLs, referrers and reference numbers. Rewriting
  // one of those as a date would corrupt the record being displayed.
  for (const value of [
    "https://viraayaweddings.com/blogs/2026-08-24-real-wedding",
    "2026-08-24",
    "REF-2026-08-24T10",
    "Mozilla/5.0 (Windows NT 10.0)",
    "",
  ]) {
    assert.equal(formatStoredTimestamp(value), value);
  }
});
