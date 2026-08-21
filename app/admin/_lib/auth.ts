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

export async function requestContext() {
  const requestHeaders = await headers();
  return {
    ip: requestHeaders.get("cf-connecting-ip") || requestHeaders.get("x-forwarded-for"),
    userAgent: requestHeaders.get("user-agent"),
  };
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
  // Never let an audit write break the action it is describing.
  await db
    .insert(auditLog)
    .values({
      userId: user?.id ?? null,
      userEmail: user?.email ?? "",
      action,
      entity,
      entityId: String(entityId),
      detail: JSON.stringify(detail),
    })
    .catch((error) => {
      console.error("[admin] audit write failed", error instanceof Error ? error.message : error);
    });
}
