// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { and, desc, eq, like, sql, type SQL } from "drizzle-orm";
import { auditLog } from "@/worker/db/schema";
import { AdminShell } from "../_components/AdminShell";
import { AutoSubmitControls } from "../_components/FormControls";
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

const PAGE_SIZE = 60;

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
  settings: { label: "Contact details", icon: "settings", href: () => "/admin/settings" },
  labels: { label: "Section headings", icon: "type", href: () => "/admin/labels" },
  user: { label: "User", icon: "users", href: () => "/admin/users" },
};

/** Deletions and user changes are the ones worth spotting at a glance. */
function toneFor(action: string): "bad" | "ok" | "accent" | "neutral" {
  return auditActionTone(action);
}

function humanAction(action: string): string {
  return humanAuditAction(action);
}

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
  const page = Math.max(1, Number.parseInt(single(params.page) || "1", 10) || 1);

  const user = await requireRole("admin", "/admin/activity", "activity log");
  const db = await requireDb();
  const now = await currentTime();

  const clauses: SQL[] = [];
  if (entity && entity in ENTITIES) clauses.push(eq(auditLog.entity, entity));
  // `%` and `_` are wildcards to SQLite and drizzle adds no ESCAPE clause.
  if (who) clauses.push(like(auditLog.userEmail, `%${who.replace(/[%_]/g, " ").trim()}%`));
  const where = clauses.length === 0 ? undefined : clauses.length === 1 ? clauses[0] : and(...clauses);

  const listQuery = db.select().from(auditLog);
  const countQuery = db.select({ total: sql<number>`count(*)` }).from(auditLog);

  const [rows, totals, actors] = await Promise.all([
    (where ? listQuery.where(where) : listQuery)
      .orderBy(desc(auditLog.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    where ? countQuery.where(where) : countQuery,
    db.selectDistinct({ email: auditLog.userEmail }).from(auditLog).orderBy(auditLog.userEmail),
  ]);

  const total = Number(totals[0]?.total ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(entity || who);

  const href = (next: Record<string, string | number>) => {
    const query = new URLSearchParams();
    const merged = { entity, who, page, ...next };
    if (merged.entity) query.set("entity", String(merged.entity));
    if (merged.who) query.set("who", String(merged.who));
    if (Number(merged.page) > 1) query.set("page", String(merged.page));
    const string = query.toString();
    return `/admin/activity${string ? `?${string}` : ""}`;
  };

  return (
    <AdminShell
      user={user}
      title="Activity log"
      subtitle={`${formatCount(total)} recorded change${total === 1 ? "" : "s"}${filtered ? " matching these filters" : ""}. Every edit made through the panel is kept here.`}
      actions={filtered ? <LinkButton href="/admin/activity" icon="close" variant="ghost">Clear filters</LinkButton> : undefined}
    >
      <Card className="mb-4">
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <AutoSubmitControls selector="select" />
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
            <span className="vw-label">Person</span>
            <input
              name="who"
              defaultValue={who}
              list="activity-actors"
              placeholder="Any email"
              className="vw-input"
            />
            <datalist id="activity-actors">
              {actors.filter((actor) => actor.email).map((actor) => (
                <option key={actor.email} value={actor.email} />
              ))}
            </datalist>
          </label>

          <button type="submit" className="vw-btn vw-btn-secondary">
            <Icon name="filter" size={15} />
            Filter
          </button>
        </form>
      </Card>

      <Card pad={false}>
        <CardHead title="Timeline" hint={`Newest first · page ${page} of ${lastPage}`} icon="activity" />

        {rows.length === 0 ? (
          <EmptyState
            icon="activity"
            title={filtered ? "Nothing matches these filters" : "Nothing recorded yet"}
          >
            {filtered
              ? "Try a different area or person."
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
                  <span
                    className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg"
                    style={{ background: "var(--surface-hover)", color: "var(--ink-faint)" }}
                  >
                    <Icon name={meta?.icon ?? "activity"} size={14} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" style={{ color: "var(--ink)" }}>
                      <Badge tone={toneFor(entry.action)}>{humanAction(entry.action)}</Badge>
                      <span style={{ color: "var(--ink-soft)" }}>{meta?.label ?? entry.entity}</span>
                      {target ? (
                        <Link href={target} className="font-medium hover:underline" style={{ color: "var(--info)" }}>
                          #{entry.entityId}
                        </Link>
                      ) : (
                        <span className="vw-mono" style={{ color: "var(--ink-faint)" }}>
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
    </AdminShell>
  );
}
