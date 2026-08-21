"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/worker/db/client";
import { recordAudit, requireDb, requireRole } from "../_lib/auth";

const SETTINGS_PATH = "/admin/settings";

export async function importSiteContentAction(): Promise<void> {
  const actor = await requireRole("admin", SETTINGS_PATH, "site settings");
  const db = await requireDb();

  const result = await seedSiteContent(db);

  await recordAudit(db, actor, "content.imported", "site", "seed", {
    statementsRun: result.statementsRun,
    ignoredErrors: result.ignoredErrors,
    errors: result.errors.length,
  });

  if (result.errors.length) {
    redirect(`${SETTINGS_PATH}?error=${encodeURIComponent("Import finished with errors. Check Vercel logs or run npm run db:seed locally.")}`);
  }

  redirect(`${SETTINGS_PATH}?saved=${encodeURIComponent("Site content imported into Postgres.")}`);
}
