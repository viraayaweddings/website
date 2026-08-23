/**
 * Password hashing for admin accounts.
 *
 * bcrypt/argon2 need native bindings that Workers cannot load, so this uses
 * PBKDF2-SHA256 via WebCrypto, which is available in every runtime this ships
 * to (Vercel's Node functions today; workerd when this ran on Cloudflare).
 *
 * Stored format: `pbkdf2$<iterations>$<salt-base64>$<hash-base64>`
 */
// OWASP's floor for PBKDF2-SHA256. Measured at ~104ms here against ~40ms for
// the old 100k, which is a fine trade on a login. Only new hashes use this:
// verifyPassword reads the count out of the stored string, so existing
// passwords keep working until their owner next changes one.
export const ITERATIONS = 600_000;
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;

export const MIN_PASSWORD_LENGTH = 10;

/**
 * A hash of a password nobody has, at the current cost.
 *
 * The login path verifies against this when the email is unknown so that the
 * response time does not say whether an account exists. It has to be built from
 * `ITERATIONS`, not written out: a hardcoded `pbkdf2$100000$...` was left behind
 * when the cost went up, so an unknown account answered roughly six times
 * faster than a real one and the timing gave the staff list away.
 */
let decoyPromise: Promise<string> | null = null;

export function decoyHash(): Promise<string> {
  if (!decoyPromise) {
    decoyPromise = hashPassword(
      `decoy:${toBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES)))}`,
    );
  }
  return decoyPromise;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    KEY_LENGTH_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Length-independent, constant-time comparison. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) mismatch |= a[index] ^ b[index];
  return mismatch === 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterationsRaw, saltRaw, hashRaw] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterationsRaw || !saltRaw || !hashRaw) return false;

  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < 1000) return false;

  try {
    const expected = fromBase64(hashRaw);
    const actual = await derive(password, fromBase64(saltRaw), iterations);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Returns a human-readable reason, or null when the password is acceptable. */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[a-z]/i.test(password)) return "Password must contain a letter.";
  if (!/[0-9]/.test(password)) return "Password must contain a number.";
  return null;
}
