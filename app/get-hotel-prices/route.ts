import { getHotelPrices } from "@/worker/site/legacy-calculator-endpoints";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function POST(request: Request): Promise<Response> {
  return getHotelPrices(request);
}
