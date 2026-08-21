/**
 * Fails the build when the Vercel output would deploy with no routing.
 *
 * A Nitro misconfiguration can suppress the Vercel preset's own `compiled`
 * hook. The build still reports success and .vercel/output still has the
 * function and the static files -- but without config.json Vercel has no
 * routes, and every URL on the deployed site answers with a platform 404.
 * That failure is invisible until production is already broken, so it is
 * checked here instead.
 */
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const outputDir = resolve(process.cwd(), ".vercel", "output");

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

// Only the Vercel preset writes this directory; other presets are not checked.
if (!(await exists(outputDir))) process.exit(0);

const failures = [];

const configPath = resolve(outputDir, "config.json");
if (!(await exists(configPath))) {
  failures.push(".vercel/output/config.json is missing, so the deployment has no routes.");
} else {
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const routes = Array.isArray(config.routes) ? config.routes : [];
  if (!routes.some((route) => route.handle === "filesystem")) {
    failures.push("config.json has no filesystem handler, so static pages would not be served.");
  }
  if (!routes.some((route) => route.dest === "/__server")) {
    failures.push("config.json has no route to the server function, so the admin and APIs are unreachable.");
  }
}

if (!(await exists(resolve(outputDir, "static", "index.html")))) {
  failures.push(".vercel/output/static/index.html is missing, so the marketing site was not shipped.");
}

if (failures.length) {
  console.error(`\nVercel output is not deployable:\n${failures.map((line) => `  - ${line}`).join("\n")}\n`);
  process.exit(1);
}

console.log("Vercel output check passed.");
