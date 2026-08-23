// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { desc, gte, sql } from "drizzle-orm";
import type { Db } from "@/worker/db/client";
import { blogPosts, cityPages, heroSlides, hotels, leads, media } from "@/worker/db/schema";
import { AdminShell } from "./_components/AdminShell";
import { BarChart, BreakdownBars, Sparkline } from "./_components/Charts";
import { Icon, type IconName } from "./_components/icons";
import {
  Alert,
  Badge,
  Card,
  CardHead,
  EmptyState,
  LinkButton,
  StatusBadge,
  formatCount,
  formatRelative,
} from "./_components/ui";
import { currentTime } from "./_lib/clock";
import { isAdmin, requireDb, requireUser } from "./_lib/auth";
import { adminDatabaseMessage, logDatabaseError } from "./_lib/db-errors";

const WINDOW_DAYS = 14;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** The IST calendar day an instant falls on, as YYYY-MM-DD. */
function istDay(ms: number): string {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function dayLabel(day: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

/** Kept out of the component body: reading the clock during render is impure. */
async function loadDashboard(db: Db, now: number) {
  const windowStart = new Date(now - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // Five round trips, not thirteen.
  //
  // The Promise.all looked parallel, but the pool is one connection per
  // instance, so postgres.js queued them and the page waited for the sum. The
  // seven content counts are now one query with FILTER clauses, the three lead
  // counts another, and the fourteen-day chart is bucketed by Postgres instead
  // of by pulling every row from the window into memory.
  const [leadTotals, byStatus, recent, topForms, dayBuckets, contentRow] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)`,
        // `gte()` rather than `${leads.createdAt} >= ${weekStart}`.
        //
        // A value interpolated into a raw sql fragment is bound with no type
        // information, so the Date reached postgres.js as a Date object and it
        // threw ERR_INVALID_ARG_TYPE -- "the string argument must be of type
        // string or an instance of Buffer". Going through the operator applies
        // the column's own mapToDriverValue, which binds the ISO string the
        // driver expects. The .where(gte(...)) calls below were always doing
        // this; only the FILTER clauses bypassed it.
        lastWeek: sql<number>`count(*) filter (where ${gte(leads.createdAt, weekStart)})`,
        unsent: sql<number>`count(*) filter (where ${leads.emailSent} = 0)`,
      })
      .from(leads),
    db.select({ status: leads.status, total: sql<number>`count(*)` }).from(leads).groupBy(leads.status),
    db.select().from(leads).orderBy(desc(leads.createdAt)).limit(8),
    db
      .select({ formName: leads.formName, formId: leads.formId, total: sql<number>`count(*)` })
      .from(leads)
      .where(gte(leads.createdAt, weekStart))
      .groupBy(leads.formName, leads.formId)
      .orderBy(desc(sql`count(*)`))
      .limit(5),
    // The day boundary is IST, so the timestamp is shifted before it is
    // truncated rather than threading an offset through every comparison.
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${leads.createdAt} at time zone 'Asia/Kolkata'), 'YYYY-MM-DD')`,
        total: sql<number>`count(*)`,
      })
      .from(leads)
      .where(gte(leads.createdAt, windowStart))
      .groupBy(sql`1`),
    db
      .select({
        venues: sql<number>`(select count(*) from ${hotels})`,
        venueDrafts: sql<number>`(select count(*) from ${hotels} where ${hotels.status} = 'draft')`,
        posts: sql<number>`(select count(*) from ${blogPosts})`,
        postDrafts: sql<number>`(select count(*) from ${blogPosts} where ${blogPosts.status} = 'draft')`,
        cities: sql<number>`(select count(*) from ${cityPages})`,
        liveSlides: sql<number>`(select count(*) from ${heroSlides} where ${heroSlides.published} = 1)`,
        images: sql<number>`(select count(*) from ${media})`,
      })
      .from(sql`(select 1) as one`),
  ]);

  // Every day in the window is present even when it has no submissions, so the
  // chart keeps a fixed width; the query only returns the days that do.
  const counts = new Map<string, number>();
  for (let index = WINDOW_DAYS - 1; index >= 0; index -= 1) {
    counts.set(istDay(now - index * 24 * 60 * 60 * 1000), 0);
  }
  for (const row of dayBuckets) {
    if (counts.has(row.day)) counts.set(row.day, Number(row.total));
  }



  // count(*) arrives as a string from the driver, so every figure is coerced.
  const totals = leadTotals[0];
  const content = contentRow[0];

  return {
    totals: {
      total: Number(totals?.total ?? 0),
      lastWeek: Number(totals?.lastWeek ?? 0),
      unsent: Number(totals?.unsent ?? 0),
    },
    byStatus,
    recent,
    topForms,
    daily: [...counts.entries()].map(([day, value]) => ({ label: dayLabel(day), value })),
    content: {
      venues: Number(content?.venues ?? 0),
      venueDrafts: Number(content?.venueDrafts ?? 0),
      posts: Number(content?.posts ?? 0),
      postDrafts: Number(content?.postDrafts ?? 0),
      cities: Number(content?.cities ?? 0),
      liveSlides: Number(content?.liveSlides ?? 0),
      images: Number(content?.images ?? 0),
    },
  };
}

