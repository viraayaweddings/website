import { matchBudget } from "@/worker/site/budget-match";
import { hasAnyInput, normalizeDays } from "@/worker/site/budget-formula";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/calculator/budget-match
 *
 * What the calculators ask once the visitor has a place, dates, a day grid and
 * a budget band: which hotels here come in under that number. The maths is in
 * worker/site/budget-match.ts; this is the transport.
 *
 * Same-origin only. Nothing here is secret -- every rate it reads is already
 * served by /data/calculator/prices.json -- but this is the one endpoint that
 * hands back the whole city priced against one enquiry, and a page on another
 * origin has no reason to ask for that.
 */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return Response.json({ ok: false, message: "Invalid request origin." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, message: "Expected a JSON body." }, { status: 400 });
  }

  const days = normalizeDays(body.days);
  if (!hasAnyInput(days)) {
    return Response.json(
      { ok: false, message: "Enter at least one room or guest count." },
      { status: 400 },
    );
  }

  const result = await matchBudget({
    cityId: String(body.cityId ?? ""),
    checkIn: String(body.checkIn ?? ""),
    budgetCode: String(body.budget ?? ""),
    days,
  });

  if (!result.city) {
    return Response.json({ ok: false, message: "Select a place first." }, { status: 400 });
  }

  // Never cached: the answer is specific to one visitor's dates and grid, and
  // the shared caches in front of this site key on the URL alone.
  return Response.json(result, { headers: { "cache-control": "no-store" } });
}
