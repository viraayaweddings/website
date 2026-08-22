import { loadCalculatorDataset } from "@/worker/site/calculator-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Currency list consumed by site-public/js/currency-switcher.js. */
const FALLBACK = [
  { name: "Indian Rupee", code: "INR", symbol: "₹", rate_to_usd: 94.15, is_default: true },
] as const;

export async function GET(): Promise<Response> {
  const data = await loadCalculatorDataset();
  const currencies = data.currencies.length > 0 ? data.currencies : FALLBACK;

  return Response.json(currencies, {
    headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
