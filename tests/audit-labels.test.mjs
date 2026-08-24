import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { auditActionTone, humanAuditAction } from "../app/admin/_lib/audit-labels.ts";

/**
 * The activity log is the only record of who changed what, and it is read by
 * people rather than machines. An action with no label still renders -- the
 * fallback takes the verb after the dot -- so the failure is silent: the row
 * appears, worded as a bare verb with no object. "Deleted" beside "Article
 * created" reads as though something unnamed had gone.
 *
 * So the map is checked against the calls rather than trusted.
 */

const ROOT = resolve(import.meta.dirname, "..");

async function sourceFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await sourceFiles(path)));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) found.push(path);
  }
  return found;
}

/** Every action string any `recordAudit` call writes. */
async function recordedActions() {
  const actions = new Set();
  for (const file of await sourceFiles(join(ROOT, "app"))) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/recordAudit\s*\([^;]*?,\s*["']([a-z_]+\.[a-z_]+)["']/gs)) {
      actions.add(match[1]);
    }
  }
  return [...actions].sort();
}

/** The keys of the LABELS map, read from source — it is deliberately not exported. */
async function labelledActions() {
  const source = await readFile(join(ROOT, "app/admin/_lib/audit-labels.ts"), "utf8");
  const map = source.slice(source.indexOf("const LABELS"), source.indexOf("export function"));
  return new Set([...map.matchAll(/["']([a-z_]+\.[a-z_]+)["']\s*:/g)].map((m) => m[1]));
}

test("every audited action has a plain-language label", async () => {
  const recorded = await recordedActions();
  const labelled = await labelledActions();

  assert.ok(recorded.length > 50, `expected to find the audit calls, found ${recorded.length}`);

  const unlabelled = recorded.filter((action) => !labelled.has(action));
  assert.deepEqual(
    unlabelled,
    [],
    `these actions would fall back to a bare verb in the activity log: ${unlabelled.join(", ")}`,
  );
});

test("no label is defined for an action nothing records", async () => {
  // A stale label is harmless but misleading: it implies the panel can produce
  // an event it no longer does.
  const recorded = new Set(await recordedActions());
  const labelled = await labelledActions();

  const orphaned = [...labelled].filter((action) => !recorded.has(action)).sort();
  assert.deepEqual(orphaned, [], `labels with no matching recordAudit call: ${orphaned.join(", ")}`);
});

test("a labelled action reads as a sentence, not a slug", () => {
  assert.equal(humanAuditAction("blog.created"), "Article created");
  assert.equal(humanAuditAction("user.sessions_cleared"), "Signed out everywhere");
  assert.equal(humanAuditAction("activity.deleted"), "Activity entry deleted");
});

test("an unknown action still renders, without underscores or a slug", () => {
  // The fallback exists so a newly added action is readable before someone
  // labels it. It must never leak the dotted form to the screen.
  const rendered = humanAuditAction("widget.something_happened");
  assert.equal(rendered, "Something happened");
  assert.ok(!rendered.includes("."));
  assert.ok(!rendered.includes("_"));
});

test("tone marks removals bad and creations ok", () => {
  assert.equal(auditActionTone("blog.deleted"), "bad");
  assert.equal(auditActionTone("lead.email_resend_failed"), "bad");
  assert.equal(auditActionTone("blog.created"), "ok");
  assert.equal(auditActionTone("lead.email_resent"), "ok");
  assert.equal(auditActionTone("user.login"), "accent");
  assert.equal(auditActionTone("settings.updated"), "neutral");
});
