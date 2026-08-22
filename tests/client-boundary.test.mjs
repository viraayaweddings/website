import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

/**
 * Every export of a `"use client"` module becomes a client reference on the
 * server. Rendering one as a component is the whole point; anything else is
 * not what it looks like:
 *
 *  - calling it throws "Unexpectedly client reference export '...' is called
 *    on server", which takes down the page — /admin/blogs did exactly this
 *    after a display helper moved into the media picker;
 *  - reading it hands you a reference object rather than the value, which is
 *    how the theme bootstrap script silently stopped being injected.
 *
 * Neither shows up in dev or in typecheck: the bundler only splits the graph
 * at build time. So the rule is checked here instead — a client module may
 * export components, and a server module may import components from one, and
 * that is all.
 */

const ROOT = resolve(import.meta.dirname, "..");
const SCANNED = ["app", "worker"];
const EXTENSIONS = [".ts", ".tsx"];

async function sourceFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await sourceFiles(path)));
    else if (EXTENSIONS.some((extension) => entry.name.endsWith(extension))) found.push(path);
  }
  return found;
}

function isClientModule(source) {
  return /^\s*(?:\/\*[\s\S]*?\*\/\s*)?["']use client["']/.test(source);
}

/** Components are PascalCase; anything else is a value a server render may touch. */
function isComponentName(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name) && name !== name.toUpperCase();
}

/** Named imports and where they come from, ignoring `import type`. */
function namedImports(source) {
  const found = [];
  const pattern = /import\s+(?!type\s)\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;

  for (const match of source.matchAll(pattern)) {
    const names = match[1]
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => !part.startsWith("type "))
      .map((part) => part.split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    if (names.length) found.push({ names, specifier: match[2] });
  }

  return found;
}

/** Resolves a relative or `@/` specifier to a file on disk, or null. */
async function resolveSpecifier(fromFile, specifier) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return null;

  const base = specifier.startsWith("@/")
    ? join(ROOT, specifier.slice(2))
    : resolve(dirname(fromFile), specifier);

  for (const candidate of [base, ...EXTENSIONS.map((extension) => `${base}${extension}`)]) {
    try {
      const source = await readFile(candidate, "utf8");
      return { path: candidate, source };
    } catch {
      /* try the next extension */
    }
  }

  return null;
}

test("a server module never imports a non-component from a client module", async () => {
  const files = (await Promise.all(SCANNED.map((dir) => sourceFiles(join(ROOT, dir))))).flat();
  const offences = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (isClientModule(source)) continue; // Client-to-client imports are fine.

    for (const { names, specifier } of namedImports(source)) {
      const target = await resolveSpecifier(file, specifier);
      if (!target || !isClientModule(target.source)) continue;

      for (const name of names) {
        if (isComponentName(name)) continue;
        offences.push(
          `${relative(ROOT, file)} imports "${name}" from the client module ${relative(ROOT, target.path)}`,
        );
      }
    }
  }

  assert.deepEqual(offences, [], `\n${offences.join("\n")}\n`);
});
