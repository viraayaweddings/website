// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { and, desc, eq, gte, like, lte, or, sql, type SQL } from "drizzle-orm";
import { auditLog } from "@/worker/db/schema";
import { istDayEnd, istDayStart } from "@/worker/admin/lead-filters";
import { AdminShell } from "../_components/AdminShell";
import { BulkSelection, RowCheckbox } from "../_components/BulkBar";
import { AutoSubmitControls, LiveSearch, SubmitButton } from "../_components/FormControls";
import { Icon, type IconName } from "../_components/icons";
import {
  Badge,
  Card,
  CardHead,
  EmptyState,
  LinkButton,
  formatDateTime,
  formatRelative,
  formatCount,
} from "../_components/ui";
import { currentTime } from "../_lib/clock";
import { requireDb, requireRole } from "../_lib/auth";
import { auditActionTone, humanAuditAction } from "../_lib/audit-labels";
import { bulkDeleteActivityAction, PRUNE_DAYS, pruneActivityAction } from "./actions";

const PAGE_SIZE = 60;
const ACTIVITY_BULK_FORM = "activity-bulk-form";

/**
 * How each entity type reads, and where its record lives. Anything not listed
 * still shows, just without an icon or a link — a new action type should not
 * disappear from the log because this map has not caught up.
 */
const ENTITIES: Record<string, { label: string; icon: IconName; href?: (id: string) => string }> = {
  lead: { label: "Submission", icon: "inbox", href: (id) => `/admin/leads/${id}` },
  blog_post: { label: "Article", icon: "article", href: (id) => `/admin/blogs/${id}` },
  hotel: { label: "Venue", icon: "venue", href: (id) => `/admin/hotels/${id}` },
  city_page: { label: "City page", icon: "city", href: (id) => `/admin/cities/${id}` },
  blog_listing: { label: "Category or tag", icon: "article" },
  hero_slide: { label: "Hero slide", icon: "slides", href: () => "/admin/hero" },
  media: { label: "Image", icon: "image", href: () => "/admin/media" },
  static_page: { label: "Page", icon: "grid", href: (id) => `/admin/pages/${encodeURIComponent(id)}` },
  settings: { label: "Contact details", icon: "settings", href: () => "/admin/settings" },
  labels: { label: "Section headings", icon: "type", href: () => "/admin/labels" },
  user: { label: "User", icon: "users", href: () => "/admin/users" },
  calculator: { label: "Calculator", icon: "grid", href: () => "/admin/calculator" },
  calculator_city: { label: "Calculator city", icon: "city", href: () => "/admin/calculator" },
  calculator_hotel: {
    label: "Calculator hotel",
    icon: "bed",
    href: (id) => (/^\d+$/.test(id) ? `/admin/calculator/hotels/${id}` : "/admin/calculator/hotels"),
  },
  calculator_currency: { label: "Currency", icon: "grid", href: () => "/admin/calculator" },
  activity: { label: "Activity log", icon: "activity" },
};

