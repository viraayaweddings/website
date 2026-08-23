import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { sql, gte, lt } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { leads } from "../worker/db/schema.ts";

/**
 * A Date must never be bound as a Date.
 *
 * drizzle only knows how to encode a value when it can see which column it
 * belongs to. Through an operator -- `gte(leads.createdAt, when)` -- it applies
 * the column's `mapToDriverValue` and binds an ISO string. Interpolated
 * straight into a raw fragment -- `${leads.createdAt} >= ${when}` -- it binds
 * the Date object itself, postgres.js is handed something it cannot serialise,
 * and the query dies with:
 *
 *   The "string" argument must be of type string or an instance of Buffer or
 *   ArrayBuffer. Received an instance of Date (ERR_INVALID_ARG_TYPE)
 *
 * which is what took the admin dashboard down. It reads as a database fault and
 * is not one, and nothing about the two spellings looks different.
 */
const dialect = new PgDialect();
const when = new Date("2026-08-16T14:37:52Z");

test("the operator form binds a string", () => {
  const { params } = dialect.sqlToQuery(sql`count(*) filter (where ${gte(leads.createdAt, when)})`);
  assert.deepEqual(params, ["2026-08-16T14:37:52.000Z"]);
});

test("raw interpolation binds a Date, which is the trap", () => {
  // Pinned so the difference stays visible: if drizzle ever starts encoding
  // these too, this test fails and the rule below can be relaxed.
  const { params } = dialect.sqlToQuery(sql`count(*) filter (where ${leads.createdAt} >= ${when})`);
  assert.ok(params[0] instanceof Date, "drizzle still passes an unmapped Date straight through");
});

test("the dashboard's lead counts bind no Date", () => {
  // The exact shape app/admin/page.tsx builds.
  const query = sql`
    select count(*),
           count(*) filter (where ${gte(leads.createdAt, when)}),
           count(*) filter (where ${leads.emailSent} = 0)
    from ${leads}
  `;
  const { params } = dialect.sqlToQuery(query);
  assert.equal(
    params.some((param) => param instanceof Date),
    false,
  );
});

test("other date comparisons bind strings too", () => {
  for (const chunk of [gte(leads.createdAt, when), lt(leads.createdAt, when)]) {
    const { params } = dialect.sqlToQuery(sql`where ${chunk}`);
    assert.equal(typeof params[0], "string");
  }
});

/**
 * The source rule, so a new FILTER clause cannot reintroduce it.
 *
 * A date compared inside a raw fragment is the only spelling that fails, and it
 * fails at runtime against a real database -- which is exactly where it is most
 * expensive to find.
 */
test("no admin query compares a date inside a raw sql fragment", () => {
  // Comments are stripped first: the fix for this bug documents the broken
  // spelling right above the corrected line, and the scan would match that.
  const source = readFileSync("app/admin/page.tsx", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  // `${something} >= ${somethingElse}` inside a sql template, where the right
  // side is a plain variable rather than a column or an operator call.
  const offenders = [
    ...source.matchAll(/\$\{[^}]*\}\s*(?:>=|<=|>|<)\s*\$\{(\w+)\}/g),
  ].map((match) => match[0]);

  assert.deepEqual(
    offenders,
    [],
    "compare through gte()/lte() so the column's encoder runs, rather than interpolating the value",
  );
});
