import assert from "node:assert/strict";
import test from "node:test";
import { filtersToQuery, parseFilters } from "../worker/admin/lead-filters.ts";

/**
 * The submissions list keeps its whole view -- search, status, form, dates,
 * sort, page -- in the query string, so bulk actions and the CSV export can
 * round-trip it. A filter that survives parse but not serialise silently
 * widens the export, so both halves are pinned here.
 */

test("unknown sort columns and directions fall back to the default view", () => {
  const filters = parseFilters({ sort: "notes; drop table leads", dir: "sideways" });
  assert.equal(filters.sort, "received");
  assert.equal(filters.dir, "desc");
});

test("only statuses the panel defines are accepted", () => {
  assert.equal(parseFilters({ status: "won" }).status, "won");
  assert.equal(parseFilters({ status: "archived" }).status, "");
});

test("dates must be whole calendar days", () => {
  assert.equal(parseFilters({ from: "2026-02-01" }).from, "2026-02-01");
  assert.equal(parseFilters({ from: "yesterday" }).from, "");
  assert.equal(parseFilters({ to: "2026-2-1" }).to, "");
});

test("repeated parameters take the first value rather than joining them", () => {
  assert.equal(parseFilters({ q: ["taj", "oberoi"] }).q, "taj");
});

test("page numbers below one are treated as the first page", () => {
  assert.equal(parseFilters({ page: "0" }).page, 1);
  assert.equal(parseFilters({ page: "-3" }).page, 1);
  assert.equal(parseFilters({ page: "not-a-number" }).page, 1);
});

test("every filter survives a round-trip through the query string", () => {
  const filters = parseFilters({
    q: "taj",
    status: "qualified",
    form: "contact-form",
    from: "2026-01-01",
    to: "2026-01-31",
    page: "3",
    sort: "name",
    dir: "asc",
  });

  assert.deepEqual(parseFilters(Object.fromEntries(new URLSearchParams(filtersToQuery(filters)))), filters);
});

test("defaults are left out of the query string", () => {
  assert.equal(filtersToQuery(parseFilters({})), "");
});

test("overrides win over the current view, so paging keeps its filters", () => {
  const filters = parseFilters({ q: "taj", status: "new", page: "4" });
  const query = new URLSearchParams(filtersToQuery(filters, { page: 1 }));
  assert.equal(query.get("q"), "taj");
  assert.equal(query.get("status"), "new");
  assert.equal(query.get("page"), null);
});
