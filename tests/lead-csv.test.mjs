import assert from "node:assert/strict";
import test from "node:test";
import { buildLeadCsv, csvCell, fieldColumns, FIXED_COLUMNS } from "../worker/admin/lead-csv.ts";

const at = new Date("2027-02-14T09:30:00Z");
const stamp = () => "2027-02-14, 15:00:00";

function lead(overrides = {}) {
  return {
    id: 1,
    createdAt: at,
    formName: "Hotel Enquiry",
    formId: "enquiryForm",
    name: "Asha Menon",
    email: "asha@example.com",
    phone: "+919876543210",
    status: "new",
    notes: "",
    pageUrl: "https://viraayaweddings.com/x",
    emailSent: 1,
    fields: JSON.stringify({ Name: "Asha Menon", Hotel: "Alila Diwa Goa", Message: "Hi" }),
    ...overrides,
  };
}

function parse(csv) {
  const body = csv.replace(/^\uFEFF/, "");
  return body.split("\r\n").filter(Boolean).map((line) =>
    line.slice(1, -1).split('","').map((cell) => cell.replace(/""/g, '"')),
  );
}

test("the header is row one and carries the fixed columns in order", () => {
  const [header] = parse(buildLeadCsv([lead()], { formatDate: stamp }));
  assert.deepEqual(header.slice(0, FIXED_COLUMNS.length), [...FIXED_COLUMNS]);
});

test("a file Excel opens: BOM, CRLF, trailing newline", () => {
  const csv = buildLeadCsv([lead()], { formatDate: stamp });
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes("\r\n"));
  assert.ok(csv.endsWith("\r\n"));
});

test("the contact columns are not repeated as answer columns", () => {
  const rows = [lead({ fields: JSON.stringify({ Name: "Asha", Email: "a@b.co", "Phone Number": "+91", "Page URL": "/x", Hotel: "Taj" }) })];
  assert.deepEqual(fieldColumns(rows), ["Hotel"]);
  const [header] = parse(buildLeadCsv(rows, { formatDate: stamp }));
  assert.equal(new Set(header).size, header.length, "duplicate header: " + header.join(","));
});

test("answer columns are the union across every row, so nothing is dropped", () => {
  const rows = [
    lead({ id: 1, fields: JSON.stringify({ Hotel: "Taj" }) }),
    lead({ id: 2, fields: JSON.stringify({ Plan: "3 Hotels" }) }),
  ];
  assert.deepEqual(fieldColumns(rows), ["Hotel", "Plan"]);
  const [, first, second] = parse(buildLeadCsv(rows, { formatDate: stamp }));
  assert.deepEqual(first.slice(-2), ["Taj", ""]);
  assert.deepEqual(second.slice(-2), ["", "3 Hotels"]);
});

test("every row has exactly as many cells as the header", () => {
  const rows = [
    lead({ id: 1, fields: JSON.stringify({ Hotel: "Taj", Plan: "A" }) }),
    lead({ id: 2, fields: JSON.stringify({}) }),
    lead({ id: 3, fields: "not json at all" }),
  ];
  const parsed = parse(buildLeadCsv(rows, { formatDate: stamp }));
  const width = parsed[0].length;
  for (const row of parsed.slice(1)) assert.equal(row.length, width);
});

test("a formula is neutralised rather than run by the spreadsheet", () => {
  for (const dangerous of ["=1+1", "+cmd", "-2", "@SUM(A1)", "\tx"]) {
    assert.ok(csvCell(dangerous).startsWith(`"'`), dangerous);
  }
  assert.equal(csvCell("Alila Diwa Goa"), '"Alila Diwa Goa"');
});

test("quotes, commas and newlines inside an answer stay inside their cell", () => {
  const rows = [lead({ notes: 'She said "yes", twice\nand again' })];
  const csv = buildLeadCsv(rows, { formatDate: stamp });
  assert.ok(csv.includes('"She said ""yes"", twice\nand again"'));
  // The embedded newline is not a CRLF, so it does not start a new record.
  assert.equal(csv.replace(/^\uFEFF/, "").split("\r\n").filter(Boolean).length, 2);
});

test("the truncation warning goes after the data, never above the header", () => {
  const parsed = parse(buildLeadCsv([lead()], { formatDate: stamp, truncated: true, total: 9000, limit: 5000 }));
  assert.deepEqual(parsed[0].slice(0, 2), ["ID", "Received (IST)"]);
  assert.match(parsed[parsed.length - 1][0], /^WARNING: 9000 submissions match/);
});

test("an unsent notification reads as no, not as a blank", () => {
  const [, sent] = parse(buildLeadCsv([lead({ emailSent: 1 })], { formatDate: stamp }));
  const [, unsent] = parse(buildLeadCsv([lead({ emailSent: 0 })], { formatDate: stamp }));
  assert.equal(sent[9], "yes");
  assert.equal(unsent[9], "no");
});

test("a form with no name falls back to its id rather than an empty cell", () => {
  const [, row] = parse(buildLeadCsv([lead({ formName: "", formId: "enquiryForm" })], { formatDate: stamp }));
  assert.equal(row[2], "enquiryForm");
});

test("an empty export is still a valid file with its header", () => {
  const parsed = parse(buildLeadCsv([], { formatDate: stamp }));
  assert.equal(parsed.length, 1);
  assert.deepEqual(parsed[0], [...FIXED_COLUMNS]);
});
