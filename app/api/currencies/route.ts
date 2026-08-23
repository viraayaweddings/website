import { CALCULATOR_CACHE_CONTROL, loadCalculatorConfig } from "@/worker/site/calculator-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Currency list consumed by site-public/js/currency-switcher.js.
 *
 * There is no hardcoded fallback. A currency list this handler invented would
 * be a rate nobody can edit, quietly converting every price on the site.
 */
export async function GET(): Promise<Response> {
  const { currencies } = await loadCalculatorConfig();

  return Response.json(currencies, {
    headers: { "cache-control": CALCULATOR_CACHE_CONTROL },
  });
}
