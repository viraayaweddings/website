import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "vite";

const staticHeaders = `# Security headers for static HTML and assets.
/*
  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self'; media-src 'self'; frame-src 'self' https://www.youtube.com https://player.vimeo.com; upgrade-insecure-requests
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Permissions-Policy: accelerometer=(), autoplay=(), camera=(), encrypted-media=(), fullscreen=(self), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), midi=(), picture-in-picture=(), usb=()
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  X-Permitted-Cross-Domain-Policies: none
  X-XSS-Protection: 0

# Cache content-hashed assets immutably.
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;

/** Writes security headers for the static export in dist/client. */
export function sites(): Plugin {
  let root = process.cwd();

  return {
    name: "sites",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    async closeBundle() {
      const clientOutputDirectory = resolve(root, "dist", "client");
      await mkdir(clientOutputDirectory, { recursive: true });
      await writeFile(resolve(clientOutputDirectory, "_headers"), staticHeaders);
    },
  };
}
