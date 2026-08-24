import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql, gte, lt } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { leads, rateLimits } from "../worker/db/schema.ts";

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

/**
 * The same trap, in an assignment rather than a comparison.
 *
 * The rule above only looks for `${a} >= ${b}`, and only in app/admin/page.tsx.
 * It therefore missed this, in worker/admin/rate-limit.ts:
 *
 *   resetAt: sql`case when ${rateLimits.resetAt} <= now() then ${resetAt} ...`
 *
 * A Date assigned inside a CASE branch, not compared. Through `.values()` the
 * column's encoder runs and a string is bound; through a raw fragment there is
 * no column in sight, so the Date went to postgres.js as an object and it threw
 * ERR_INVALID_ARG_TYPE. That statement is on the *failed*-login path, so a
 * mistyped address answered with the admin error boundary rather than "those
 * details are not right" -- while a correct password signed in normally, which
 * is why it survived so long.
 *
 * Logging does not help: JSON.stringify renders the Date and the string
 * identically. Only `instanceof Date` tells them apart, so that is the check.
 */
test("the rate-limit upsert binds no Date", () => {
  const resetAt = new Date("2026-08-24T11:17:03.877Z");

  // The exact fragments worker/admin/rate-limit.ts builds.
  const count = sql`case when ${rateLimits.resetAt} <= now() then 1 else ${rateLimits.count} + 1 end`;
  const reset = sql`case when ${rateLimits.resetAt} <= now() then ${resetAt.toISOString()}::timestamptz else ${rateLimits.resetAt} end`;

  for (const [label, fragment] of [["count", count], ["resetAt", reset]]) {
    const { params } = dialect.sqlToQuery(fragment);
    const dates = params.filter((value) => value instanceof Date);
    assert.deepEqual(
      dates,
      [],
      `the ${label} fragment binds a Date object; postgres.js cannot serialise one. ` +
        "Call .toISOString() and cast, or go through the column.",
    );
  }
});

test("no raw sql fragment anywhere binds a bare Date variable", () => {
  // Widened from one file to the whole of app/ and worker/: the rule was only
  // ever applied to the dashboard, which is why rate-limit.ts slipped past.
  const roots = [
    fileURLToPath(new URL("../app/", import.meta.url)),
    fileURLToPath(new URL("../worker/", import.meta.url)),
  ];

  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".generated.ts")) files.push(full);
    }
  };
  for (const root of roots) walk(root);

  const offenders = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    // Names that hold a Date in this file, by how they were assigned.
    const dateNames = new Set(
      [...source.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:new Date\b|[\w.]*\.(?:createdAt|updatedAt|resetAt|expiresAt)\b)/g)].map(
        (m) => m[1],
      ),
    );
    if (!dateNames.size) continue;

    // Every sql`...` template in the file, and the plain ${name} inside it.
    for (const template of source.matchAll(/\bsql`([^`]*)`/g)) {
      for (const hole of template[1].matchAll(/\$\{(\w+)\}/g)) {
        if (!dateNames.has(hole[1])) continue;
        offenders.push(`${file.slice(file.lastIndexOf("viraayaweddings.com") + 20)}: \${${hole[1]}}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "a Date is interpolated into a raw sql template. Bind `.toISOString()` with an explicit " +
      "::timestamptz cast, or compare through gte()/lte() so the column's encoder runs.",
  );
});
