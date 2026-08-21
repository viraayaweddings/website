/** Shared filtering for the leads list and its CSV export. */
import { and, asc, desc, eq, gte, like, lte, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/worker/db/client";
import { leads, LEAD_STATUSES, type LeadStatus } from "@/worker/db/schema";

export const PAGE_SIZE = 50;
/** Guard rail: a filterless export should not try to stream the whole table. */
export const EXPORT_LIMIT = 5000;

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

/** Whitelisted so a crafted query string cannot order by an arbitrary column. */
const SORTABLE = {
  received: leads.createdAt,
  name: leads.name,
  form: leads.formName,
  status: leads.status,
} as const;

export type SortKey = keyof typeof SORTABLE;

export const SORT_KEYS = Object.keys(SORTABLE) as SortKey[];

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
    sort: SORT_KEYS.includes(sort) ? sort : "received",
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

function buildWhere(filters: LeadFilters): SQL | undefined {
  const clauses: SQL[] = [];

  if (filters.q) {
    // drizzle's like() binds the pattern as a parameter but adds no ESCAPE
    // clause, so a literal % or _ in the query would act as a wildcard.
    const needle = `%${filters.q.replace(/[%_]/g, " ").trim()}%`;
    const match = or(
      like(leads.name, needle),
      like(leads.email, needle),
      like(leads.phone, needle),
      like(leads.fields, needle),
    );
    if (match) clauses.push(match);
  }

  if (filters.status) clauses.push(eq(leads.status, filters.status));
  if (filters.formId) clauses.push(eq(leads.formId, filters.formId));

  // Dates are entered as IST calendar days; convert to the stored ms instants.
  if (filters.from) clauses.push(gte(leads.createdAt, istDayStart(filters.from)));
  if (filters.to) clauses.push(lte(leads.createdAt, istDayEnd(filters.to)));

  if (!clauses.length) return undefined;
  return clauses.length === 1 ? clauses[0] : and(...clauses);
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istDayStart(day: string): Date {
  return new Date(Date.parse(`${day}T00:00:00Z`) - IST_OFFSET_MS);
}

function istDayEnd(day: string): Date {
  return new Date(Date.parse(`${day}T23:59:59.999Z`) - IST_OFFSET_MS);
}

export async function countLeads(db: Db, filters: LeadFilters): Promise<number> {
  const where = buildWhere(filters);
  const query = db.select({ total: sql<number>`count(*)` }).from(leads);
  const rows = await (where ? query.where(where) : query);
  return Number(rows[0]?.total ?? 0);
}

export async function listLeads(db: Db, filters: LeadFilters, limit = PAGE_SIZE) {
  const where = buildWhere(filters);
  const query = db.select().from(leads);
  const column = SORTABLE[filters.sort];

  return (where ? query.where(where) : query)
    // Ties broken by id so paging cannot show the same row twice.
    .orderBy(filters.dir === "asc" ? asc(column) : desc(column), desc(leads.id))
    .limit(limit)
    .offset((filters.page - 1) * PAGE_SIZE);
}

export async function listAllMatchingLeads(db: Db, filters: LeadFilters) {
  const where = buildWhere(filters);
  const query = db.select().from(leads);

  return (where ? query.where(where) : query).orderBy(desc(leads.createdAt)).limit(EXPORT_LIMIT);
}

/** Distinct forms that have ever submitted, for the filter dropdown. */
export async function listFormOptions(db: Db) {
  return db
    .selectDistinct({ formId: leads.formId, formName: leads.formName })
    .from(leads)
    .orderBy(leads.formName);
}
