/**
 * The submissions view, expressed as a query string.
 *
 * Search, status, form, date range, sort and page all live in the URL so a view
 * can be bookmarked, shared, and handed to the bulk actions and the CSV export
 * unchanged. Parsing and serialising are a matched pair -- a filter that
 * survives one but not the other silently widens the export -- so they sit
 * together here, free of any database or framework import, and are covered by
 * tests/lead-filters.test.mjs.
 */
// Extension-qualified so node can load this module directly for the tests; the
// rest of the worker is only ever resolved by Vite, which needs no help.
import { LEAD_STATUSES, type LeadStatus } from "../db/schema.ts";

export const PAGE_SIZE = 50;
/** Guard rail: a filterless export should not try to stream the whole table. */
export const EXPORT_LIMIT = 5000;

/** Columns the list may order by. Whitelisted so a crafted query string cannot
 *  order by an arbitrary column. */
export const SORT_KEYS = ["received", "name", "form", "status"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface LeadFilters {
  q: string;
  status: LeadStatus | "";
  formId: string;
  from: string;
  to: string;
  page: number;
  sort: SortKey;
  dir: "asc" | "desc";
}

type RawParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() || "";
}

export function parseFilters(params: RawParams): LeadFilters {
  const status = single(params.status);
  const page = Number.parseInt(single(params.page) || "1", 10);
  const sort = single(params.sort) as SortKey;
  const dir = single(params.dir);

  return {
    sort: (SORT_KEYS as readonly string[]).includes(sort) ? sort : "received",
    dir: dir === "asc" ? "asc" : "desc",
    q: single(params.q).slice(0, 120),
    status: (LEAD_STATUSES as readonly string[]).includes(status) ? (status as LeadStatus) : "",
    formId: single(params.form).slice(0, 120),
    from: /^\d{4}-\d{2}-\d{2}$/.test(single(params.from)) ? single(params.from) : "",
    to: /^\d{4}-\d{2}-\d{2}$/.test(single(params.to)) ? single(params.to) : "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Serialises filters back into a query string, dropping empties. */
export function filtersToQuery(filters: LeadFilters, overrides: Partial<LeadFilters> = {}): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (merged.q) params.set("q", merged.q);
  if (merged.status) params.set("status", merged.status);
  if (merged.formId) params.set("form", merged.formId);
  if (merged.from) params.set("from", merged.from);
  if (merged.to) params.set("to", merged.to);
  if (merged.page > 1) params.set("page", String(merged.page));
  if (merged.sort !== "received") params.set("sort", merged.sort);
  if (merged.dir !== "desc") params.set("dir", merged.dir);

  return params.toString();
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Dates are entered as IST calendar days; these are the instants they cover. */
export function istDayStart(day: string): Date {
  return new Date(Date.parse(`${day}T00:00:00Z`) - IST_OFFSET_MS);
}

export function istDayEnd(day: string): Date {
  return new Date(Date.parse(`${day}T23:59:59.999Z`) - IST_OFFSET_MS);
}
