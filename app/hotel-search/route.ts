import { searchHotels } from "@/worker/public-endpoints";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  return searchHotels(request);
}
