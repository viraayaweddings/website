import { getCurrentUser, recordAudit, requireDb } from "../../_lib/auth";
import { buildLeadCsv } from "@/worker/admin/lead-csv";
import { filtersToQuery } from "@/worker/admin/lead-filters";
import { countLeads, EXPORT_LIMIT, listAllMatchingLeads, parseFilters } from "../_query";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const filters = parseFilters(Object.fromEntries(url.searchParams));
  const db = await requireDb();
  const [rows, total] = await Promise.all([listAllMatchingLeads(db, filters), countLeads(db, filters)]);
  const truncated = total > EXPORT_LIMIT;

  // Every change to a submission was audited; walking out with all of them was
  // the one action that left no trace, and it is the one that moves the most
  // personal data.
  await recordAudit(db, user, "lead.exported", "lead", "csv", {
    filters: filtersToQuery(filters),
    rows: rows.length,
    matched: total,
    truncated,
  });

  const csv = buildLeadCsv(rows, { truncated, total, limit: EXPORT_LIMIT });
  if (truncated) {
    console.warn("[admin] lead export hit the row cap; narrow the filters for a complete export");
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const headers: Record<string, string> = {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="viraaya-leads-${stamp}.csv"`,
    "cache-control": "no-store",
  };
  if (truncated) {
    headers["x-export-truncated"] = "true";
    headers["x-export-total-rows"] = String(total);
    headers["x-export-row-limit"] = String(EXPORT_LIMIT);
  }

  return new Response(csv, { headers });
}
