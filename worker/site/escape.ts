/**
 * HTML escaping for the values the panel writes into public pages.
 *
 * Its own module so the small renderers that need nothing else can be loaded —
 * and tested — without pulling in the database client, which reaches for
 * bundler-only `?raw` SQL imports.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
