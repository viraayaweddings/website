import { getCurrentUser, requireDb } from "../../_lib/auth";
import { countLeads, EXPORT_LIMIT, listAllMatchingLeads, parseFilters } from "../_query";

export const dynamic = "force-dynamic";

/**
 * Excel interprets a leading =, +, - or @ as a formula, so those values are
 * prefixed with a quote. Lead data is attacker-supplied.
 */
function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

function flatten(json: string): Record<string, string> {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
    );
  } catch {
    return {};
  }
}

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const filters = parseFilters(Object.fromEntries(url.searchParams));
  const db = await requireDb();
  const [rows, total] = await Promise.all([listAllMatchingLeads(db, filters), countLeads(db, filters)]);
  const truncated = total > EXPORT_LIMIT;

  // These are already fixed columns; the stored payload repeats them under its
  // display labels, which would otherwise produce duplicate headers in Excel.
  const COVERED_BY_FIXED_COLUMNS = new Set(["Name", "Email", "Phone Number", "Page URL"]);

  // Union of every remaining field key, so no submitted answer is dropped.
  const fieldKeys = [...new Set(rows.flatMap((row) => Object.keys(flatten(row.fields))))]
    .filter((key) => !COVERED_BY_FIXED_COLUMNS.has(key))
    .sort();

  const header = [
    "ID",
    "Received (IST)",
    "Form",
    "Name",
    "Email",
    "Phone",
    "Status",
    "Notes",
    "Page URL",
    "Email sent",
    ...fieldKeys,
  ];

  const formatter = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Kolkata",
  });

  const lines = [header.map(csvCell).join(",")];
  if (truncated) {
    lines.unshift(
      csvCell(
        `WARNING: ${total} submissions match these filters but exports are limited to ${EXPORT_LIMIT} rows. Narrow the filters for a complete export.`,
      ),
    );
  }
  for (const row of rows) {
    const fields = flatten(row.fields);
    lines.push(
      [
        row.id,
        formatter.format(row.createdAt),
        row.formName || row.formId,
        row.name,
        row.email,
        row.phone,
        row.status,
        row.notes,
        row.pageUrl,
        row.emailSent ? "yes" : "no",
        ...fieldKeys.map((key) => fields[key] ?? ""),
      ]
        .map(csvCell)
        .join(","),
    );
  }

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

  // BOM so Excel opens UTF-8 names correctly.
  return new Response(`\uFEFF${lines.join("\r\n")}\r\n`, { headers });
}
