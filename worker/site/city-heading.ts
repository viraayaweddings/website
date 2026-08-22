/**
 * The heading over a city index page's venue grid.
 *
 * The markup styles it as a plain word followed by an emphasised span, the same
 * shape the section labels use, so the stored heading is kept in two halves and
 * written back in that form. Both halves empty means "leave the wording the
 * page shipped with alone".
 */
// Extension-qualified so node can load this module directly for the tests; the
// rest of the worker is only ever resolved by Vite, which needs no help.
import { escapeHtml } from "./escape.ts";
import type { CityPage } from "../db/schema.ts";

export function renderCityHeading(page: Pick<CityPage, "heading" | "headingEmphasis">): string {
  const plain = escapeHtml(page.heading);
  if (!page.headingEmphasis) return plain;

  const emphasis = `<span class="fw-600 text-primary">${escapeHtml(page.headingEmphasis)}</span>`;
  return plain ? `${plain} ${emphasis}` : emphasis;
}
