/**
 * Puts the stored page markup on the 2026 brand standard.
 *
 * The brand moved the site onto six colours and two type families in two
 * commits (88a7c1fe, 021894ff). Most of that lives in style.css and reached
 * every page on deploy, but part of it is in the pages' own markup -- inline
 * `<style>` blocks and `style` attributes carrying the trial gold theme, the
 * enquiry popup's Readex Pro and Public Sans, the old Google Fonts stylesheet
 * link. Those changes reached the files under site-public and the generated
 * shells, but not the `page_templates` and `static_pages` rows the live site
 * renders from.
 *
 * brand-markup-rules.json is those commits' markup changes as line rules:
 * `[context, before, after[]]`, where context is the CSS rule the line sits in
 * ("" outside one) and an empty `after` deletes the line. The rules were taken
 * from the commits' own diffs of every site-public page and every shell, and
 * keyed by context because a few lines changed differently depending on the
 * rule they sit in (`color: #fff !important;` is Ivory text in one place and
 * the fill's text colour in another).
 *
 * A line is rewritten only when it matches a rule exactly, in that context, so
 * a line an admin changed in the panel no longer matches and is left as it is.
 * No rule's output matches another rule, so `transform` is idempotent and safe
 * to run on every deploy: it rewrites a row the first time and is a no-op
 * afterwards.
 */
import rules from "./brand-markup-rules.json" with { type: "json" };

const RULES = new Map(rules.map(([context, before, after]) => [`${context}\u0000${before}`, after]));

/** Every stored row is a candidate; the rules themselves decide what changes. */
export const BRAND_MARKER = /./;

export function transform(html) {
  const lines = html.split("\n");
  const out = [];
  let context = "";
  let changed = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const after = RULES.get(`${context}\u0000${trimmed}`);

    if (after === undefined) {
      out.push(line);
    } else {
      // Some cloned pages use CRLF; a rewritten line keeps the row's own ending.
      const indent = line.slice(0, line.length - line.trimStart().length);
      const ending = line.endsWith("\r") ? "\r" : "";
      for (const replacement of after) out.push(indent + replacement + ending);
      changed = true;
    }

    // Context follows the original line, as it did when the rules were taken.
    if (trimmed.includes("{") && !trimmed.startsWith("<")) context = trimmed;
    else if (trimmed.startsWith("<") && !trimmed.startsWith("</")) context = "";
  }

  return { html: changed ? out.join("\n") : html, changed, problems: [] };
}
