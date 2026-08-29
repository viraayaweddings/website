/**
 * Issues the admin CSRF cookie and sends the browser back.
 *
 * Lives under /api so it never runs through app/admin/layout.tsx. Layouts cannot
 * call cookies().set() on Vercel — doing so returned 500 for every /admin page.
 */
import { issueAdminCsrfToken } from "@/worker/admin/csrf-tokens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeAdminPath(value: string | null): string {
  if (!value || !value.startsWith("/admin") || value.startsWith("//")) return "/admin";
  try {
    const url = new URL(value, "https://admin.local");
    if (url.pathname.startsWith("/admin/csrf")) return "/admin";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/admin";
  }
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const next = safeAdminPath(url.searchParams.get("next"));
  const issued = issueAdminCsrfToken(url.protocol === "https:");

  return new Response(null, {
    status: 303,
    headers: {
      location: next,
      "cache-control": "no-store",
      "set-cookie": issued.cookie,
    },
  });
}
