import { getCities } from "@/worker/site/legacy-calculator-endpoints";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request): Promise<Response> {
  return getCities(request);
}
