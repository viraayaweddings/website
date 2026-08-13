import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const files = execFileSync("rg", ["--files", "site-public", "-g", "index.html"], { encoding: "utf8" })
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

const replacements = [
  [/href="\/wedding-packages">Wedding Packages/g, 'href="/package">Wedding Packages'],
  [/href="\/hotel-listing">Indian Venues/g, 'href="/hotel-listing?country=india">Indian Venues'],
  [
    /\s*<li>\s*<a href="\/check-hotel-availability">Venue Availability<\/a>\s*<\/li>/g,
    "",
  ],
  [
    /\s*<li>\s*<!--\s*<li>-->\s*<a href="\/check-hotel-availability">Venue Availability<\/a>\s*<!--\s*<\/li>-->\s*<!--<\/li>-->/g,
    "",
  ],
];

let changed = 0;
const failed = [];
function writeWithRetry(fullPath, contents) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.writeFileSync(fullPath, contents);
      return;
    } catch (error) {
      lastError = error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  throw lastError;
}

for (const file of files) {
  const fullPath = path.join(root, file);
  const before = fs.readFileSync(fullPath, "utf8");
  let after = before;
  for (const [pattern, replacement] of replacements) {
    after = after.replace(pattern, replacement);
  }
  if (after !== before) {
    try {
      writeWithRetry(fullPath, after);
      changed += 1;
    } catch (error) {
      failed.push({ file, error: error.message });
    }
  }
}

console.log(JSON.stringify({ updated: changed, failed }, null, 2));
