import type { DatabaseEnv } from "./db/client";
import { getDb } from "./db/client";
import { markLeadEmailSent, storeLead } from "./admin/lead-store";
import { clearRateLimit, isRateLimited, recordRateLimitAttempt } from "./admin/rate-limit";

export type LeadResponseMode = "lead" | "appointment";

type LeadPayload = {
  formId?: unknown;
  formName?: unknown;
  pageUrl?: unknown;
  fields?: unknown;
  metadata?: unknown;
  requiredFields?: unknown;
  honeypot?: unknown;
};

type CleanLead = {
  formId: string;
  formName: string;
  pageUrl: string;
  fields: Record<string, string>;
  metadata: Record<string, string>;
  replyTo: string;
  /** Extracted separately so stored leads are filterable without JSON parsing. */
  contact: { name: string; email: string; phone: string };
};

export interface LeadEmailEnv extends DatabaseEnv {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_REPLY_TO?: string;
  RESEND_TO_EMAIL?: string;
  LEAD_EMAIL_TO?: string;
  RESEND_ALLOW_INSECURE_LOCAL_TLS?: string;
  LEAD_EMAIL_SUBJECT?: string;
}

type ResendPayload = {
  from: string;
  to: string[];
  subject: string;
  reply_to: string;
  html: string;
  text: string;
};

const resendApiUrl = "https://api.resend.com/emails";
const defaultRecipientEmail = "viraayaweddings@gmail.com";
const defaultFromEmail = "queries@viraayaweddings.com";
const defaultReplyTo = "info@viraayaweddings.com";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const otpPattern = /\b(?:otp|one[-\s]?time|verification\s*code|verify\s*code)\b/i;
const rateLimitWindowMs = 10 * 60 * 1000;
const rateLimitMax = 8;
const CSRF_COOKIE = "lead_csrf";

function rateLimitKey(ip: string): string {
  return `lead:${ip}`;
}

async function leadRateLimited(env: LeadEmailEnv, ip: string): Promise<boolean> {
  const db = await getDb(env);
  if (!db) return false;
  return isRateLimited(db, rateLimitKey(ip), rateLimitMax);
}

async function recordLeadAttempt(env: LeadEmailEnv, ip: string): Promise<void> {
  const db = await getDb(env);
  if (!db) return;
  await recordRateLimitAttempt(db, rateLimitKey(ip), rateLimitMax, rateLimitWindowMs);
}

async function clearLeadAttempts(env: LeadEmailEnv, ip: string): Promise<void> {
  const db = await getDb(env);
  if (!db) return;
  await clearRateLimit(db, rateLimitKey(ip));
}

export function issueLeadCsrfToken(secure: boolean): { token: string; cookie: string } {
  const token = crypto.randomUUID();
  const flags = secure ? "; Secure" : "";
  return {
    token,
    cookie: `${CSRF_COOKIE}=${token}; Path=/; SameSite=Strict; Max-Age=3600${flags}`,
  };
}

