import { consultationSlots } from "@/worker/site/legacy-calculator-endpoints";

export const dynamic = "force-static";
export const runtime = "nodejs";

export function GET(): Response {
  return consultationSlots();
}
