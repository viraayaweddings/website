// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { LEAD_STATUSES } from "@/worker/db/schema";
import { AdminShell } from "../_components/AdminShell";
import { BulkSelection, RowCheckbox } from "../_components/BulkBar";
import { DeleteConfirmTrigger } from "../_components/DeleteConfirmTrigger";
import { AutoSubmitControls, LiveSearch, SubmitButton } from "../_components/FormControls";
import { Icon } from "../_components/icons";
import {
  Card,
  EmptyState,
  LinkButton,
  StatusBadge,
  Alert,
  formatCount,
  formatRelative,
} from "../_components/ui";
import { currentTime } from "../_lib/clock";
import { isAdmin, requireDb, requireUser } from "../_lib/auth";
import { bulkDeleteAction, bulkStatusAction, deleteLeadAction } from "./actions";
import {
  PAGE_SIZE,
  EXPORT_LIMIT,
  countLeads,
  filtersToQuery,
  listFormOptions,
  listLeads,
  parseFilters,
  type LeadFilters,
  type SortKey,
} from "./_query";

const QUICK_FILTERS = [
  { status: "", label: "All" },
  { status: "new", label: "New" },
  { status: "contacted", label: "Contacted" },
  { status: "qualified", label: "Qualified" },
  { status: "won", label: "Won" },
  { status: "spam", label: "Spam" },
] as const;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const user = await requireUser(`/admin/leads?${filtersToQuery(filters)}`);
  const db = await requireDb();
  const now = await currentTime();

  const [rows, total, formOptions] = await Promise.all([
    listLeads(db, filters),
    countLeads(db, filters),
    listFormOptions(db),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const listHref = href(filters);
  const exportQuery = filtersToQuery(filters, { page: 1 });
  const filtered = Boolean(filters.q || filters.status || filters.formId || filters.from || filters.to);

  return (
    <AdminShell
      user={user}
      title="Submissions"
      subtitle={`${formatCount(total)} enquir${total === 1 ? "y" : "ies"}${filtered ? " matching these filters" : " received in total"}.`}
      actions={
        <LinkButton href={`/admin/leads/export${exportQuery ? `?${exportQuery}` : ""}`} icon="download" variant="secondary">
          Export CSV
        </LinkButton>
      }
    >
      {total > EXPORT_LIMIT ? (
        <div className="mb-4">
          <Alert tone="warning" title={`Exports are limited to ${formatCount(EXPORT_LIMIT)} rows`}>
            {formatCount(total)} submissions match these filters. Narrow the date range or add filters before
            exporting, or the CSV will include a warning and only the first {formatCount(EXPORT_LIMIT)} rows.
          </Alert>
        </div>
      ) : null}


      {/* Filters live in the URL so a view can be bookmarked or shared. */}
      <Card className="mb-4">
        <form method="get" className="space-y-3">
          <AutoSubmitControls />
          <input type="hidden" name="sort" value={filters.sort} />
          <input type="hidden" name="dir" value={filters.dir} />

          <div className="flex flex-wrap items-center gap-1.5">
            {QUICK_FILTERS.map((quick) => (
              <Link
                key={quick.label}
                href={href({ ...filters, status: quick.status as LeadFilters["status"], page: 1 })}
                className="vw-chip"
                data-on={filters.status === quick.status}
              >
                {quick.label}
              </Link>
            ))}
            {filtered ? (
              <Link href="/admin/leads" className="vw-btn vw-btn-ghost vw-btn-sm ml-auto">
                <Icon name="close" size={13} />
                Reset filters
              </Link>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="vw-label" htmlFor="lead-q">
                Search
              </label>
              <span id="lead-q">
                <LiveSearch name="q" defaultValue={filters.q} placeholder="Name, email, phone or any answer" />
              </span>
            </div>

            <label className="block">
              <span className="vw-label">Form</span>
              <select name="form" defaultValue={filters.formId} className="vw-select">
                <option value="">Every form</option>
                {formOptions.map((option) => (
                  <option key={option.formId} value={option.formId}>
                    {option.formName || option.formId || "(unnamed)"}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="vw-label">From</span>
              <input type="date" name="from" defaultValue={filters.from} className="vw-input" />
            </label>

            <label className="block">
              <span className="vw-label">To</span>
              <input type="date" name="to" defaultValue={filters.to} className="vw-input" />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button type="submit" className="vw-btn vw-btn-secondary vw-btn-sm">
              <Icon name="filter" size={13} />
              Apply
            </button>
            <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
              Search applies as you type.
            </span>
          </div>
        </form>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title={filtered ? "Nothing matches these filters" : "No submissions yet"}
            action={filtered ? <LinkButton href="/admin/leads" variant="secondary">Clear filters</LinkButton> : undefined}
          >
            {filtered
              ? "Try a wider date range, or clear the filters to see everything."
              : "Enquiries from any form on the site appear here the moment they are sent."}
          </EmptyState>
        </Card>
      ) : (
        <form>
          <input type="hidden" name="returnTo" value={listHref} />

          <BulkSelection noun="submission">
            <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--ink-soft)" }}>
              Mark as
              <select name="bulkStatus" defaultValue="contacted" className="vw-select vw-btn-sm py-1" aria-label="Status to apply">
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <SubmitButton variant="secondary" size="sm" icon="check" pendingLabel="Applying…" formAction={bulkStatusAction}>
              Apply
            </SubmitButton>
            {isAdmin(user) ? (
              <SubmitButton
                variant="danger-quiet"
                size="sm"
                icon="trash"
                pendingLabel="Deleting…"
                formAction={bulkDeleteAction}
                confirm="Delete every selected submission? This cannot be undone."
              >
                Delete
              </SubmitButton>
            ) : null}
          </BulkSelection>

          <div className="vw-table-wrap">
            <table className="vw-table">
              <thead>
                <tr>
                  <th style={{ width: "2.25rem" }}>
                    <span className="sr-only">Select</span>
                  </th>
                  <SortHeader label="Received" column="received" filters={filters} />
                  <SortHeader label="Name" column="name" filters={filters} />
                  <th>Contact</th>
                  <SortHeader label="Form" column="form" filters={filters} />
                  <SortHeader label="Status" column="status" filters={filters} />
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <RowCheckbox id={lead.id} label={lead.name || `submission ${lead.id}`} />
                    </td>
                    <td className="whitespace-nowrap" style={{ color: "var(--ink-soft)" }}>
                      <span title={lead.createdAt.toISOString()}>{formatRelative(lead.createdAt, now)}</span>
                    </td>
                    <td>
                      <Link href={`/admin/leads/${lead.id}`} className="font-medium hover:underline" style={{ color: "var(--ink)" }}>
                        {lead.name || `Submission #${lead.id}`}
                      </Link>
                    </td>
                    <td style={{ color: "var(--ink-soft)" }}>
                      {lead.phone ? <div className="whitespace-nowrap">{lead.phone}</div> : null}
                      {lead.email ? <div className="max-w-[14rem] truncate">{lead.email}</div> : null}
                      {!lead.phone && !lead.email ? "—" : null}
                    </td>
                    <td className="max-w-[12rem] truncate" style={{ color: "var(--ink-soft)" }}>
                      {lead.formName || lead.formId || "—"}
                    </td>
                    <td>
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1">
                        <LinkButton href={`/admin/leads/${lead.id}`} size="sm" variant="secondary" icon="eye">
                          Open
                        </LinkButton>
                        {isAdmin(user) ? (
                          <DeleteConfirmTrigger
                            action={deleteLeadAction}
                            id={lead.id}
                            what={`the submission from ${lead.name || lead.email || "this visitor"}`}
                            note="This removes the enquiry permanently. Mark it as spam instead if you may need it later."
                            ariaLabel={`Delete submission from ${lead.name || lead.email || "this visitor"}`}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>
      )}

      {lastPage > 1 ? (
        <nav className="mt-4 flex items-center justify-between gap-3 text-sm" aria-label="Pages">
          <span style={{ color: "var(--ink-faint)" }}>
            Page {filters.page} of {lastPage}
          </span>
          <div className="flex gap-2">
            {filters.page > 1 ? (
              <LinkButton href={href({ ...filters, page: filters.page - 1 })} size="sm" icon="chevronLeft">
                Previous
              </LinkButton>
            ) : null}
            {filters.page < lastPage ? (
              <LinkButton href={href({ ...filters, page: filters.page + 1 })} size="sm">
                Next
              </LinkButton>
            ) : null}
          </div>
        </nav>
      ) : null}
    </AdminShell>
  );
}

function href(filters: LeadFilters, overrides: Partial<LeadFilters> = {}): string {
  const query = filtersToQuery(filters, overrides);
  return `/admin/leads${query ? `?${query}` : ""}`;
}

/** A column heading that toggles between ascending and descending. */
function SortHeader({
  label,
  column,
  filters,
}: {
  label: string;
  column: SortKey;
  filters: LeadFilters;
}) {
  const on = filters.sort === column;
  const dir = on && filters.dir === "asc" ? "desc" : "asc";

  return (
    <th>
      <Link href={href(filters, { sort: column, dir, page: 1 })} className="vw-sort" data-on={on}>
        {label}
        {on ? <Icon name={filters.dir === "asc" ? "arrowUp" : "arrowDown"} size={12} /> : null}
      </Link>
    </th>
  );
}
