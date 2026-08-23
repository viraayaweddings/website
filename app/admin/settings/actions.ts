"use server";

import { redirect } from "next/navigation";
import { writeSettings, type SiteSettings } from "@/worker/site/settings";
import { assertSameOrigin, recordAudit, requireDb, requireRole } from "../_lib/auth";
import { withFlashKey } from "../_lib/flash";

const SETTINGS_PATH = "/admin/settings";

function failed(message: string): never {
  redirect(withFlashKey(`${SETTINGS_PATH}?error=${encodeURIComponent(message)}`));
}

/** Contact details are site-wide, so editing them is an admin-only action. */
export async function saveSettingsAction(formData: FormData): Promise<void> {
  await assertSameOrigin();
  const actor = await requireRole("admin");
  const db = await requireDb();

  // Bounded like every other text field in the panel: these render into the
  // footer of every public page, and nothing else here was capping them.
  const phone = String(formData.get("phone") || "").trim().slice(0, 40);
  const whatsappNumber = String(formData.get("whatsappNumber") || "").replace(/\D/g, "").slice(0, 20);
  const email = String(formData.get("email") || "").trim().toLowerCase().slice(0, 254);
  const address = String(formData.get("address") || "").slice(0, 600);
  const instagramUrl = String(formData.get("instagramUrl") || "").trim().slice(0, 300);
  const linkedinUrl = String(formData.get("linkedinUrl") || "").trim().slice(0, 300);

  if (!phone) failed("Enter a phone number.");
  if (whatsappNumber.length < 10) failed("Enter the WhatsApp number including country code, digits only.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) failed("Enter a valid email address.");

  for (const [label, url] of [["Instagram", instagramUrl], ["LinkedIn", linkedinUrl]] as const) {
    if (!url) failed(`Enter the ${label} profile URL.`);
    if (!/^https:\/\//i.test(url)) failed(`The ${label} URL must start with https:// (for example https://www.instagram.com/your-page/).`);
  }

  const addressLines = address
    .slice(0, 600)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!addressLines.length) failed("Enter an address.");

  const patch: SiteSettings = {
    phone,
    whatsappNumber,
    email,
    addressLines,
    instagramUrl,
    linkedinUrl,
  };

  await writeSettings(db, actor.email, patch);
  await recordAudit(db, actor, "settings.updated", "settings", "site", { keys: Object.keys(patch) });

  redirect(withFlashKey(`${SETTINGS_PATH}?saved=1`));
}
