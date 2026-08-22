import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, validatePasswordStrength, verifyPassword } from "../worker/admin/password.ts";

test("a password verifies against its own hash", async () => {
  const stored = await hashPassword("correct horse battery 7");
  assert.equal(await verifyPassword("correct horse battery 7", stored), true);
  assert.equal(await verifyPassword("correct horse battery 8", stored), false);
});

test("new hashes use the raised iteration count", async () => {
  const stored = await hashPassword("correct horse battery 7");
  assert.equal(stored.split("$")[1], "600000");
});

// The iteration count lives in the stored string, so raising the default must
// not lock out anyone whose password was hashed under the old one.
test("hashes written at the old iteration count still verify", async () => {
  const legacy =
    "pbkdf2$100000$3Q2+7wAAAAAAAAAAAAAAAA==$" +
    (await (async () => {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode("legacy password 1"),
        "PBKDF2",
        false,
        ["deriveBits"],
      );
      const salt = Uint8Array.from(atob("3Q2+7wAAAAAAAAAAAAAAAA=="), (c) => c.charCodeAt(0));
      const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        key,
        256,
      );
      let binary = "";
      for (const byte of new Uint8Array(bits)) binary += String.fromCharCode(byte);
      return btoa(binary);
    })());

  assert.equal(await verifyPassword("legacy password 1", legacy), true);
  assert.equal(await verifyPassword("wrong password 1", legacy), false);
});

test("malformed stored hashes are rejected rather than throwing", async () => {
  for (const bad of ["", "nonsense", "pbkdf2$$$", "pbkdf2$10$abc$def", "bcrypt$1$a$b"]) {
    assert.equal(await verifyPassword("anything", bad), false, bad);
  }
});

test("password strength rules", () => {
  assert.match(validatePasswordStrength("short1"), /at least/);
  assert.match(validatePasswordStrength("1234567890"), /letter/);
  assert.match(validatePasswordStrength("abcdefghij"), /number/);
  assert.equal(validatePasswordStrength("abcdefghi1"), null);
});
