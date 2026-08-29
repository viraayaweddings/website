import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  firstProtectionError,
  isProtectedAccount,
  protectionError,
} from "../worker/admin/protected-account.ts";

/**
 * The owner account is protected from the other admins.
 *
 * `admin` is a flat role, so before this an additional admin could reset the
 * owner's password and sign in as them. These cover the predicate and, just as
 * importantly, that every action which can change an account actually calls it
 * -- a guard that exists but is not wired into one of five paths is the whole
 * hole left open.
 */

const owner = { id: "owner-1", email: "rohit.raj8691@gmail.com", protected: 1 };
const staff = { id: "staff-1", email: "staff@example.com", protected: 0 };

test("a protected account is recognised, an ordinary one is not", () => {
  assert.equal(isProtectedAccount(owner), true);
  assert.equal(isProtectedAccount(staff), false);
  // A row read before the column existed, or a select that omits it.
  assert.equal(isProtectedAccount({ id: "x", email: "x@y.z" }), false);
  assert.equal(isProtectedAccount({ id: "x", email: "x@y.z", protected: null }), false);
});

test("another admin cannot change the owner account", () => {
  const error = protectionError(owner, staff.id);
  assert.ok(error, "expected the change to be refused");
  assert.match(error, /protected owner account/i);
  assert.match(error, /rohit\.raj8691@gmail\.com/);
});

test("the owner can still change their own account", () => {
  assert.equal(protectionError(owner, owner.id), null);
});

test("ordinary accounts are unaffected in both directions", () => {
  assert.equal(protectionError(staff, owner.id), null);
  assert.equal(protectionError(staff, staff.id), null);
});

test("a bulk selection is refused whole if it contains the owner", () => {
  // Not skipped silently: a select-all delete that reported success while
  // sparing one row would read as the protection having failed.
  assert.ok(firstProtectionError([staff, owner], staff.id));
  assert.equal(firstProtectionError([staff, staff], staff.id), null);
  assert.equal(firstProtectionError([staff, owner], owner.id), null, "the owner may delete their own");
});

test("every action that can change an account calls the guard", () => {
  const actions = readFileSync("app/admin/users/actions.ts", "utf8");

  // The four routes that can reach an existing row. createUserAction is absent
  // on purpose: it only inserts, and the unique email index stops it being used
  // to create a second account on the owner's address.
  const guarded = {
    updateUserAction: "protectionError(",
    resetPasswordAction: "protectionError(",
    deleteUserAction: "protectionError(",
    bulkDeleteUsersAction: "firstProtectionError(",
  };

  const bodies = {};
  let current = null;
  for (const line of actions.split("\n")) {
    const match = /^export async function (\w+)/.exec(line);
    if (match) current = match[1];
    if (current) bodies[current] = (bodies[current] || "") + line + "\n";
  }

  for (const [name, call] of Object.entries(guarded)) {
    assert.ok(bodies[name], `${name} no longer exists — re-check the guard`);
    assert.ok(bodies[name].includes(call), `${name} does not call the ownership guard`);
  }
});

test("the guard runs before the account is written", () => {
  // Ordering matters: a check after the update would refuse the second attempt
  // and let the first through.
  const actions = readFileSync("app/admin/users/actions.ts", "utf8");
  for (const name of ["updateUserAction", "resetPasswordAction", "deleteUserAction"]) {
    const body = actions.slice(actions.indexOf(`export async function ${name}`));
    const end = body.indexOf("\nexport async function", 1);
    const scoped = end === -1 ? body : body.slice(0, end);
    const guardAt = scoped.indexOf("protectionError(");
    const writeAt = Math.min(
      ...[".update(users)", ".delete(users)"]
        .map((needle) => scoped.indexOf(needle))
        .filter((index) => index !== -1),
    );
    assert.ok(guardAt !== -1, `${name} has no guard`);
    assert.ok(guardAt < writeAt, `${name} guards after it writes`);
  }
});

test("the panel offers no way to clear the flag", () => {
  // An admin who could unset it could unset it and then delete the account.
  const actions = readFileSync("app/admin/users/actions.ts", "utf8");
  assert.doesNotMatch(actions, /protected:\s*(0|Number|readProtected)/,
    "an action writes the protected column");
  const page = readFileSync("app/admin/users/page.tsx", "utf8");
  assert.doesNotMatch(page, /name="protected"/, "the form posts a protected field");
});

test("the migration protects exactly one account and adds no way to undo it", () => {
  const sql = readFileSync("drizzle-pg/0011_protect_owner_account.sql", "utf8");
  assert.match(sql, /ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "protected"/);
  assert.match(sql, /lower\("email"\) = 'rohit\.raj8691@gmail\.com'/);
  assert.match(sql, /SET "protected" = 1/);
  const body = sql.replace(/^\s*--.*$/gm, "");
  assert.doesNotMatch(body, /"protected" = 0/, "the migration must not clear protection");
  assert.doesNotMatch(body, /\bDROP\b|\bDELETE\b/i);
});

test("a fresh install protects its first admin", () => {
  const setup = readFileSync("app/admin/setup/actions.ts", "utf8");
  assert.match(setup, /protected: 1/);
});
