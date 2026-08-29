export const ADMIN_CSRF_COOKIE = "vw_admin_csrf";
export const ADMIN_CSRF_FIELD = "_csrf";
export const ADMIN_CSRF_HEADER = "x-csrf-token";

/** One hour — long enough for an edit session, short enough to limit reuse. */
const MAX_AGE_SECONDS = 3600;

export function issueAdminCsrfToken(secure: boolean): { token: string; cookie: string } {
  const token = crypto.randomUUID();
  const flags = secure ? "; Secure" : "";
  return {
    token,
    cookie: `${ADMIN_CSRF_COOKIE}=${token}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}${flags}`,
  };
}

export function readAdminCsrfCookie(request: Request): string {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === ADMIN_CSRF_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function tokensMatch(provided: string, expected: string): boolean {
  if (!provided || !expected || provided.length !== expected.length) return false;
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/** Validates a fetch upload or route handler that sends the header. */
export function assertAdminCsrfFromRequest(request: Request): void {
  const provided = (request.headers.get(ADMIN_CSRF_HEADER) || "").trim();
  const expected = readAdminCsrfCookie(request);
  if (!tokensMatch(provided, expected)) {
    throw new Error("Refused: your session expired. Refresh the page and try again.");
  }
}

export function adminCsrfTokensMatch(provided: string, expected: string): boolean {
  return tokensMatch(provided, expected);
}
