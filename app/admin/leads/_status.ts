/**
 * How the panel words each lead status.
 *
 * The selects and the badge used to print the stored value straight out, so the
 * panel said "new" and "spam" in the middle of otherwise sentence-cased UI. The
 * stored values are unchanged -- these are labels only.
 */
import { LEAD_STATUSES, type LeadStatus } from "@/worker/db/schema";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
  spam: "Spam",
};

export function leadStatusLabel(status: string): string {
  return LEAD_STATUS_LABELS[status as LeadStatus] ?? status;
}

/**
 * The quick-filter chips, derived rather than listed.
 *
 * They were a hand-written list that had fallen a status behind: "lost" had no
 * chip, and since the filter bar offers no status dropdown either, submissions
 * marked lost -- a status both selects still offer -- could not be filtered to
 * at all. The chip counts also no longer added up to the "All" total.
 */
export const LEAD_QUICK_FILTERS: { status: LeadStatus | ""; label: string }[] = [
  { status: "", label: "All" },
  ...LEAD_STATUSES.map((status) => ({ status, label: LEAD_STATUS_LABELS[status] })),
];
