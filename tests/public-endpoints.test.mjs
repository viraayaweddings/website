import assert from "node:assert/strict";
import test from "node:test";
import { humanAuditAction } from "../app/admin/_lib/audit-labels.ts";
import { legacyLeadGetResponse } from "../worker/legacy-lead.ts";

test("humanAuditAction maps known audit keys", () => {
  assert.equal(humanAuditAction("lead.notes_updated"), "Notes updated");
  assert.equal(humanAuditAction("unknown.action"), "Action");
});

test("legacyLeadGetResponse points clients at /api/lead", async () => {
  const response = legacyLeadGetResponse();
  assert.equal(response.status, 410);
  assert.equal(response.headers.get("x-deprecated-endpoint"), "/api/lead");
  const body = await response.json();
  assert.equal(body.endpoint, "/api/lead");
  assert.equal(body.csrf, "/api/lead/csrf");
});
