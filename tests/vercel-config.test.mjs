import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

/**
 * Limits vercel.json has to respect.
 *
 * These are validated by Vercel *after* the push, so breaking one costs a
 * failed deployment to find out. `buildCommand` grew past 256 characters when
 * two more database steps were chained onto it -- the deployment failed schema
 * validation before running anything, which is a cheap failure but an avoidable
 * round trip.
 */
const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

/** Vercel's documented cap on the field. */
const BUILD_COMMAND_LIMIT = 256;

test("buildCommand is within Vercel's length limit", () => {
  const command = vercel.buildCommand ?? "";
  assert.ok(
    command.length <= BUILD_COMMAND_LIMIT,
    `buildCommand is ${command.length} characters, over the ${BUILD_COMMAND_LIMIT} limit. ` +
      "Put the steps in an npm script and call that instead.",
  );
});

test("every npm script buildCommand calls actually exists", () => {
  // A typo here is the same failed deployment, one step later.
  const referenced = [...(vercel.buildCommand ?? "").matchAll(/npm run ([\w:-]+)/g)].map((m) => m[1]);
  assert.ok(referenced.length > 0, "expected buildCommand to run an npm script");

  for (const name of referenced) {
    assert.ok(pkg.scripts[name], `vercel.json runs "npm run ${name}", which package.json does not define`);
  }
});

test("the deploy chain resolves all the way down", () => {
  // vercel-build fans out through several scripts; each hop is another chance
  // to reference something that is not there.
  const seen = new Set();
  const visit = (name) => {
    if (seen.has(name)) return;
    seen.add(name);
    const body = pkg.scripts[name];
    assert.ok(body, `package.json has no "${name}" script`);
    for (const [, next] of body.matchAll(/npm run ([\w:-]+)/g)) visit(next);
  };
  visit("vercel-build");

  for (const name of ["db:deploy", "pages:deploy", "templates:deploy", "stored:deploy"]) {
    assert.ok(seen.has(name), `${name} is no longer reached by the deploy chain`);
  }
});

test("the deploy chain tolerates a build with no database", () => {
  // Every database step carries --if-configured so a build without
  // DATABASE_URL exits 0 rather than failing the deployment.
  for (const name of ["pages:deploy", "templates:deploy", "stored:deploy"]) {
    assert.match(pkg.scripts[name], /--if-configured/, `${name} must not fail a database-less build`);
  }
  assert.match(pkg.scripts["db:deploy"], /--if-configured/);
});
