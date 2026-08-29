import { ADMIN_CSRF_FIELD, adminCsrfToken } from "@/worker/admin/csrf";

/** Hidden field every admin POST form must include. */
export function CsrfField() {
  const token = adminCsrfToken();
  if (!token) return null;
  return <input type="hidden" name={ADMIN_CSRF_FIELD} value={token} />;
}