function readCsrfCookie(request: Request): string {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === CSRF_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function csrfValid(request: Request, payload: LeadPayload): boolean {
  const expected = readCsrfCookie(request);
  const provided = text(payload && typeof payload === "object" ? (payload as Record<string, unknown>).csrfToken : "", 80);
  return Boolean(expected && provided && expected === provided);
}

function text(value: unknown, max = 500): string {
  if (value && typeof value === "object") {
    if (Array.isArray(value)) {
      return value.map((item) => text(item, max)).filter(Boolean).join(", ").slice(0, max);
    }

    const objectValue = value as Record<string, unknown>;
    for (const key of ["formName", "formId", "name", "label", "title", "id", "value"]) {
      const candidate = objectValue[key];
      if (typeof candidate === "string" || typeof candidate === "number") {
        const candidateText = text(candidate, max);
        if (candidateText && candidateText !== "[object Object]") return candidateText;
      }
    }

    return "";
  }

  return String(value ?? "")
    .replace(/[\s\S]/g, (character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127 ? " " : character;
    })
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanRecord(value: unknown, maxValueLength = 1000) {
  const output: Record<string, string> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return output;

  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const key = text(rawKey, 80);
    if (!key || otpPattern.test(key)) continue;

    const valueText = Array.isArray(rawValue)
      ? rawValue.map((item) => text(item, maxValueLength)).filter(Boolean).join(", ")
      : text(rawValue, maxValueLength);

    if (valueText && !otpPattern.test(valueText)) output[key] = valueText;
  }

  return output;
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function findByKey(fields: Record<string, string>, needles: string[]) {
  for (const [key, value] of Object.entries(fields)) {
    const normalized = normalizeKey(key);
    if (needles.some((needle) => normalized.includes(needle))) return value;
  }
  return "";
}

function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : "";
}

function parseRequiredFields(value: unknown) {
  if (!Array.isArray(value)) return new Set<string>();
  return new Set(value.map((field) => normalizeKey(text(field, 100))).filter(Boolean));
}

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function cleanFormLabel(formName: string, formId: string) {
  const label = text(formName || formId, 120);
  return label && label !== "[object Object]" ? label : "Website Query";
}

function displayLeadFields(fields: Record<string, string>, pageUrl: string) {
  const output: Record<string, string> = {};
  const name = findByKey(fields, ["name"]);
  const phone = findByKey(fields, ["phone", "mobile", "number", "tel"]);
  const email = findByKey(fields, ["email"]);
  const location = findByKey(fields, ["eventlocation", "location", "city"]);
  const hotel = findByKey(fields, ["hotel"]);
  const message = findByKey(fields, ["message", "subject", "comment", "enquiry"]);
  const date = findByKey(fields, ["date"]);
  const time = findByKey(fields, ["time"]);
  const consumed = new Set([
    "token",
    "name",
    "yourname",
    "email",
    "phone",
    "mobile",
    "number",
    "phonenumber",
    "mobilenumber",
    "tel",
    "city",
    "location",
    "eventlocation",
    "hotel",
    "hotelid",
    "message",
    "subject",
    "comment",
    "enquiry",
    "sourcepage",
    "pageurl",
    "preferreddate",
    "appointmentdate",
    "appointmenttime",
  ]);

  if (pageUrl) output["Page URL"] = pageUrl;
  if (name) output["Name"] = name;
  if (phone) output["Phone Number"] = normalizePhone(phone) || phone;
  if (email) output["Email"] = email;
  if (location) output["City / Location"] = location;
  if (hotel) output["Hotel"] = hotel;
  if (date) output["Preferred Date"] = date;
  if (time) output["Appointment Time"] = time;
  if (message) output["Message"] = message;

  for (const [key, value] of Object.entries(fields)) {
    const normalized = normalizeKey(key);
    if (!value || consumed.has(normalized) || output[key] || Object.values(output).includes(value)) continue;
    output[key] = value;
  }

  return output;
}

function validateLead(payload: LeadPayload): { lead?: CleanLead; errors?: string[]; spam?: boolean } {
  if (text(payload.honeypot, 200)) return { spam: true };

  const fields = cleanRecord(payload.fields);
  const metadata = cleanRecord(payload.metadata, 300);
  const requiredFields = parseRequiredFields(payload.requiredFields);
  const formId = text(payload.formId, 120);
  const formName = cleanFormLabel(text(payload.formName, 120), formId);
  const pageUrl = text(payload.pageUrl, 500);
  const name = findByKey(fields, ["name"]);
  const phone = findByKey(fields, ["phone", "mobile", "number", "tel"]);
  const email = findByKey(fields, ["email"]);

  const errors: string[] = [];
  if (!Object.keys(fields).length) errors.push("No form details were received.");
  if (requiredFields.has("name") && (!name || name.length < 2)) errors.push("Please enter your name.");
  if (name && name.length < 2) errors.push("Please enter a valid name.");
  if ((requiredFields.has("phone") || requiredFields.has("number") || phone) && !normalizePhone(phone)) {
    errors.push("Please enter a valid 10-digit Indian mobile number.");
  }
  if ((requiredFields.has("email") || email) && !emailPattern.test(email)) {
    errors.push("Please enter a valid email address.");
  }

  for (const [key, value] of Object.entries(fields)) {
    const normalized = normalizeKey(key);
    if (!requiredFields.has(normalized)) continue;
    if (!value || /^select\b/i.test(value)) errors.push(`Please enter ${key}.`);
  }

  if (errors.length) return { errors: [...new Set(errors)] };

  metadata["Submitted At"] = new Date().toISOString();
  const sourcePage = fields.source_page || fields["Source Page"];
  if (sourcePage && !metadata["Source Page"]) metadata["Source Page"] = sourcePage;
  if (pageUrl && !metadata["Page URL"]) metadata["Page URL"] = pageUrl;

  return {
    lead: {
      formId,
      formName,
      pageUrl,
      fields: displayLeadFields(fields, pageUrl),
      metadata,
      replyTo: emailPattern.test(email) ? email : defaultReplyTo,
      contact: {
        name,
        email: emailPattern.test(email) ? email : "",
        phone: normalizePhone(phone) || phone,
      },
    },
  };
}

function decodeHeaderValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function headerValue(request: Request, names: string[]) {
  for (const name of names) {
    const value = request.headers.get(name)?.trim();
    if (value) return decodeHeaderValue(value);
  }
  return "";
}

function requestMetadata(request: Request, url: URL, clientIp: string) {
  return cleanRecord(
    {
      "IP Address": clientIp,
      Country: headerValue(request, ["x-vercel-ip-country", "cf-ipcountry", "x-country-code"]),
      Region: headerValue(request, ["x-vercel-ip-country-region", "x-region-code"]),
      City: headerValue(request, ["x-vercel-ip-city", "x-city"]),
      Latitude: headerValue(request, ["x-vercel-ip-latitude"]),
      Longitude: headerValue(request, ["x-vercel-ip-longitude"]),
      "Hosting Region": headerValue(request, ["x-vercel-id", "cf-ray"]),
      "Request Host": url.host,
      "Request Path": url.pathname,
      "Request Method": request.method,
      "Request Browser": request.headers.get("user-agent") || "",
      "Accept Language": request.headers.get("accept-language") || "",
      "Forwarded For": request.headers.get("x-forwarded-for") || "",
      "Real IP": request.headers.get("x-real-ip") || "",
      "CF Connecting IP": request.headers.get("cf-connecting-ip") || "",
      "Referer Header": request.headers.get("referer") || "",
      "Origin Header": request.headers.get("origin") || "",
    },
    500,
  );
}

function fromAddressWithName(value?: string) {
  const clean = text(value, 200) || defaultFromEmail;
  const bracketMatch = clean.match(/<([^>]+)>/);
  const email = bracketMatch?.[1] || clean;
  return `Viraaya Weddings <${email.trim()}>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function rows(record: Record<string, string>) {
  return Object.entries(record)
    .map(
      ([key, value]) =>
        `<tr><th align="left" style="padding:8px 12px;border:1px solid #eadfce;background:#fff8ef">${escapeHtml(key)}</th><td style="padding:8px 12px;border:1px solid #eadfce">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
}

function emailHtml(lead: CleanLead) {
  return `
    <div style="font-family:Arial,sans-serif;color:#1f2933;line-height:1.5">
      <h2 style="margin:0 0 14px;color:#985626">Website Query</h2>
      <p><strong>Form:</strong> ${escapeHtml(lead.formName)}</p>
      <p><strong>Page URL:</strong> ${escapeHtml(lead.pageUrl || "Not available")}</p>
      <h3 style="margin-top:24px;color:#1f2933">Submitted Details</h3>
      <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;max-width:760px">${rows(lead.fields)}</table>
      <h3 style="margin-top:24px;color:#1f2933">Tracking Information</h3>
      <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;max-width:760px">${rows(lead.metadata)}</table>
    </div>
  `;
}

function emailText(lead: CleanLead) {
  return [
    "Website Query",
    `Form: ${lead.formName}`,
    `Page URL: ${lead.pageUrl || "Not available"}`,
    "",
    "Submitted Details:",
    ...Object.entries(lead.fields).map(([key, value]) => `${key}: ${value}`),
    "",
    "Tracking Information:",
    ...Object.entries(lead.metadata).map(([key, value]) => `${key}: ${value}`),
  ].join("\n");
}

function recipients(value?: string) {
  return (text(value, 500) || defaultRecipientEmail)
    .split(",")
    .map((email) => email.trim())
    .filter((email) => emailPattern.test(email));
}

/** Config keys only: the env also carries bindings, which are not strings. */
type LeadEmailConfigKey = {
  [K in keyof LeadEmailEnv]-?: LeadEmailEnv[K] extends string | undefined ? K : never;
}[keyof LeadEmailEnv];

function envValue(env: LeadEmailEnv, key: LeadEmailConfigKey): string | undefined {
  return env[key] || (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env?.[key];
}

/** A stored row, as the admin panel holds it. */
export interface StoredLeadForResend {
  formId: string;
  formName: string;
  pageUrl: string;
  name: string;
  email: string;
  phone: string;
  /** JSON, as stored. */
  fields: string;
  metadata: string;
}

function parseStored(value: string): Record<string, string> {
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

/**
 * Re-sends the notification for an enquiry already in the database.
 *
 * The original send happens as the visitor submits, and a Resend outage at that
 * moment used to leave the team with an enquiry nobody was told about. This
 * rebuilds the same email from the stored row so it can be sent again later.
 */
export async function resendStoredLeadEmail(
  env: LeadEmailEnv,
  stored: StoredLeadForResend,
): Promise<{ ok: boolean; error?: string }> {
  const lead: CleanLead = {
    formId: stored.formId,
    formName: stored.formName,
    pageUrl: stored.pageUrl,
    fields: parseStored(stored.fields),
    metadata: parseStored(stored.metadata),
    replyTo: emailPattern.test(stored.email) ? stored.email : "",
    contact: { name: stored.name, email: stored.email, phone: stored.phone },
  };

  try {
    const response = await sendResendEmail(env, lead);
    if (response.ok) return { ok: true };
    return { ok: false, error: `The email service refused it (${response.status}).` };
  } catch (error) {
    console.error("[lead-email] resend failed", error instanceof Error ? error.message : error);
    return { ok: false, error: "Could not reach the email service." };
  }
}

async function sendResendEmail(env: LeadEmailEnv, lead: CleanLead) {
  const apiKey = envValue(env, "RESEND_API_KEY");
  if (!apiKey) return { ok: false, status: 500, body: "Email service is not configured." };

  const to = recipients(envValue(env, "RESEND_TO_EMAIL") || envValue(env, "LEAD_EMAIL_TO"));
  if (!to.length) return { ok: false, status: 500, body: "Lead recipient email is not configured." };

  const subjectBase = envValue(env, "LEAD_EMAIL_SUBJECT") || "Website Query";
  const payload = {
    from: fromAddressWithName(envValue(env, "RESEND_FROM_EMAIL")),
    to,
    subject: `${subjectBase} - ${lead.formName}`,
    reply_to: lead.replyTo || envValue(env, "RESEND_REPLY_TO") || defaultReplyTo,
    html: emailHtml(lead),
    text: emailText(lead),
  };

  if (allowLocalInsecureTls(env)) {
    return sendResendWithNodeHttps(apiKey, payload, false);
  }

  const response = await fetch(resendApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return {
    ok: response.ok,
    status: response.status,
    body: await response.text(),
  };
}

function allowLocalInsecureTls(env: LeadEmailEnv) {
  const explicit = envValue(env, "RESEND_ALLOW_INSECURE_LOCAL_TLS");
  const isWorkerRuntime = typeof (globalThis as { WebSocketPair?: unknown }).WebSocketPair !== "undefined";
  return explicit === "true" && !isWorkerRuntime;
}

async function sendResendWithNodeHttps(apiKey: string, payload: ResendPayload, rejectUnauthorized: boolean) {
  const https = await import("node:https");
  const { Buffer } = await import("node:buffer");
  const url = new URL(resendApiUrl);
  const body = JSON.stringify(payload);

  return new Promise<{ ok: boolean; status: number; body: string }>((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        method: "POST",
        path: `${url.pathname}${url.search}`,
        port: url.port ? Number(url.port) : 443,
        rejectUnauthorized,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let responseBody = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          const status = res.statusCode || 0;
          resolve({ ok: status >= 200 && status < 300, status, body: responseBody });
        });
      },
    );

    req.setTimeout(15_000, () => {
      req.destroy(new Error("Resend request timed out."));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function payloadFromRequest(request: Request, url: URL): Promise<LeadPayload> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await request.json()) as LeadPayload;
  }

  const formData = await request.formData();
  const fields: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    const valueText = typeof value === "string" ? value : value.name;
    if (fields[key]) {
      fields[key] = Array.isArray(fields[key]) ? [...fields[key], valueText] : [fields[key] as string, valueText];
    } else {
      fields[key] = valueText;
    }
  }

  const pageUrl =
    text(fields.pageUrl, 500) ||
    text(fields["Page URL"], 500) ||
    text(fields.page_url, 500) ||
    request.headers.get("referer") ||
    "";
  const sourcePage = text(fields.source_page, 500);

  return {
    formId: fields.formId || "",
    formName: fields.formName || legacyFormName(url.pathname),
    pageUrl,
    fields,
    requiredFields: Object.keys(fields).filter((key) => ["name", "email", "phone", "number"].includes(normalizeKey(key))),
    metadata: {
      "Submission Endpoint": url.pathname,
      "Page URL": pageUrl,
      "Source Page": sourcePage,
      "User Agent": request.headers.get("user-agent") || "",
    },
  };
}

function legacyFormName(pathname: string) {
  if (pathname.includes("appointment")) return "Appointment Booking";
  if (pathname.includes("blog")) return "Blog Enquiry";
  if (pathname.includes("contact")) return "Contact Form";
  if (pathname.includes("get_in_touch")) return "Wedding Enquiry";
  return "Website Query";
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
    },
  });
}

