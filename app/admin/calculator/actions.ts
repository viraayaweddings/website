"use server";

import { redirect } from "next/navigation";
import { writeCalculatorPriceOverrides } from "@/worker/site/calculator-prices";
import { recordAudit, requireDb, requireRole } from "../_lib/auth";

const CALCULATOR_PATH = "/admin/calculator";

function failed(message: string): never {
  redirect(`${CALCULATOR_PATH}?error=${encodeURIComponent(message)}`);
}

export async function saveCalculatorPricesAction(formData: FormData): Promise<void> {
  const actor = await requireRole("admin");
  const db = await requireDb();
  const raw = String(formData.get("calculatorPrices") || "");

  const result = await writeCalculatorPriceOverrides(db, actor.email, raw);
  if (!result.ok) failed(result.error);

  await recordAudit(db, actor, "settings.updated", "settings", "calculator_prices", { keys: ["calculator_prices"] });
  redirect(`${CALCULATOR_PATH}?saved=1`);
}
