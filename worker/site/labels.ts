/**
 * Editable wording for the fixed parts of a page: section headings and the
 * "at a glance" field labels.
 *
 * Defaults reproduce exactly what the pages already say, so nothing changes
 * until someone edits them.
 */
import { getDb, type DatabaseEnv, type Db } from "../db/client";
import { siteLabels } from "../db/schema";
import { escapeHtml } from "./hero";
import { eq } from "drizzle-orm";

export interface LabelDefinition {
  key: string;
  /** Shown in the admin panel. */
  title: string;
  /** Which pages it appears on. */
  where: string;
  value: string;
  /** The bolded half of a two-part heading; empty for a plain label. */
  emphasis: string;
  /** Classes on the emphasised span, so the original styling survives. */
  emphasisClass: string;
}

/** Every label the panel can edit, with the site's current wording. */
export const LABEL_DEFINITIONS: LabelDefinition[] = [
  { key: "venue.amenities", title: "Amenities heading", where: "Venue pages",
    value: "Hotel", emphasis: "Amenities", emphasisClass: "fw-600" },
  { key: "venue.faq", title: "Questions heading", where: "Venue pages",
    value: "Frequently Asked", emphasis: "Questions", emphasisClass: "fw-600" },
  { key: "venue.similar", title: "Similar hotels heading", where: "Venue pages",
    value: "Browse\u00a0Similar", emphasis: "Hotels", emphasisClass: "fw-600" },
  { key: "venue.gallery", title: "Gallery heading", where: "Venue pages",
    value: "Event Spaces", emphasis: "Gallery", emphasisClass: "fw-600" },
  { key: "venue.glance", title: "At a glance heading", where: "Venue pages",
    value: "AT A", emphasis: "GLANCE", emphasisClass: "text-primary fw-800" },

  { key: "venue.glance.rooms", title: "Room inventory label", where: "Venue pages",
    value: "Total Room Inventory", emphasis: "", emphasisClass: "" },
  { key: "venue.glance.indoor", title: "Indoor venues label", where: "Venue pages",
    value: "Indoor Venues", emphasis: "", emphasisClass: "" },
  { key: "venue.glance.outdoor", title: "Outdoor venues label", where: "Venue pages",
    value: "Outdoor Venues", emphasis: "", emphasisClass: "" },
  { key: "venue.glance.guests", title: "Guest capacity label", where: "Venue pages",
    value: "Total Guest Capacity", emphasis: "", emphasisClass: "" },
  { key: "venue.glance.reception", title: "Reception capacity label", where: "Venue pages",
    value: "Max. Reception Capacity", emphasis: "", emphasisClass: "" },

  { key: "venue.viewMore", title: "Expand description link", where: "Venue pages",
    value: "View More", emphasis: "", emphasisClass: "" },
  { key: "venue.airport", title: "Airport icon label", where: "Venue pages",
    value: "Airport", emphasis: "", emphasisClass: "" },
  { key: "venue.station", title: "Railway icon label", where: "Venue pages",
    value: "Railway Station", emphasis: "", emphasisClass: "" },

  { key: "card.details", title: "Details button", where: "Venue cards",
    value: "DETAILS", emphasis: "", emphasisClass: "" },
  { key: "card.availability", title: "Availability button", where: "Venue cards",
    value: "CHECK AVAILABILITY", emphasis: "", emphasisClass: "" },

  { key: "card.readMore", title: "Read more button", where: "Blog cards",
    value: "Read More", emphasis: "", emphasisClass: "" },

  { key: "blog.toc", title: "Table of contents heading", where: "Blog articles",
    value: "Table of Contents", emphasis: "", emphasisClass: "" },
  { key: "blog.faq", title: "Questions heading", where: "Blog articles",
    value: "Frequently Asked", emphasis: "Questions", emphasisClass: "fw-600 text-primary" },
];

/** The five "at a glance" labels, in the order the template lays them out. */
export const GLANCE_LABEL_KEYS = [
  "venue.glance.rooms",
  "venue.glance.indoor",
  "venue.glance.outdoor",
  "venue.glance.guests",
  "venue.glance.reception",
] as const;