/** Renders the stored JSON detail as a short, readable summary. */
function summarise(detail: string): string {
  try {
    const parsed = JSON.parse(detail);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "";

    return Object.entries(parsed as Record<string, unknown>)
      .map(([key, value]) => {
        if (value && typeof value === "object" && "from" in value && "to" in value) {
          const change = value as { from: unknown; to: unknown };
          return `${key}: ${String(change.from)} → ${String(change.to)}`;
        }
        return `${key}: ${String(value)}`;
      })
      .join(" · ")
      .slice(0, 180);
  } catch {
    return "";
  }
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const single = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value)?.trim() || "";

  const entity = single(params.entity).slice(0, 40);
  const who = single(params.who).slice(0, 120);
  const query = single(params.q).slice(0, 120);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(single(params.from)) ? single(params.from) : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(single(params.to)) ? single(params.to) : "";
  const requestedPage = Math.max(1, Number.parseInt(single(params.page) || "1", 10) || 1);

  const user = await requireRole("admin", "/admin/activity", "activity log");
  const db = await requireDb();
  const now = await currentTime();

  const clauses: SQL[] = [];
  if (entity && entity in ENTITIES) clauses.push(eq(auditLog.entity, entity));
  // `%` and `_` are wildcards to Postgres and drizzle adds no ESCAPE clause.
  const escape = (value: string) => value.replace(/[%_]/g, " ").trim();
  if (who) clauses.push(like(auditLog.userEmail, `%${escape(who)}%`));
  const action = single(params.action).slice(0, 60);
  if (action) clauses.push(eq(auditLog.action, action));
  if (query) {
    const needle = `%${escape(query)}%`;
    const match = or(
      like(auditLog.action, needle),
      like(auditLog.entityId, needle),
      like(auditLog.detail, needle),
      like(auditLog.userEmail, needle),
    );
    if (match) clauses.push(match);
  }
  if (from) clauses.push(gte(auditLog.createdAt, istDayStart(from)));
  if (to) clauses.push(lte(auditLog.createdAt, istDayEnd(to)));
  const where = clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : and(...clauses);

  const countQuery = db.select({ total: sql<number>`count(*)` }).from(auditLog);

  const [totals, actors, actions] = await Promise.all([
    where ? countQuery.where(where) : countQuery,
    db.selectDistinct({ email: auditLog.userEmail }).from(auditLog).orderBy(auditLog.userEmail),
    db.selectDistinct({ action: auditLog.action }).from(auditLog).orderBy(auditLog.action),
  ]);

  const total = Number(totals[0]?.total ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Clamped, so a stale bookmark shows the last page rather than an empty list
  // under a "page 9 of 3" heading.
  const page = Math.min(requestedPage, lastPage);

  const listQuery = db.select().from(auditLog);
  const rows = await (where ? listQuery.where(where) : listQuery)
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const filtered = Boolean(entity || who || query || action || from || to);

  const href = (next: Record<string, string | number>) => {
    const search = new URLSearchParams();
    const merged = { entity, who, q: query, action, from, to, page, ...next };
    if (merged.entity) search.set("entity", String(merged.entity));
    if (merged.who) search.set("who", String(merged.who));
    if (merged.q) search.set("q", String(merged.q));
    if (merged.action) search.set("action", String(merged.action));
    if (merged.from) search.set("from", String(merged.from));
    if (merged.to) search.set("to", String(merged.to));
    if (Number(merged.page) > 1) search.set("page", String(merged.page));
    const string = search.toString();
    return `/admin/activity${string ? `?${string}` : ""}`;
  };

  const listHref = href({});

  return (
    <AdminShell
      user={user}
      title="Activity log"
      subtitle={`${formatCount(total)} recorded change${total === 1 ? "" : "s"}${filtered ? " matching these filters" : ""}. Every edit made through the panel is kept here.`}
      actions={
        filtered ? (
          <LinkButton href="/admin/activity" icon="close" variant="ghost">
            Clear filters
          </LinkButton>
        ) : undefined
      }
    >
      <Card className="mb-4">
        <form method="get" className="space-y-3">
          {/* Only the dropdowns and dates auto-submit; the search box has its
              own debounce and would otherwise submit twice. */}
          <AutoSubmitControls selector="select,input[type='date']" />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <span className="vw-label">Search</span>
              <LiveSearch
                name="q"
                defaultValue={query}
                placeholder="Action, record, email or detail"
                label="Search the activity log"
              />
            </div>

            <label className="block">
              <span className="vw-label">Area</span>
              <select name="entity" defaultValue={entity} className="vw-select">
                <option value="">Everything</option>
                {Object.entries(ENTITIES).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="vw-label">What happened</span>
              <select name="action" defaultValue={action} className="vw-select">
                <option value="">Any change</option>
                {actions
                  .filter((row) => row.action)
                  .map((row) => (
                    <option key={row.action} value={row.action}>
                      {humanAuditAction(row.action)}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block">
              <span className="vw-label">Person</span>
              <input
                name="who"
                defaultValue={who}
                list="activity-actors"
                placeholder="Any email"
                className="vw-input"
              />
              <datalist id="activity-actors">
                {actors
                  .filter((actor) => actor.email)
                  .map((actor) => (
                    <option key={actor.email} value={actor.email} />
                  ))}
              </datalist>
            </label>

            <label className="block">
              <span className="vw-label">From</span>
              <input type="date" name="from" defaultValue={from} className="vw-input" />
            </label>

            <label className="block">
              <span className="vw-label">To</span>
              <input type="date" name="to" defaultValue={to} className="vw-input" />
            </label>

            <div className="flex items-end">
              <button type="submit" className="vw-btn vw-btn-secondary">
                <Icon name="filter" size={15} />
                Filter
              </button>
            </div>
          </div>
        </form>
      </Card>

      {rows.length > 0 ? (
        <form id={ACTIVITY_BULK_FORM}>
          <input type="hidden" name="returnTo" value={listHref} />
          <BulkSelection noun="entry" formId={ACTIVITY_BULK_FORM}>
            <SubmitButton
              variant="danger-quiet"
              size="sm"
              icon="trash"
              pendingLabel="Deleting…"
              formAction={bulkDeleteActivityAction}
              confirm="Delete every selected entry? The deletion itself is recorded, so the gap will be accounted for."
            >
              Delete
            </SubmitButton>
          </BulkSelection>
        </form>
      ) : null}

      <Card pad={false}>
        <CardHead title="Timeline" hint={`Newest first · page ${page} of ${lastPage}`} icon="activity" />

        {rows.length === 0 ? (
          <EmptyState icon="activity" title={filtered ? "Nothing matches these filters" : "Nothing recorded yet"}>
            {filtered
              ? "Try a wider date range, a different area, or clear the filters."
              : "Changes made through the panel are written here as they happen."}
          </EmptyState>
        ) : (
          <ul className="vw-divide">
            {rows.map((entry) => {
              const meta = ENTITIES[entry.entity];
              const detail = summarise(entry.detail);
              const target = meta?.href?.(entry.entityId);

              return (
                <li key={entry.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                  <span className="mt-1 flex-none">
                    <RowCheckbox
                      id={entry.id}
                      label={`${humanAuditAction(entry.action)} on ${formatDateTime(entry.createdAt)}`}
                      form={ACTIVITY_BULK_FORM}
                    />
                  </span>

                  <span
                    className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg"
                    style={{ background: "var(--surface-hover)", color: "var(--ink-faint)" }}
                  >
                    <Icon name={meta?.icon ?? "activity"} size={14} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" style={{ color: "var(--ink)" }}>
                      <Badge tone={auditActionTone(entry.action)}>{humanAuditAction(entry.action)}</Badge>
                      <span style={{ color: "var(--ink-soft)" }}>{meta?.label ?? entry.entity}</span>
                      {target ? (
                        <Link href={target} className="font-medium hover:underline" style={{ color: "var(--info)" }}>
                          {entry.entityId}
                        </Link>
                      ) : (
                        <span className="vw-mono truncate" style={{ color: "var(--ink-faint)" }}>
                          {entry.entityId}
                        </span>
                      )}
                    </p>
                    {detail ? (
                      <p className="mt-0.5 truncate text-xs" style={{ color: "var(--ink-faint)" }}>
                        {detail}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-right text-xs" style={{ color: "var(--ink-faint)" }}>
                    <p className="font-medium" style={{ color: "var(--ink-soft)" }}>
                      {entry.userEmail || "system"}
                    </p>
                    <p title={formatDateTime(entry.createdAt)}>{formatRelative(entry.createdAt, now)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {lastPage > 1 ? (
        <nav className="mt-4 flex items-center justify-between gap-3 text-sm" aria-label="Pages">
          <span style={{ color: "var(--ink-faint)" }}>
            Page {page} of {lastPage}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <LinkButton href={href({ page: page - 1 })} size="sm" icon="chevronLeft">
                Previous
              </LinkButton>
            ) : null}
            {page < lastPage ? (
              <LinkButton href={href({ page: page + 1 })} size="sm">
                Next
              </LinkButton>
            ) : null}
          </div>
        </nav>
      ) : null}

      <Card className="mt-4" pad={false}>
        <CardHead title="Keep the log to a workable size" icon="trash" hint="Removals are themselves recorded" />
        <form action={pruneActivityAction} className="vw-card-pad flex flex-wrap items-end gap-3">
          <input type="hidden" name="returnTo" value="/admin/activity" />
          <label className="block">
            <span className="vw-label">Remove entries older than</span>
            <select name="days" defaultValue="365" className="vw-select">
              {PRUNE_DAYS.map((days) => (
                <option key={days} value={days}>
                  {days} days
                </option>
              ))}
            </select>
          </label>
          <SubmitButton
            variant="danger-quiet"
            icon="trash"
            pendingLabel="Removing…"
            confirm="Remove every entry older than the chosen window? This cannot be undone."
          >
            Remove old entries
          </SubmitButton>
          <p className="vw-hint mb-0 flex-1 min-w-[14rem]">
            Nothing recent is touched, and the removal is written to the log, so a gap always has an entry beside
            it saying who made it.
          </p>
        </form>
      </Card>
    </AdminShell>
  );
}
