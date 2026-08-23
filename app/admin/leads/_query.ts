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

/**
 * What the panel calls a form: its name, or its id when it was submitted
 * without one. The filter, the dropdown and the table cell all read this, so a
 * chosen option cannot return a form it did not name.
 */
const FORM_LABEL = sql<string>`coalesce(nullif(${leads.formName}, ''), ${leads.formId})`;

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
  // The label, matching what the dropdown offered. An id is still accepted so
  // links bookmarked before the filter keyed on the label keep working.
  if (filters.form) {
    const byLabel = or(eq(FORM_LABEL, filters.form), eq(leads.formId, filters.form));
    if (byLabel) clauses.push(byLabel);
  }

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
 * Every form that has ever submitted, for the filter dropdown.
 *
 * Grouped by the label rather than the id. Grouping by id collapsed four
 * genuinely different forms into one option -- they all post as
 * `consultationForm` -- and then labelled it with whichever name sorted first.
 */
export async function listFormOptions(db: Db): Promise<{ label: string; total: number }[]> {
  const rows = await db
    .select({ label: FORM_LABEL, total: sql<number>`count(*)` })
    .from(leads)
    .groupBy(FORM_LABEL);

  return rows
    .filter((row) => row.label)
    .map((row) => ({ label: row.label, total: Number(row.total) }))
    .sort((a, b) => a.label.localeCompare(b.label));
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
