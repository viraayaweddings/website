/**
 * Editable site chrome (contact details, social links).
 *
 * Defaults reproduce exactly what is currently hardcoded in site-public, so
 * the rendered pages are unchanged until an admin actually edits something.
 */
import { inArray } from "drizzle-orm";
import { getDb, type DatabaseEnv, type Db } from "../db/client";
import { settings } from "../db/schema";
import { onContentChanged, publishContentChange } from "./content-version";

export interface SiteSettings {
  /** Display form, as printed on the contact page. */
  phone: string;
  /** Digits only, including country code, for the wa.me link. */
  whatsappNumber: string;
  email: string;
  /** Rendered into the contact page separated by <br>. */
  addressLines: string[];
  instagramUrl: string;
  linkedinUrl: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  phone: "+91 81302 22141",
  whatsappNumber: "918130222141",
  email: "support@viraayaweddings.com",
  addressLines: ["Chattarpur Mandir Rd, Ansal Villas,", "Satbari, New Delhi,", "Delhi - 110074"],
  instagramUrl: "https://www.instagram.com/viraayaweddings/",
  linkedinUrl: "https://www.linkedin.com/company/viraaya-weddings/",
};

export const SETTING_KEYS = Object.keys(DEFAULT_SITE_SETTINGS) as (keyof SiteSettings)[];

export interface ResolvedSettings {
  values: SiteSettings;
  /**
   * True once contact details are stored in the database. Until then a page
   * keeps whatever its shell already contains.
   */
  hasStoredValues: boolean;
}

const DEFAULTS: ResolvedSettings = { values: DEFAULT_SITE_SETTINGS, hasStoredValues: false };

/**
 * Public pages read these on every request, so results are held briefly per
 * isolate. An admin edit becomes visible within this window.
 */
const CACHE_TTL_MS = 30_000;
let cache: { at: number; resolved: ResolvedSettings } | null = null;

function coerce<K extends keyof SiteSettings>(key: K, raw: unknown): SiteSettings[K] | null {
  const fallback = DEFAULT_SITE_SETTINGS[key];

  if (Array.isArray(fallback)) {
    if (!Array.isArray(raw)) return null;
    const lines = raw.map((line) => String(line).trim()).filter(Boolean);
    return (lines.length ? lines : fallback) as SiteSettings[K];
  }

  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return (trimmed || fallback) as SiteSettings[K];
}

export async function readSettings(db: Db): Promise<ResolvedSettings> {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, SETTING_KEYS as string[]));

  const values: SiteSettings = { ...DEFAULT_SITE_SETTINGS };
  // Any stored row makes the database the source of truth for these.
  let hasStoredValues = false;

  for (const row of rows) {
    const key = row.key as keyof SiteSettings;
    if (!(key in values)) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(row.value);
    } catch {
      continue;
    }

    const coerced = coerce(key, parsed);
    if (coerced === null) continue;

    (values[key] as SiteSettings[typeof key]) = coerced;
    hasStoredValues = true;
  }

  return { values, hasStoredValues };
}

/** Never throws: a settings problem must not take the public site down. */
export async function loadSiteSettings(env: DatabaseEnv): Promise<ResolvedSettings> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.resolved;

  try {
    const db = await getDb(env);
    if (!db) return DEFAULTS;

    const resolved = await readSettings(db);
    cache = { at: now, resolved };
    return resolved;
  } catch (error) {
    console.error("[settings] load failed", error instanceof Error ? error.message : error);
    return cache?.resolved ?? DEFAULTS;
  }
}

/** Drops the isolate cache so an admin sees their own edit immediately. */
export function invalidateSettingsCache(): void {
  cache = null;
}

export async function writeSettings(
  db: Db,
  updatedBy: string,
  patch: Partial<SiteSettings>,
): Promise<void> {
  const now = new Date();

  for (const [key, value] of Object.entries(patch)) {
    if (!(SETTING_KEYS as string[]).includes(key)) continue;

    await db
      .insert(settings)
      .values({ key, value: JSON.stringify(value), updatedAt: now, updatedBy })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: JSON.stringify(value), updatedAt: now, updatedBy },
      });
  }

  invalidateSettingsCache();
  await publishContentChange();
}

/** The wa.me href the floating button should point at. */
export function whatsappHref(values: SiteSettings): string {
  const digits = values.whatsappNumber.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : DEFAULT_SITE_SETTINGS.whatsappNumber;
}

// Dropped when any instance publishes a content change, not just this one.
// See worker/site/content-version.ts.
onContentChanged(() => {
  invalidateSettingsCache();
});
