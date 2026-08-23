import { getHotelsByCity } from "@/worker/site/legacy-calculator-endpoints";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** /compare-hotel passes the city as `?city=`; the path form is the sibling route. */
export function GET(request: Request): Promise<Response> {
  return getHotelsByCity(request);
}
