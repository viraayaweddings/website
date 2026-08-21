import { copyFile, mkdir, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

/**
 * Puts `html_rewriter_bg.wasm` where the bundled loader looks for it.
 *
 * Nitro inlines the html-rewriter-wasm glue into the server bundle, but the
 * glue reads its 900KB WebAssembly binary from disk with a `__dirname`-relative
 * `readFileSync`. Bundling rewrites `__dirname` to wherever the chunk landed
 * and leaves the .wasm behind, so the first call would throw ENOENT in
 * production while working locally against node_modules.
 *
 * Rather than hardcode Nitro's chunk layout, this finds the emitted glue and
 * drops the binary beside it.
 */
export async function copyHtmlRewriterWasm(serverDir: string): Promise<void> {
  const require = createRequire(import.meta.url);
  const source = resolve(
    dirname(require.resolve("html-rewriter-wasm/package.json")),
    "dist",
    "html_rewriter_bg.wasm",
  );

  const targets = await findGlueDirs(serverDir);
  if (!targets.length) {
    throw new Error(
      "html-rewriter-wasm was not found in the server bundle, so its .wasm has nowhere to go.",
    );
  }

  for (const target of targets) {
    await mkdir(target, { recursive: true });
    await copyFile(source, join(target, "html_rewriter_bg.wasm"));
  }
}

/** Every directory holding a chunk that carries the wasm loader. */
async function findGlueDirs(directory: string): Promise<string[]> {
  const found = new Set<string>();

  const walk = async (current: string): Promise<void> => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (/html.?rewriter.*\.(mjs|js|cjs)$/i.test(entry.name)) {
        found.add(current);
      }
    }
  };

  await walk(directory);
  return [...found];
}
