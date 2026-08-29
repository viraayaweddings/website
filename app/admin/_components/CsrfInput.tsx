"use client";

import { ADMIN_CSRF_FIELD } from "@/worker/admin/csrf-tokens";

/** Client-safe hidden CSRF field — pass the token from a server parent. */
export function CsrfInput({ token }: { token: string }) {
  if (!token) return null;
  return <input type="hidden" name={ADMIN_CSRF_FIELD} value={token} />;
}
