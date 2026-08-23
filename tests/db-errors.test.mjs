import assert from "node:assert/strict";
import test from "node:test";
import { DrizzleQueryError } from "drizzle-orm/errors";
import {
  adminDatabaseMessage,
  databaseErrorDetail,
  isDatabaseError,
  isUniqueViolation,
  logDatabaseError,
} from "../worker/db/errors.ts";

/**
 * What may be shown when a query fails.
 *
 * drizzle wraps every driver error so that `message` is the SQL and the bound
 * parameters and the real reason is on `cause`. The dashboard rendered that
 * message, so the panel printed the statement and its values -- dates on that
 * page, lead addresses and search terms elsewhere -- and showed none of the
 * fault. These tests pin both halves: the query never reaches a string meant
 * for the screen, and the reason always does.
 */

/** The error drizzle actually throws, not an approximation of it. */
function queryError(cause) {
  return new DrizzleQueryError(
    'select count(*), count(*) filter (where "created_at" >= $1) from "leads"',
    ["Sun Aug 16 2026 14:37:52 GMT+0000"],
    cause,
  );
}

test("the wrapper really does put the query in the message", () => {
  // If drizzle ever stops doing this the rest of these tests are theatre, so
  // the assumption is checked rather than trusted.
  const error = queryError(new Error('relation "leads" does not exist'));
  assert.match(error.message, /Failed query:/);
  assert.match(error.message, /from "leads"/);
  assert.match(error.message, /params:/);
});

test("the detail is the cause, never the query", () => {
  const detail = databaseErrorDetail(queryError(new Error('relation "leads" does not exist')));
  assert.equal(detail, 'relation "leads" does not exist');
  assert.doesNotMatch(detail, /Failed query|params:|select count/);
});

test("a Postgres error code is kept, because it is what identifies the fault", () => {
  const cause = Object.assign(new Error('column "email_sent" does not exist'), { code: "42703" });
  assert.equal(databaseErrorDetail(queryError(cause)), 'column "email_sent" does not exist (42703)');
});

test("a nested cause chain resolves to the innermost reason", () => {
  const inner = new Error("connection terminated unexpectedly");
  const middle = new Error("pool error", { cause: inner });
  assert.equal(databaseErrorDetail(queryError(middle)), "connection terminated unexpectedly");
});

test("a cause chain that loops does not hang", () => {
  // Termination is the guarantee; which of the two the walk stops on is not
  // meaningful, only that it stops and still yields a reason rather than a
  // query.
  const a = new Error("a");
  const b = new Error("b");
  a.cause = b;
  b.cause = a;
  assert.ok(["a", "b"].includes(databaseErrorDetail(a)));
});

test("a wrapper with no cause yields nothing rather than the query", () => {
  assert.equal(databaseErrorDetail(queryError(undefined)), "");
});

test("what an admin sees names the fault and not the statement", () => {
  const message = adminDatabaseMessage(queryError(new Error('relation "leads" does not exist')), true);
  assert.match(message, /relation "leads" does not exist/);
  assert.doesNotMatch(message, /Failed query|params:|select count|created_at/);
});

test("what anyone else sees names neither", () => {
  const message = adminDatabaseMessage(queryError(new Error('relation "leads" does not exist')), false);
  assert.doesNotMatch(message, /relation "leads"|Failed query|params:|select count/);
  assert.match(message, /admin\/health/);
});

test("the parameters never survive into either message", () => {
  // The screenshot that started this showed a bound parameter on screen. On
  // other pages those are lead email addresses and search terms.
  const error = new DrizzleQueryError(
    'select * from "leads" where "email" = $1',
    ["someone@example.com"],
    new Error("permission denied for table leads"),
  );
  for (const canSeeDetail of [true, false]) {
    const message = adminDatabaseMessage(error, canSeeDetail);
    assert.doesNotMatch(message, /someone@example\.com/);
    assert.doesNotMatch(message, /select \* from/);
  }
});

test("a missing configuration is told apart from a failed query", () => {
  const unavailable = Object.assign(new Error("No database is configured."), {
    name: "DatabaseUnavailableError",
  });
  assert.match(adminDatabaseMessage(unavailable, true), /POSTGRES_URL/);

  const stale = Object.assign(new Error("2 migrations pending"), { name: "SchemaOutOfDateError" });
  assert.match(adminDatabaseMessage(stale, true), /migrations/);
});

test("database failures are recognised, ordinary ones are not", () => {
  assert.equal(isDatabaseError(queryError(new Error("nope"))), true);
  assert.equal(isDatabaseError(Object.assign(new Error("x"), { name: "DatabaseUnavailableError" })), true);
  assert.equal(isDatabaseError(Object.assign(new Error("x"), { name: "SchemaOutOfDateError" })), true);
  assert.equal(isDatabaseError(new Error("Cannot read properties of undefined")), false);
  assert.equal(isDatabaseError(null), false);
});

test("a unique violation is still recognised through the wrapper", () => {
  // The admin forms turn this into "that email is already in use" rather than
  // a crash page, and the code sits on the cause, not on the wrapper.
  const cause = Object.assign(new Error("duplicate key value violates unique constraint"), {
    code: "23505",
  });
  assert.equal(isUniqueViolation(queryError(cause)), true);
  assert.equal(isUniqueViolation(queryError(new Error("something else"))), false);
});

test("logging keeps the query, because the screen no longer does", () => {
  const lines = [];
  const original = console.error;
  console.error = (...args) => lines.push(args.join(" "));
  try {
    logDatabaseError("dashboard", queryError(new Error('relation "leads" does not exist')));
  } finally {
    console.error = original;
  }
  const logged = lines.join("\n");
  assert.match(logged, /dashboard failed/);
  assert.match(logged, /relation "leads" does not exist/);
  assert.match(logged, /select count/, "the statement belongs in the log, not on screen");
});

/**
 * /admin/health is where every message above sends people, so its schema probe
 * has to be complete. It used to check only that `users` existed, which meant a
 * database missing `leads` reported healthy while the dashboard failed on every
 * load -- the exact situation this work started from.
 */
test("the health probe knows about every table the schema defines", async () => {
  const { readFileSync } = await import("node:fs");

  const schema = readFileSync("worker/db/schema.ts", "utf8");
  const defined = new Set(
    [...schema.matchAll(/pgTable\(\s*"([a-z_]+)"/g)].map((match) => match[1]),
  );

  const route = readFileSync("app/admin/health/route.ts", "utf8");
  const listed = new Set(
    [...route.matchAll(/^\s*"([a-z_]+)",$/gm)].map((match) => match[1]),
  );

  const missing = [...defined].filter((name) => !listed.has(name)).sort();
  assert.deepEqual(missing, [], "add these to EXPECTED_TABLES in app/admin/health/route.ts");

  const stale = [...listed].filter((name) => !defined.has(name)).sort();
  assert.deepEqual(stale, [], "these are no longer in the schema");
});
