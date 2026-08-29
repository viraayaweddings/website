/**
 * Server-side auth helpers for the admin panel.
 *
 * PostgreSQL is reached through DATABASE_URL (Neon / Vercel Postgres).
 */
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, type Db } from "@/worker/db/client";
import { getDatabaseUrl } from "@/worker/env";
import { getUserByToken, SESSION_COOKIE } from "@/worker/admin/session";
import { auditLog, users, type User, type UserRole } from "@/worker/db/schema";
import { primeFlashKey } from "./flash";
import { trustedClientIp } from "@/worker/request-ip";
import { assertAdminCsrfFromForm, ensureAdminCsrfCookie } from "@/worker/admin/csrf";

export const LOGIN_PATH = "/admin/login";
export const SETUP_PATH = "/admin/setup";

/** Thrown when DATABASE_URL is not configured. */
export class DatabaseUnavailableError extends Error {
  constructor() {
    super('No database is configured. Set DATABASE_URL in Vercel project settings (or .env.local locally).');
    this.name = "DatabaseUnavailableError";
  }
}

export async function getOptionalDb(): Promise<Db | null> {
  return getDb();
}

export async function requireDb(): Promise<Db> {
  if (!getDatabaseUrl()) throw new DatabaseUnavailableError();
  const db = await getDb();
  if (!db) throw new DatabaseUnavailableError();
  return db;
}

/** Cookies must be `Secure` in production but cannot be over http in dev. */
export async function isSecureRequest(): Promise<boolean> {
  const requestHeaders = await headers();
  const proto = requestHeaders.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return !(requestHeaders.get("host") || "").startsWith("localhost");
}

/** The caller's address, taken only from headers the platform sets. */
export async function clientIp(requestHeaders: Headers): Promise<string | null> {
  return trustedClientIp(requestHeaders);
}

export async function requestContext() {
  const requestHeaders = await headers();
  return {
    ip: await clientIp(requestHeaders),
    userAgent: requestHeaders.get("user-agent"),
  };
}

/**
 * Refuses a state-changing request that did not start on this site.
 *
 * Vinext ships Next's Origin/Host check for server actions as a dev-server
 * module only, so in production `SameSite=Lax` was the whole of the CSRF
 * defence. This is the missing half, and it covers plain route handlers too.
 */
export async function assertSameOrigin(): Promise<void> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (!origin) return; // Same-origin form posts may omit it entirely.

  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  if (!host) return;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new Error("Refused: this request did not come from the admin panel.");
  }

  if (originHost !== host) {
    throw new Error("Refused: this request did not come from the admin panel.");
  }

  // Every action passes through here, which makes it the one place the flash
  // key and CSRF cookie can be loaded without touching 250 redirect call sites.
  const secure = await isSecureRequest();
  await primeFlashKey(secure);
  await ensureAdminCsrfCookie(secure);
}

/**
 * Validates same-origin and CSRF for a server action.
 *
 * Call at the top of every state-changing action, passing the form body.
 */
export async function assertAdminRequest(formData: FormData): Promise<void> {
  await assertSameOrigin();
  await assertAdminCsrfFromForm(formData);
}

export async function getCurrentUser(): Promise<User | null> {
  const db = await getOptionalDb();
  if (!db) return null;

  const token = (await cookies()).get(SESSION_COOKIE)?.value || "";
  return getUserByToken(db, token);
}

/**
 * Gate for every admin page. Sends first-run traffic to setup rather than to a
 * login form nobody has credentials for yet.
 */
export async function requireUser(returnTo?: string): Promise<User> {
  const db = await requireDb();

  const token = (await cookies()).get(SESSION_COOKIE)?.value || "";
  const user = await getUserByToken(db, token);
  if (user) return user;

  if (!(await hasAnyUser(db))) redirect(SETUP_PATH);

  const target = safeReturnPath(returnTo);
  redirect(target === "/admin" ? LOGIN_PATH : `${LOGIN_PATH}?next=${encodeURIComponent(target)}`);
}

export async function requireRole(role: UserRole, returnTo?: string, section?: string): Promise<User> {
  const user = await requireUser(returnTo);
  if (role === "admin" && user.role !== "admin") {
    const params = new URLSearchParams({ denied: "1" });
    if (section) params.set("section", section);
    redirect(`/admin?${params.toString()}`);
  }
  return user;
}

export function isAdmin(user: User): boolean {
  return user.role === "admin";
}

export async function hasAnyUser(db: Db): Promise<boolean> {
  const rows = await db.select({ id: users.id }).from(users).limit(1);
  return rows.length > 0;
}

/** Keeps `?next=` from being used as an open redirect. */
export function safeReturnPath(value: string | undefined | null): string {
  if (!value || !value.startsWith("/admin") || value.startsWith("//")) return "/admin";

  try {
    const url = new URL(value, "https://admin.local");
    if (url.origin !== "https://admin.local") return "/admin";
    if (url.pathname === LOGIN_PATH || url.pathname === SETUP_PATH) return "/admin";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/admin";
  }
}

export async function recordAudit(
  db: Db,
  user: Pick<User, "id" | "email"> | null,
  action: string,
  entity: string,
  entityId: string | number,
  detail: Record<string, unknown> = {},
): Promise<void> {
  const entry = {
    userId: user?.id ?? null,
    userEmail: user?.email ?? "",
    action,
    entity,
    entityId: String(entityId),
    detail: JSON.stringify(detail),
  };

  // Written to the platform log before the table.
  //
  // The activity screen lets an admin delete entries, including the entry
  // recording that deletion -- so the table on its own is not evidence against
  // the people it audits. Vercel's log drain is outside the panel's reach, and
  // this line is what makes the trail durable. One JSON object per entry so a
  // drain can parse it.
  console.log(`[audit] ${JSON.stringify({ at: new Date().toISOString(), ...entry })}`);

  // Never let an audit write break the action it is describing.
  await db
    .insert(auditLog)
    .values(entry)
    .catch((error) => {
      console.error("[admin] audit write failed", error instanceof Error ? error.message : error);
    });
}
