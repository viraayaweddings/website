/**
 * Cookie-backed admin sessions.
 *
 * The cookie carries a random token; only its SHA-256 is stored, so a database
 * leak does not hand out live sessions.
 *
 * Kept transport-agnostic: the worker gate passes a `Request`, while server
 * actions and server components pass a token read from `next/headers`.
 */
import { and, eq, gt, lt } from "drizzle-orm";
import type { Db } from "../db/client";
import { sessions, users, type User } from "../db/schema";

export const SESSION_COOKIE = "vw_admin_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Re-issue the expiry when a session is more than this far from fresh. */
const SESSION_REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;
const TOKEN_BYTES = 32;

export interface SessionContext {
  ip?: string | null;
  userAgent?: string | null;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function readCookie(request: Request, name: string): string {
  const header = request.headers.get("cookie");
  if (!header) return "";

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }

  return "";
}

/** Cookie attributes shared by `cookies().set()` and raw Set-Cookie headers. */
export function sessionCookieOptions(secure: boolean) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "Lax" as const,
    secure,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export async function createSession(
  db: Db,
  user: User,
  context: SessionContext = {},
): Promise<string> {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)));

  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash: await hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    ip: context.ip || null,
    userAgent: context.userAgent?.slice(0, 300) || null,
  });

  // Opportunistic cleanup; cheap and keeps the table from growing unbounded.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).catch(() => undefined);

  return token;
}

/** Resolves the signed-in user, or null for anonymous, expired or disabled. */
export async function getUserByToken(db: Db, token: string): Promise<User | null> {
  if (!token) return null;

  const tokenHash = await hashToken(token);
  const rows = await db
    .select({ user: users, sessionId: sessions.id, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row || row.user.status !== "active") return null;

  const remaining = row.expiresAt.getTime() - Date.now();
  if (remaining < SESSION_TTL_MS - SESSION_REFRESH_AFTER_MS) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
      .where(eq(sessions.id, row.sessionId))
      .catch(() => undefined);
  }

  return row.user;
}

export function getSessionUser(db: Db, request: Request): Promise<User | null> {
  return getUserByToken(db, readCookie(request, SESSION_COOKIE));
}

export async function destroySessionByToken(db: Db, token: string): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.tokenHash, await hashToken(token)));
}

/** Signs out every session for a user, e.g. after a password change. */
export async function destroyUserSessions(db: Db, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
