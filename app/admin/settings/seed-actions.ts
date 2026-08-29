"use server";

import { redirect } from "next/navigation";
import { seedSiteContent } from "@/worker/db/seed-content";
import { assertAdminRequest, recordAudit, requireDb, requireRole } from "../_lib/auth";
import { withFlashKey } from "../_lib/flash";

const SETTINGS_PATH = "/admin/settings";

export async function importSiteContentAction(formData: FormData): Promise<void> {
  await assertAdminRequest(formData);
  const actor = await requireRole("admin", SETTINGS_PATH, "site settings");
  const db = await requireDb();

  const result = await seedSiteContent(db);

  await recordAudit(db, actor, "content.imported", "site", "seed", {
    statementsRun: result.statementsRun,
    ignoredErrors: result.ignoredErrors,
    errors: result.errors.length,
  });

  if (result.errors.length) {
    redirect(withFlashKey(`${SETTINGS_PATH}?error=${encodeURIComponent("Import finished with errors. Check Vercel logs or run npm run db:seed locally.")}`));
  }

  redirect(withFlashKey(`${SETTINGS_PATH}?saved=${encodeURIComponent("Site content imported into Postgres.")}`));
}