export type ResolvedLabels = Map<string, { value: string; emphasis: string }>;
const DEFINITIONS_BY_KEY = new Map(LABEL_DEFINITIONS.map((label) => [label.key, label]));

function defaults(): ResolvedLabels {
  return new Map(
    LABEL_DEFINITIONS.map((label) => [label.key, { value: label.value, emphasis: label.emphasis }]),
  );
}

const CACHE_TTL_MS = 30_000;
let cache: { at: number; labels: ResolvedLabels } | null = null;

export function invalidateLabelCache(): void {
  cache = null;
}

export async function ensureDefaultLabels(db: Db, updatedBy = "seed"): Promise<number> {
  const existingRows = await db.select({ key: siteLabels.key, value: siteLabels.value }).from(siteLabels);
  const existing = new Map(existingRows.map((row) => [row.key, row.value]));
  const missing = LABEL_DEFINITIONS.filter((definition) => !existing.has(definition.key));

  const now = new Date();
  if (missing.length) {
    await db
      .insert(siteLabels)
      .values(
        missing.map((definition) => ({
          key: definition.key,
          value: definition.value,
          emphasis: definition.emphasis,
          updatedAt: now,
          updatedBy,
        })),
      )
      .onConflictDoNothing({ target: siteLabels.key });
  }

  const blank = LABEL_DEFINITIONS.filter((definition) => existing.get(definition.key)?.trim() === "");
  for (const definition of blank) {
    await db
      .update(siteLabels)
      .set({ value: definition.value, emphasis: definition.emphasis, updatedAt: now, updatedBy })
      .where(eq(siteLabels.key, definition.key));
  }

  const changed = missing.length + blank.length;
  if (changed > 0) invalidateLabelCache();
  return changed;
}

/** Never throws: wording problems must not take a page down. */
export async function loadLabels(env: DatabaseEnv): Promise<ResolvedLabels> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.labels;

  const labels = defaults();

  try {
    const db = await getDb(env);
    if (!db) return labels;

    await ensureDefaultLabels(db);

    for (const row of await db.select().from(siteLabels)) {
      if (!labels.has(row.key)) continue;
      labels.set(row.key, { value: row.value, emphasis: row.emphasis });
    }

    cache = { at: now, labels };
    return labels;
  } catch (error) {
    console.error("[labels] load failed", error instanceof Error ? error.message : error);
    return cache?.labels ?? labels;
  }
}

export async function readLabels(db: Db): Promise<ResolvedLabels> {
  await ensureDefaultLabels(db);

  const labels = defaults();
  for (const row of await db.select().from(siteLabels)) {
    if (labels.has(row.key)) labels.set(row.key, { value: row.value, emphasis: row.emphasis });
  }
  return labels;
}

export async function writeLabels(
  db: Db,
  updatedBy: string,
  patch: { key: string; value: string; emphasis: string }[],
): Promise<void> {
  const now = new Date();

  for (const entry of patch) {
    if (!DEFINITIONS_BY_KEY.has(entry.key)) continue;
    await db
      .insert(siteLabels)
      .values({ key: entry.key, value: entry.value, emphasis: entry.emphasis, updatedAt: now, updatedBy })
      .onConflictDoUpdate({
        target: siteLabels.key,
        set: { value: entry.value, emphasis: entry.emphasis, updatedAt: now, updatedBy },
      });
  }

  invalidateLabelCache();
}

/**
 * Escapes a label, writing a non-breaking space back as an entity so headings
 * that rely on one keep it.
 */
function text(value: string): string {
  return escapeHtml(value).replace(/\u00a0/g, "&nbsp;");
}

/**
 * A heading as the templates write it: plain text, then the emphasised span.
 * Plain labels render as text alone.
 */
export function renderLabel(
  labels: ResolvedLabels,
  key: string,
  emphasisClass: string,
): { html: string; hasHtml: boolean } {
  const label = labels.get(key);
  if (!label) return { html: "", hasHtml: false };

  if (!label.emphasis) return { html: text(label.value), hasHtml: false };

  return {
    html: `${text(label.value)} <span class="${emphasisClass}">${text(label.emphasis)}</span>`,
    hasHtml: true,
  };
}