function Stat({
  label,
  value,
  hint,
  href,
  icon,
  trend,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  href?: string;
  icon: IconName;
  trend?: number[];
  tone?: string;
}) {
  const body = (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="vw-eyebrow">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums" style={{ color: "var(--ink)" }}>
            {formatCount(value)}
          </p>
        </div>
        <span
          className="grid h-8 w-8 flex-none place-items-center rounded-lg"
          style={{ background: tone ? `color-mix(in srgb, ${tone} 12%, transparent)` : "var(--surface-hover)", color: tone ?? "var(--ink-faint)" }}
        >
          <Icon name={icon} size={16} />
        </span>
      </div>
      {trend && trend.length > 1 ? (
        <div className="mt-2.5">
          <Sparkline points={trend} tone={tone ?? "var(--accent)"} />
        </div>
      ) : null}
      {hint ? (
        <p className="mt-2 text-xs" style={{ color: "var(--ink-faint)" }}>
          {hint}
        </p>
      ) : null}
    </Card>
  );

  return href ? (
    <Link href={href} className="block transition hover:-translate-y-px">
      {body}
    </Link>
  ) : (
    body
  );
}

const STATUS_TONES: Record<string, string> = {
  new: "var(--info)",
  contacted: "var(--warn)",
  qualified: "var(--accent)",
  won: "var(--ok)",
  lost: "var(--ink-faint)",
  spam: "var(--bad)",
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; section?: string }>;
}) {
  const user = await requireUser("/admin");
  const db = await requireDb();
  const params = await searchParams;
  const denied = params.denied === "1";
  const deniedSection = params.section?.replace(/-/g, " ");
  const now = await currentTime();

  let totals;
  let byStatus;
  let recent;
  let topForms;
  let daily;
  let content;
  try {
    ({ totals, byStatus, recent, topForms, daily, content } = await loadDashboard(db, now));
  } catch (error) {
    // `error.message` here is drizzle's wrapper: the whole SQL statement and
    // its bound parameters, which on this page are dates and on others are
    // lead addresses and search terms. The reason lives on `cause`, and used
    // to be dropped -- so the panel printed the query and hid the fault.
    logDatabaseError("dashboard", error);
    return (
      <AdminShell user={user} title="Dashboard" subtitle="Could not load dashboard data.">
        <Alert tone="error" title="The dashboard could not be loaded">
          {adminDatabaseMessage(error, isAdmin(user))}
        </Alert>
      </AdminShell>
    );
  }

  const total = Number(totals?.total ?? 0);
  const lastWeek = Number(totals?.lastWeek ?? 0);
  const unsent = Number(totals?.unsent ?? 0);
  const newCount = Number(byStatus.find((row) => row.status === "new")?.total ?? 0);
  const won = Number(byStatus.find((row) => row.status === "won")?.total ?? 0);
  const trend = daily.map((point) => point.value);
  const busiest = Math.max(...trend, 0);

  return (
    <AdminShell
      user={user}
      title={`Good ${partOfDay(now)}, ${(user.name || "there").split(" ")[0]}`}
      subtitle={
        total === 0
          ? "Nothing has come in yet. Everything below fills in as the site receives enquiries."
          : `${formatCount(lastWeek)} enquir${lastWeek === 1 ? "y" : "ies"} in the last seven days, ${formatCount(newCount)} still awaiting a reply.`
      }
      actions={
        <>
          <LinkButton href="/admin/leads" icon="inbox" variant="secondary">
            Submissions
          </LinkButton>
          <LinkButton href="/admin/blogs/new" icon="plus" variant="primary">
            New article
          </LinkButton>
        </>
      }
    >
      {denied ? (
        <div className="mb-4">
          <Alert tone="warning" title="Restricted area">
            {deniedSection
              ? `The ${deniedSection} section is limited to admin accounts. Ask an admin if you need access.`
              : "That section is limited to admin accounts. Ask an admin if you need access."}
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Total enquiries"
          value={total}
          href="/admin/leads"
          icon="inbox"
          trend={trend}
          hint={`${formatCount(lastWeek)} in the last 7 days`}
        />
        <Stat
          label="Awaiting reply"
          value={newCount}
          href="/admin/leads?status=new"
          icon="warning"
          tone={newCount > 0 ? "var(--warn)" : undefined}
          hint={newCount > 0 ? "Oldest first on the submissions screen" : "Everything has been picked up"}
        />
        <Stat
          label="Won"
          value={won}
          href="/admin/leads?status=won"
          icon="check"
          tone="var(--ok)"
          hint={total > 0 ? `${Math.round((won / total) * 100)}% of all enquiries` : undefined}
        />
        <Stat
          label="Email not delivered"
          value={unsent}
          icon="mail"
          tone={unsent > 0 ? "var(--bad)" : undefined}
          hint={unsent > 0 ? "The enquiry is saved; only the alert failed" : "Every notification went out"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" pad={false}>
          <CardHead
            title={`Enquiries, last ${WINDOW_DAYS} days`}
            hint={busiest > 0 ? `Busiest day had ${busiest}` : "No enquiries in this window"}
            icon="activity"
          />
          <div className="vw-card-pad">
            <BarChart points={daily} title={`Enquiries per day over the last ${WINDOW_DAYS} days`} />
          </div>
        </Card>

        <Card pad={false}>
          <CardHead title="By status" icon="filter" />
          <div className="vw-card-pad">
            <BreakdownBars
              points={byStatus.map((row) => ({ label: row.status, value: Number(row.total) }))}
              tones={STATUS_TONES}
            />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" pad={false}>
          <CardHead title="Latest submissions" icon="inbox">
            <LinkButton href="/admin/leads" size="sm" variant="ghost">
              View all
            </LinkButton>
          </CardHead>
          {recent.length === 0 ? (
            <EmptyState title="No submissions yet">
              Enquiries from any form on the site land here the moment they are sent.
            </EmptyState>
          ) : (
            <ul className="vw-divide">
              {recent.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 transition"
                    style={{ color: "var(--ink)" }}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {lead.name || lead.email || `Submission #${lead.id}`}
                    </span>
                    <StatusBadge status={lead.status} />
                    <span className="hidden truncate text-xs sm:block" style={{ color: "var(--ink-faint)", maxWidth: "11rem" }}>
                      {lead.formName || lead.formId}
                    </span>
                    <span className="whitespace-nowrap text-xs tabular-nums" style={{ color: "var(--ink-faint)" }}>
                      {formatRelative(lead.createdAt, now)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card pad={false}>
            <CardHead title="Content" icon="grid" />
            <ul className="vw-divide text-sm">
              <ContentRow href="/admin/hotels" icon="venue" label="Venues" value={content.venues} drafts={content.venueDrafts} />
              <ContentRow href="/admin/blogs" icon="article" label="Articles" value={content.posts} drafts={content.postDrafts} />
              {isAdmin(user) ? (
                <ContentRow href="/admin/cities" icon="city" label="City pages" value={content.cities} />
              ) : null}
              <ContentRow href="/admin/hero" icon="slides" label="Live hero slides" value={content.liveSlides} />
              <ContentRow href="/admin/media" icon="image" label="Uploaded images" value={content.images} />
            </ul>
          </Card>

          <Card pad={false}>
            <CardHead title="Busiest forms" hint="Last 7 days" icon="filter" />
            {topForms.length === 0 ? (
              <EmptyState icon="filter" title="Quiet week">
                No form has been submitted in the last seven days.
              </EmptyState>
            ) : (
              <div className="vw-card-pad">
                <BreakdownBars
                  points={topForms.map((form) => ({
                    label: form.formName || form.formId || "(unnamed)",
                    value: Number(form.total),
                  }))}
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}

function ContentRow({
  href,
  icon,
  label,
  value,
  drafts,
}: {
  href: string;
  icon: IconName;
  label: string;
  value: number;
  drafts?: number;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-5 py-2.5" style={{ color: "var(--ink)" }}>
        <span className="flex-none" style={{ color: "var(--ink-faint)" }}>
          <Icon name={icon} size={15} />
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {drafts ? <Badge tone="warn">{drafts} draft</Badge> : null}
        <span className="tabular-nums font-semibold">{formatCount(value)}</span>
      </Link>
    </li>
  );
}

function partOfDay(now: number): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(
      new Date(now),
    ),
  );
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
