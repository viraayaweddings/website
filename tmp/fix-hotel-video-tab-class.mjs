import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const files = execFileSync("rg", ["--files", "site-public/destination-wedding", "-g", "index.html"], { encoding: "utf8" })
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

let updated = 0;
for (const file of files) {
  const fullPath = path.join(root, file);
  const before = fs.readFileSync(fullPath, "utf8");
  const after = before.replace(/\btext-primary v-link tab-btn\b/g, "text-primary nav-link tab-btn");
  if (after !== before) {
    fs.writeFileSync(fullPath, after);
    updated += 1;
  }
}

console.log(`updated ${updated} files`);
