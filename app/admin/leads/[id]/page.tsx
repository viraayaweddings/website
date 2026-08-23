// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { auditLog, leads, LEAD_STATUSES } from "@/worker/db/schema";
import { AdminShell } from "../../_components/AdminShell";
import { CharCounter } from "../../_components/CharCounter";
import { CopyButton, SubmitButton, UnsavedGuard, VersionField } from "../../_components/FormControls";
import { Icon } from "../../_components/icons";
import {
  Alert,
  Card,
  CardHead,
  DetailList,
  EmptyState,
  LinkButton,
  StatusBadge,
  formatDateTime,
  formatRelative,
} from "../../_components/ui";
import { currentTime } from "../../_lib/clock";
import { humanAuditAction } from "../../_lib/audit-labels";
import { versionOf } from "../../_lib/concurrency";
import { isAdmin, requireDb, requireUser } from "../../_lib/auth";
import { deleteLeadAction, resendLeadEmailAction, updateLeadAction } from "../actions";

/** Submitted payloads are free-form JSON; render whatever is in there. */
function parseRecord(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, item]) => [key, String(item)]),
    );
  } catch {
    return {};
  }
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id: rawId } = await params;
  // Digits only: parseInt would happily read "12abc" as 12 and serve a record
  // the URL does not actually name.
  if (!/^\d+$/.test(rawId)) notFound();
  const id = Number.parseInt(rawId, 10);

  const user = await requireUser(`/admin/leads/${id}`);
  const db = await requireDb();
  await searchParams; // The shell's toast reads these straight from the URL.
  const now = await currentTime();

  const lead = (await db.select().from(leads).where(eq(leads.id, id)).limit(1))[0];
  if (!lead) notFound();

  const history = await db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.entity, "lead"), eq(auditLog.entityId, String(id))))
    .orderBy(desc(auditLog.createdAt))
    .limit(20);

  const fields = parseRecord(lead.fields);
  const metadata = parseRecord(lead.metadata);

  return (
    <AdminShell
      user={user}
      title={lead.name || `Submission #${lead.id}`}
      subtitle={`${lead.formName || lead.formId || "Unknown form"} · received ${formatRelative(lead.createdAt, now)}`}
      actions={
        <>
          {lead.email ? (
            <LinkButton href={`mailto:${encodeURIComponent(lead.email)}`} icon="mail" variant="secondary">
              Reply
            </LinkButton>
          ) : null}
          {lead.phone ? (
            <LinkButton href={`tel:${encodeURIComponent(lead.phone)}`} icon="phone" variant="secondary">
              Call
            </LinkButton>
          ) : null}
          <LinkButton href="/admin/leads" icon="chevronLeft" variant="ghost">
            Back
          </LinkButton>
        </>
      }
    >
      {lead.emailSent ? null : (
        <div className="mb-4">
          <Alert tone="warning" title="The notification email did not go out">
            <p>The enquiry itself is safely stored — only the alert failed.</p>
            <form action={resendLeadEmailAction} className="mt-2">
              <input type="hidden" name="id" value={lead.id} />
              <VersionField value={versionOf(lead)} />
              <SubmitButton variant="secondary" size="sm" icon="refresh" pendingLabel="Sending…">
                Send it again
              </SubmitButton>
            </form>
          </Alert>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card pad={false}>
            <CardHead title="What they sent" hint={`${Object.keys(fields).length} fields`} icon="inbox" />
            <div className="vw-card-pad">
              {Object.keys(fields).length === 0 ? (
                <EmptyState title="Nothing recorded">This submission arrived with no fields.</EmptyState>
              ) : (
                <DetailList
                  rows={Object.entries(fields).map(([key, value]) => ({
                    label: key,
                    value: value ? (
                      <span className="flex items-start gap-1">
                        <span className="min-w-0 break-words">{value}</span>
                        <CopyButton value={value} label={key} />
                      </span>
                    ) : (
                      "—"
                    ),
                  }))}
                />
              )}
            </div>
          </Card>

          <Card pad={false}>
            <CardHead title="Request context" hint="Captured automatically with the submission" icon="info" />
            <div className="vw-card-pad">
              {Object.keys(metadata).length === 0 ? (
                <EmptyState icon="info" title="Nothing recorded" />
              ) : (
                <DetailList
                  rows={Object.entries(metadata).map(([key, value]) => ({ label: key, value: value || "—" }))}
                />
              )}
            </div>
          </Card>

          <Card pad={false}>
            <CardHead title="History" hint="Every change made to this enquiry" icon="activity" />
            {history.length === 0 ? (
              <EmptyState icon="activity" title="No changes yet">
                Status changes and notes are recorded here as they happen.
              </EmptyState>
            ) : (
              <ol className="vw-card-pad">
                {history.map((entry, index) => (
                  <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {index < history.length - 1 ? (
                      <span
                        className="absolute bottom-0 left-[0.1875rem] top-4 w-px"
                        style={{ background: "var(--line)" }}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span
                      className="relative mt-1.5 h-1.5 w-1.5 flex-none rounded-full"
                      style={{ background: "var(--accent)", boxShadow: "0 0 0 3px var(--accent-wash)" }}
                    />
                    <div className="min-w-0 flex-1 text-sm">
                      <p style={{ color: "var(--ink)" }}>
                        <span className="font-medium">{humanAuditAction(entry.action)}</span>
                        {entry.userEmail ? (
                          <span style={{ color: "var(--ink-faint)" }}> by {entry.userEmail}</span>
                        ) : null}
                      </p>
                      <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card pad={false}>
            <CardHead title="Summary" icon="info" />
            <div className="vw-card-pad">
              <DetailList
                rows={[
                  { label: "Status", value: <StatusBadge status={lead.status} /> },
                  { label: "Received", value: formatDateTime(lead.createdAt) },
                  { label: "Form", value: lead.formName || lead.formId || "—" },
                  {
                    label: "Page",
                    value: lead.pageUrl ? (
                      <a
                        href={lead.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 break-all hover:underline"
                        style={{ color: "var(--info)" }}
                      >
                        {lead.pageUrl}
                        <Icon name="external" size={12} />
                      </a>
                    ) : (
                      "—"
                    ),
                  },
                  {
                    label: "Notification",
                    value: lead.emailSent ? (
                      <span style={{ color: "var(--ok)" }}>Sent</span>
                    ) : (
                      <span style={{ color: "var(--bad)" }}>Not sent</span>
                    ),
                  },
                ]}
              />
            </div>
          </Card>

          <Card pad={false}>
            <CardHead title="Update" icon="edit" />
            <form action={updateLeadAction} className="vw-card-pad space-y-3">
              <UnsavedGuard />
              <input type="hidden" name="id" value={lead.id} />

              <label className="block">
                <span className="vw-label">Status</span>
                <select name="status" defaultValue={lead.status} className="vw-select">
                  {LEAD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block" htmlFor="lead-notes">
                <span className="vw-label">Internal notes</span>
                <CharCounter
                  labelId="lead-notes"
                  name="notes"
                  max={5000}
                  defaultValue={lead.notes}
                  placeholder="What was agreed, what to follow up on, anything the next person should know."
                />
              </label>

              <SubmitButton icon="check" block>
                Save changes
              </SubmitButton>
            </form>
          </Card>

          {isAdmin(user) ? (
            <Card pad={false}>
              <CardHead title="Danger zone" icon="warning" />
              <div className="vw-card-pad">
                <p className="mb-3 text-sm" style={{ color: "var(--ink-soft)" }}>
                  Deleting removes this submission permanently. Mark it as spam instead if you may need it later.
                </p>
                <form action={deleteLeadAction}>
                  <input type="hidden" name="id" value={lead.id} />
                  <SubmitButton
                    variant="danger-quiet"
                    icon="trash"
                    pendingLabel="Deleting…"
                    confirm="Delete this submission permanently?"
                  >
                    Delete submission
                  </SubmitButton>
                </form>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </AdminShell>
  );
}
