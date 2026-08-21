// Reads the session cookie on every request; never prerender or cache.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { cityListings, cityPages } from "@/worker/db/schema";
import { AdminShell } from "../_components/AdminShell";
import { Alert, Badge, LinkButton, formatCount } from "../_components/ui";
import { requireDb, requireRole } from "../_lib/auth";

export default async function CitiesPage() {
  const user = await requireRole("admin", "/admin/cities", "city pages");
  const db = await requireDb();

  const [pages, counts] = await Promise.all([
    db.select().from(cityPages).orderBy(asc(cityPages.city)),
    db
      .select({ city: cityListings.city, listed: sql<number>`count(*)` })
      .from(cityListings)
      .groupBy(cityListings.city),
  ]);

  const listed = new Map(counts.map((row) => [row.city, Number(row.listed)]));
  const totalListed = [...listed.values()].reduce((sum, value) => sum + value, 0);

  return (
    <AdminShell
      user={user}
      title="City pages"
      subtitle={`${pages.length} cities listing ${formatCount(totalListed)} venue cards between them. Each page shows twelve at a time.`}
    >
      <div className="mb-4">
        <Alert tone="info" title="Chosen lists, not automatic ones">
          A city page shows the venues you pick, in the order you pick them — not every venue in that city. The
          total below drives the &ldquo;Showing 1 – 12 of N&rdquo; line and the pager.
        </Alert>
      </div>

      <div className="vw-table-wrap">
        <table className="vw-table">
          <thead>
            <tr>
              <th>City</th>
              <th>Listed</th>
              <th>Total shown</th>
              <th>Title tag</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => {
              const count = listed.get(page.city) ?? 0;
              return (
                <tr key={page.city}>
                  <td>
                    <Link
                      href={`/admin/cities/${page.city}`}
                      className="font-medium capitalize hover:underline"
                      style={{ color: "var(--ink)" }}
                    >
                      {page.city}
                    </Link>
                  </td>
                  <td>
                    {count === 0 ? <Badge tone="warn">none</Badge> : <span className="tabular-nums">{count}</span>}
                  </td>
                  <td className="tabular-nums" style={{ color: "var(--ink-soft)" }}>
                    {page.totalVenues}
                  </td>
                  <td className="max-w-md truncate" style={{ color: "var(--ink-faint)" }}>
                    {page.seoTitle}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1">
                      <LinkButton href={`/admin/cities/${page.city}`} size="sm" variant="secondary" icon="edit">
                        Edit
                      </LinkButton>
                      <LinkButton
                        href={`/destination-wedding/${page.city}/`}
                        size="sm"
                        variant="ghost"
                        icon="external"
                        external
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
