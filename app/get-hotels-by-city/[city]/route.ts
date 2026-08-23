import { getHotelsByCity } from "@/worker/site/legacy-calculator-endpoints";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ city: string }> },
): Promise<Response> {
  const { city } = await params;
  return getHotelsByCity(request, city);
}
