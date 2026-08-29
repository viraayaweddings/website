/** Reads the admin CSRF token rendered in the layout meta tag. */
export function adminCsrfHeader(): HeadersInit {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
  return token ? { "x-csrf-token": token } : {};
}
