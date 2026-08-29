/**
 * Caller IP from headers the platform sets, not caller-supplied prefixes.
 *
 * Vercel appends the real client to `x-forwarded-for`, so the last hop is
 * trustworthy. `x-vercel-forwarded-for` is written by the platform and cannot
 * be spoofed. Reading the first `x-forwarded-for` entry lets an attacker pick
 * a new rate-limit bucket on every request.
 */
export function trustedClientIp(headers: Headers): string | null {
  const trusted = headers.get("x-vercel-forwarded-for");
  if (trusted) return trusted.split(",").pop()?.trim() || null;

  const chain = headers.get("x-forwarded-for");
  if (chain) return chain.split(",").pop()?.trim() || null;

  return headers.get("x-real-ip");
}

export function trustedClientIpOrUnknown(headers: Headers): string {
  return trustedClientIp(headers) || "unknown";
}
