/**
 * Builds the submissions CSV.
 *
 * Kept apart from the route so it can be tested without a session or a
 * database: this is the one thing the panel produces that leaves the building,
 * and a column that silently shifts is not visible until someone opens the file
 * in Excel. Covered by tests/lead-csv.test.mjs.
 */

/** The columns every export has, in order, before the submitted answers. */
export const FIXED_COLUMNS = [
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
] as const;

/**
 * Display labels the fixed columns already cover.
 *
 * displayLeadFields stores the contact details under these labels as well, and
 * without this the same value appeared twice under two headers.
 */
const COVERED_BY_FIXED_COLUMNS = new Set(["Name", "Email", "Phone Number", "Page URL"]);

export interface LeadCsvRow {
  id: number;
  createdAt: Date;
  formName: string;
  formId: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  notes: string;
  pageUrl: string;
  emailSent: number;
  /** JSON, as stored. */
  fields: string;
}

/**
 * Excel reads a leading =, +, - or @ as a formula, and lead data is written by
 * whoever filled the form in.
 */
export function csvCell(value: unknown): string {
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

/** Every answer key across the whole export, so no submitted field is dropped. */
export function fieldColumns(rows: LeadCsvRow[]): string[] {
  return [...new Set(rows.flatMap((row) => Object.keys(flatten(row.fields))))]
    .filter((key) => !COVERED_BY_FIXED_COLUMNS.has(key))
    .sort();
}

export interface LeadCsvOptions {
  /** More rows matched than the export is allowed to return. */
  truncated?: boolean;
  total?: number;
  limit?: number;
  /** Injected so the output is deterministic and the caller owns the timezone. */
  formatDate?: (date: Date) => string;
}

const istFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Asia/Kolkata",
});

export function buildLeadCsv(rows: LeadCsvRow[], options: LeadCsvOptions = {}): string {
  const formatDate = options.formatDate ?? ((date: Date) => istFormatter.format(date));
  const answers = fieldColumns(rows);
  const header = [...FIXED_COLUMNS, ...answers];

  // The header stays on row 1. A warning unshifted above it became the header
  // as far as Excel was concerned, which shifted every real column down a row
  // and left them unlabelled -- on precisely the export someone hands a client.
  const lines = [header.map(csvCell).join(",")];

  for (const row of rows) {
    const fields = flatten(row.fields);
    lines.push(
      [
        row.id,
        formatDate(row.createdAt),
        row.formName || row.formId,
        row.name,
        row.email,
        row.phone,
        row.status,
        row.notes,
        row.pageUrl,
        row.emailSent ? "yes" : "no",
        ...answers.map((key) => fields[key] ?? ""),
      ]
        .map(csvCell)
        .join(","),
    );
  }

  if (options.truncated) {
    lines.push(
      csvCell(
        `WARNING: ${options.total} submissions match these filters but exports are limited to ` +
          `${options.limit} rows. Narrow the filters for a complete export.`,
      ),
    );
  }

  // BOM so Excel opens UTF-8 names correctly.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
