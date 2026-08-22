// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { listStaticPages } from "@/worker/site/static-pages";
import { AdminShell } from "../_components/AdminShell";
import { Icon } from "../_components/icons";
import { Alert, Badge, Card, CardHead, EmptyState, formatRelative } from "../_components/ui";
import { currentTime } from "../_lib/clock";
import { requireDb, requireRole } from "../_lib/auth";

/** Groups the list the way someone looking for a page would think about it. */
function sectionFor(path: string): string {
  if (path.startsWith("/destination-wedding-in-")) return "City landing pages";
  if (path.startsWith("/real-weddings")) return "Real weddings";
  if (path.startsWith("/wedding-packages") || path === "/package") return "Packages";
  if (path.startsWith("/appointment") || path === "/wedding-consultation") return "Appointments";
  if (
    path === "/privacy-policy" ||
    path === "/terms-of-use" ||
    path === "/cookie-preference-policy"
  ) {
    return "Policies";
  }
  return "Pages";
}

const ORDER = [
  "Pages",
  "City landing pages",
  "Packages",
  "Real weddings",
  "Appointments",
  "Policies",
];

export default async function StaticPagesIndex({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const user = await requireRole("admin", "/admin", "the pages");
  await requireDb();
  const query = await searchParams;
  const now = await currentTime();

  const pages = await listStaticPages();

  const grouped = new Map<string, typeof pages>();
  for (const page of pages) {
    const section = sectionFor(page.path);
    const bucket = grouped.get(section) ?? [];
    bucket.push(page);
    grouped.set(section, bucket);
  }

  return (
    <AdminShell
      user={user}
      title="Pages"
      subtitle={`${pages.length} pages that have no content of their own. Their wording is fixed; their pictures and search listing are not.`}
    >
      {query.error ? (
        <div className="mb-4"><Alert tone="error" title="That did not save">{query.error}</Alert></div>
      ) : null}
      {query.saved ? (
        <div className="mb-4"><Alert tone="success" title="Saved">{query.saved}</Alert></div>
      ) : null}

      {pages.length === 0 ? (
        <EmptyState icon="grid" title="No pages stored yet">
          Run the page import and these will appear. Until then each one is served from the markup it
          shipped with.
        </EmptyState>
      ) : (
        ORDER.filter((section) => grouped.has(section)).map((section) => (
          <div key={section} className="mb-4">
            <Card pad={false}>
              <CardHead title={section} icon="grid" hint={`${grouped.get(section)!.length} pages`} />
              <div className="vw-table-wrap">
                <table className="vw-table">
                  <thead>
                    <tr>
                      <th>Page</th>
                      <th>Search listing</th>
                      <th>Status</th>
                      <th>Last change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.get(section)!.map((page) => (
                      <tr key={page.path}>
                        <td>
                          <Link href={`/admin/pages/${encodeURIComponent(page.path)}`} className="vw-link fw-600">
                            {page.title || page.path}
                          </Link>
                          <div className="vw-hint vw-mono">{page.path}</div>
                        </td>
                        <td className="vw-hint">
                          {page.metaDescription
                            ? page.metaDescription.slice(0, 90) + (page.metaDescription.length > 90 ? "…" : "")
                            : "No description"}
                        </td>
                        <td>
                          {page.published ? <Badge tone="ok">live</Badge> : <Badge tone="neutral">hidden</Badge>}
                        </td>
                        <td className="vw-hint">
                          {page.updatedBy ? `${formatRelative(page.updatedAt, now)} by ${page.updatedBy}` : "Not edited"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ))
      )}

      <Card>
        <p className="vw-hint mb-0">
          <Icon name="info" /> Hiding a page does not take it offline. It falls back to the markup it shipped
          with, which is the same page without any of your changes.
        </p>
      </Card>
    </AdminShell>
  );
}
