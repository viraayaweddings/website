import { getHotelPrice } from "@/worker/site/legacy-calculator-endpoints";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hotel: string; month: string }> },
): Promise<Response> {
  const { hotel, month } = await params;
  return getHotelPrice(hotel, month);
}
