/** Shared filtering for the leads list and its CSV export. */
import { and, asc, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/worker/db/client";
import {
  EXPORT_LIMIT,
  PAGE_SIZE,
  filtersToQuery,
  istDayEnd,
  istDayStart,
  parseFilters,
  SORT_KEYS,
  type LeadFilters,
  type SortKey,
} from "@/worker/admin/lead-filters";
import { leads } from "@/worker/db/schema";

// The view itself is plain data, so it lives beside the worker code where it can
// be tested without a bundler. Re-exported here because every caller reaches for
// the list and its filters together.
export {
  EXPORT_LIMIT,
  PAGE_SIZE,
  filtersToQuery,
  parseFilters,
  SORT_KEYS,
  type LeadFilters,
  type SortKey,
};

/** Whitelisted so a crafted query string cannot order by an arbitrary column. */
const SORTABLE = {
  received: leads.createdAt,
  name: leads.name,
  form: leads.formName,
  status: leads.status,
} as const satisfies Record<SortKey, unknown>;

function buildWhere(filters: LeadFilters): SQL | undefined {
  const clauses: SQL[] = [];

  if (filters.q) {
    // ilike(), not ilike(): Postgres LIKE is case-sensitive, so searching
    // "delhi" used to miss every row spelled "Delhi". drizzle binds the pattern
    // as a parameter but adds no ESCAPE clause, so a literal % or _ in the
    // query would still act as a wildcard and is neutralised here.
    const needle = `%${filters.q.replace(/[%_]/g, " ").trim()}%`;
    const match = or(
      ilike(leads.name, needle),
      ilike(leads.email, needle),
      ilike(leads.phone, needle),
      ilike(leads.fields, needle),
    );
    if (match) clauses.push(match);
  }

  if (filters.status) clauses.push(eq(leads.status, filters.status));
  if (filters.formId) clauses.push(eq(leads.formId, filters.formId));

  // Dates are entered as IST calendar days; convert to the stored instants.
  if (filters.from) clauses.push(gte(leads.createdAt, istDayStart(filters.from)));
  if (filters.to) clauses.push(lte(leads.createdAt, istDayEnd(filters.to)));

  if (!clauses.length) return undefined;
  return clauses.length === 1 ? clauses[0] : and(...clauses);
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

/**
 * Distinct forms that have ever submitted, for the filter dropdown.
 *
 * Collapsed to one entry per form id: the same form has been renamed over the
 * years, and a plain DISTINCT over both columns would offer the same id several
 * times under different labels.
 */
export async function listFormOptions(db: Db): Promise<{ formId: string; formName: string }[]> {
  const rows = await db
    .selectDistinct({ formId: leads.formId, formName: leads.formName })
    .from(leads)
    .orderBy(leads.formName);

  const byId = new Map<string, string>();
  for (const row of rows) {
    // The first non-empty name wins, so an id that was once submitted without
    // a label still reads as something.
    if (!byId.get(row.formId)) byId.set(row.formId, row.formName || "");
  }

  return [...byId.entries()]
    .map(([formId, formName]) => ({ formId, formName }))
    .sort((a, b) => (a.formName || a.formId).localeCompare(b.formName || b.formId));
}

/** How many submissions sit in each status, for the quick filter chips. */
export async function countByStatus(db: Db): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: leads.status, total: sql<number>`count(*)` })
    .from(leads)
    .groupBy(leads.status);

  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.status] = Number(row.total);
  return counts;
}