export async function handleLeadRequest(
  request: Request,
  env: LeadEmailEnv,
  url: URL,
  mode: LeadResponseMode = "lead",
) {
  if (request.method !== "POST") return jsonResponse({ ok: false, message: "Method not allowed." }, 405);
  if (!isSameOrigin(request)) return jsonResponse({ ok: false, message: "Invalid request origin." }, 403);

  const key = clientKey(request);
  if (await leadRateLimited(env, key)) {
    return jsonResponse({ ok: false, message: "Too many submissions. Please try again later." }, 429);
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 20_000) {
    return jsonResponse({ ok: false, message: "Submission is too large." }, 413);
  }

  const payload = await payloadFromRequest(request, url);
  if (!csrfValid(request, payload)) {
    await recordLeadAttempt(env, key);
    return jsonResponse({ ok: false, message: "Your session expired. Refresh the page and try again." }, 403);
  }
  const validation = validateLead(payload);
  if (validation.spam) return jsonResponse(successPayload(mode));
  if (validation.errors?.length || !validation.lead) {
    await recordLeadAttempt(env, key);
    if (mode === "appointment") {
      return jsonResponse({ ok: false, errors: { form: validation.errors || ["Invalid form data."] } }, 422);
    }
    return jsonResponse({ ok: false, errors: validation.errors || ["Invalid form data."] }, 422);
  }

  const lead = validation.lead;
  lead.metadata = {
    ...lead.metadata,
    ...requestMetadata(request, url, key),
  };

  // Store before sending. Email delivery is the flaky half of this path, and a
  // Resend outage used to drop the enquiry entirely.
  const leadId = await storeLead(env, {
    formId: lead.formId,
    formName: lead.formName,
    pageUrl: lead.pageUrl,
    contact: lead.contact,
    fields: lead.fields,
    metadata: lead.metadata,
  });

  let resendResponse: { ok: boolean; status: number; body: string } | null = null;
  try {
    resendResponse = await sendResendEmail(env, lead);
  } catch (error) {
    console.error("[lead-email] Resend network failure", error instanceof Error ? error.message : "Unknown error");
  }

  if (resendResponse?.ok) {
    if (leadId !== null) await markLeadEmailSent(env, leadId);
    await clearLeadAttempts(env, key);
    return jsonResponse(successPayload(mode));
  }

  console.error("[lead-email] Resend failed", resendResponse?.status ?? "network error");

  // The enquiry is safely recorded and visible in the admin panel, so from the
  // visitor's point of view it has been received. Without storage, fail loudly.
  if (leadId !== null) {
    await clearLeadAttempts(env, key);
    return jsonResponse(successPayload(mode));
  }

  return jsonResponse({ ok: false, message: "Could not send your enquiry right now." }, 502);
}

function successPayload(mode: LeadResponseMode) {
  if (mode === "appointment") {
    return {
      ok: true,
      status: "success",
      message: "Thanks. Your consultation request has been received.",
      order_id: `lead_${Date.now()}`,
    };
  }

  return {
    ok: true,
    message: "Thanks. We will get back to you shortly.",
  };
}
