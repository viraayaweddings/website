export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { currency?: unknown; code?: unknown };
  const currency = String(body.currency || body.code || "INR")
    .trim()
    .toUpperCase()
    .slice(0, 8);
  const secure = new URL(request.url).protocol === "https:";

  return Response.json(
    { ok: true, currency },
    {
      headers: {
        "cache-control": "no-store",
        "set-cookie": `selected_currency=${currency}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? "; Secure" : ""}`,
      },
    },
  );
}
