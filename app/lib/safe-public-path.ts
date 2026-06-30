import fs from "node:fs";
import path from "node:path";

// Resolved absolute path to the project's public/ directory. All on-disk image
// lookups must stay inside this root.
const PUBLIC_ROOT = path.resolve(process.cwd(), "public");

// Guards against path traversal: media paths are derived from DB-stored values
// (localPath/originalUrl), so a stored ".." segment could otherwise resolve to a
// file outside public/. Returns true only when `file` resolves inside public/.
export function isWithinPublic(file: string) {
  const resolved = path.resolve(file);
  return resolved === PUBLIC_ROOT || resolved.startsWith(PUBLIC_ROOT + path.sep);
}

// fs.existsSync with a containment check. Use this instead of calling
// fs.existsSync directly on paths built from untrusted/DB-sourced strings.
export function publicFileExists(file: string | null | undefined) {
  if (!file || !isWithinPublic(file)) return false;
  return fs.existsSync(file);
}
