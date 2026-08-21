import { fileURLToPath } from "node:url";
import vinext from "vinext";
import { nitro } from "nitro/vite";
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
const redirectRules = Object.fromEntries(
  Object.entries(PUBLIC_REDIRECTS).map(([from, to]) => [
    from,
    { redirect: { to, status: 301 } },
  ]),
);

export default defineConfig({
  publicDir: "site-public",
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
    }),
    sites(),
  ],
});
