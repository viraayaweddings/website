import { adminCsrfToken } from "@/worker/admin/csrf";

/** Exposes the CSRF token to client fetch helpers (uploads, rich text). */
export function AdminCsrfMeta() {
  const token = adminCsrfToken();
  if (!token) return null;
  return <meta name="csrf-token" content={token} />;
}
