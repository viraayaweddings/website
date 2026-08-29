import { headers } from "next/headers";

/** Best-effort admin path for CSRF redirect targets. */
export async function adminPathFromRequest(): Promise<string> {
  const requestHeaders = await headers();

  for (const name of ["x-invoke-path", "x-matched-path", "x-url", "next-url"]) {
    const raw = requestHeaders.get(name);
    if (!raw) continue;
    const path = raw.startsWith("/") ? raw : safePathname(raw);
    if (path?.startsWith("/admin") && !path.startsWith("/admin/csrf")) {
      return path.split("?")[0] || "/admin";
    }
  }

  const referer = requestHeaders.get("referer");
  if (referer) {
    try {
      const path = new URL(referer).pathname;
      if (path.startsWith("/admin") && !path.startsWith("/admin/csrf")) return path;
    } catch {
      /* ignore */
    }
  }

  return "/admin";
}

function safePathname(value: string): string | null {
  try {
    return new URL(value).pathname;
  } catch {
    return null;
  }
}
