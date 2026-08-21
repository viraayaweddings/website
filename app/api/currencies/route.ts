export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Currency list consumed by site-public/js/currency-switcher.js. */
const currencies = [
  {
    name: "Indian Rupee",
    code: "INR",
    symbol: "₹",
    rate_to_usd: 94.15,
    is_default: true,
  },
] as const;

export async function GET(): Promise<Response> {
  return Response.json(currencies, {
    headers: { "cache-control": "public, max-age=300" },
  });
}
