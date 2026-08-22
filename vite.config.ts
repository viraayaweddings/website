import { fileURLToPath } from "node:url";
import vinext from "vinext";
import { nitro } from "nitro/vite";
import type { NitroConfig } from "nitro/types";
import tailwindcss from "@tailwindcss/postcss";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin.ts";
import { PUBLIC_REDIRECTS } from "./worker/site/public-routes.ts";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

/**
 * The marketing site is ~2,300 static files. Nitro only picks up Vite's own
 * client build dir, so site-public has to be registered explicitly or the
 * deploy ships with an empty static directory and every public URL 404s.
 */
const staticSiteDir = fileURLToPath(new URL("./site-public", import.meta.url));

/**
 * Emitted ahead of the static file handler. Several of the old URLs still have
 * a file in site-public, so without these the retired page wins over the
 * redirect.
 */
const redirectRules: NitroConfig["routeRules"] = Object.fromEntries(
  Object.entries(PUBLIC_REDIRECTS).map(([from, to]) => [
    from,
    { redirect: { to, status: 301 as const } },
  ]),
);

/**
 * Vercel serves .vercel/output/static before the function ever runs, so a page
 * that lives in site-public can never pick up an admin's edits. These send the
 * database-owned paths to the function first.
 *
 * The `missing` guard is what keeps that from looping: when the handler fetches
 * a page's original markup back through the origin it sets this header, the
 * rewrite stops matching, and the static file is served instead.
 */
const SHELL_HEADER = "x-vw-shell";

const databaseOwnedRoutes = [
  "/",
  "/contact(/.*)?",
  "/blogs(/.*)?",
  "/destination-wedding/.*",
  // The calculator data files. They still exist under site-public, but the
  // handler answers from the database and falls back to the bundle, so the
  // pages that read these paths directly get edited prices too.
  "/data/calculator/[^/]+[.]json",
].map((src) => ({
  src,
  missing: [{ type: "header", key: SHELL_HEADER }],
  dest: "/__server",
}));

export default defineConfig({
  publicDir: "site-public",
  // html-rewriter-wasm must stay a live import. Vinext bundles server deps with
  // `noExternal: true`, and this package does not survive that: the CJS glue
  // reads its .wasm through a `__dirname`-relative readFileSync and pulls in
  // `./asyncify.js` with a relative require. Bundled, `__dirname` is left
  // undefined and asyncify.js is never emitted, so the server function throws
  // at module load and every route -- not just the HTML ones -- returns 500.
  ssr: {
    external: ["html-rewriter-wasm"],
  },
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  server: isCodexSeatbeltSandbox
    ? { watch: { useFsEvents: false, usePolling: true } }
    : undefined,
  plugins: [
    vinext(),
    nitro({
      preset: process.env.NITRO_PRESET || "vercel",
      publicAssets: [
        { dir: staticSiteDir, baseURL: "/", maxAge: 0, fallthrough: true },
      ],
      routeRules: redirectRules,
      traceDeps: ["html-rewriter-wasm*"],
      vercel: { config: { version: 3, routes: databaseOwnedRoutes } },
    }),
    sites(),
  ],
});
