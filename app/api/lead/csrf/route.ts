/**
 * Issues the double-submit token every lead form needs.
 *
 * `handleLeadRequest` refuses a submission whose `csrfToken` does not match the
 * `lead_csrf` cookie, and site-public/js/lead-forms.js fetches the pair from
 * here before it posts. This lived in the Cloudflare worker entry and had no
 * App Router equivalent, so on Vercel it answered 404: the token came back
 * empty, every submission failed the check, and no enquiry reached the panel.
 */
import { issueLeadCsrfToken } from "@/worker/lead-csrf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const issued = issueLeadCsrfToken(new URL(request.url).protocol === "https:");

  return Response.json(
    { token: issued.token },
    {
      headers: {
        // The cookie is half the pair; a cached response would hand two
        // visitors the same token and the check would stop meaning anything.
        "cache-control": "no-store",
        "set-cookie": issued.cookie,
      },
    },
  );
}
