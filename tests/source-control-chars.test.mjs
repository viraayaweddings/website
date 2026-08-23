import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Source files must not contain stray control characters.
 *
 * Two got in while editing through shell heredocs, and both were invisible in
 * every diff and every terminal that rendered them: a NUL inside a comment, and
 * a backspace where `\b` was meant inside a regex. The second one shipped --
 * `/\b\w/g` became `/<BS>\w/g`, which matches nothing, so form names stopped
 * being capitalised and arrived in the panel as "contact Form". Nothing else
 * catches this: it parses, it lints, it builds, it just quietly does the wrong
 * thing.
 */
const ROOTS = ["app", "worker", "scripts", "tests", "site-public/js"];
const EXTENSIONS = /\.(ts|tsx|mjs|js|css)$/;

/** Tab, newline and carriage return are the only ones a source file needs. */
const ALLOWED = new Set([9, 10, 13]);

function walk(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else if (EXTENSIONS.test(entry)) found.push(full);
  }
  return found;
}

test("no source file carries a stray control character", () => {
  const offenders = [];

  for (const root of ROOTS) {
    for (const file of walk(root)) {
      const bytes = readFileSync(file);
      for (let i = 0; i < bytes.length; i += 1) {
        const code = bytes[i];
        if (code >= 32 || ALLOWED.has(code)) continue;
        const context = bytes.subarray(Math.max(0, i - 40), i + 10).toString("utf8");
        offenders.push(`${file}: 0x${code.toString(16).padStart(2, "0")} at byte ${i} — ...${context}...`);
      }
    }
  }

  assert.deepEqual(offenders, [], `\n${offenders.join("\n")}\n`);
});
