/**
 * Guards the HTML fields that reach the public site verbatim.
 *
 * Article bodies, venue descriptions and FAQ answers are injected into pages
 * without escaping, so whatever an editor saves becomes live markup. Two things
 * follow from that:
 *
 *  - Script must not survive. The panel and the public site share an origin, so
 *    a script stored by an editor account would run with an admin's session
 *    cookie attached to every request it makes — an editor could hand itself
 *    the admin panel. The site's CSP allows inline script, so it is no help
 *    here.
 *  - Everything else must survive untouched. The stored markup carries the
 *    site's own classes and attributes, and the editor is deliberately a
 *    contenteditable rather than a schema-based model so that unrecognised
 *    markup round-trips. A rewrite that "tidied" the HTML would undo that.
 *
 * HTMLRewriter is used rather than a regex because it tokenises HTML properly
 * and passes through everything it is not asked to change, which is exactly the
 * balance above.
 */
import "../html-rewriter";

/** Attributes that carry a URL and could therefore carry `javascript:`. */
const URL_ATTRIBUTES = ["href", "src", "action", "formaction", "xlink:href", "poster", "data"];

/**
 * Elements that execute, or that can redirect every relative URL on the page.
 * `<base>` is here because one in a fragment silently repoints the whole
 * document's links.
 */
const REMOVED_ELEMENTS = "script, base";

/** Generous, but bounded: a runaway paste should fail loudly, not corrupt a row. */
export const MAX_RICH_TEXT_BYTES = 200_000;

function isDangerousUrl(value: string): boolean {
  // A browser still follows `java&#115;cript:`, and a tab in the middle of the
  // scheme, so entities are decoded and control characters dropped first.
  let decoded = value
    .replace(/&#x([0-9a-f]+);?/gi, (match, hex) => codePoint(Number.parseInt(hex, 16), match))
    .replace(/&#(\d+);?/g, (match, decimal) => codePoint(Number(decimal), match));

  let stripped = "";
  for (const character of decoded) {
    if ((character.codePointAt(0) ?? 0) > 0x20) stripped += character;
  }
  decoded = stripped.toLowerCase();

  return decoded.startsWith("javascript:") || decoded.startsWith("data:text/html");
}

function codePoint(value: number, fallback: string): string {
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff
    ? String.fromCodePoint(value)
    : fallback;
}

/**
 * Removes script and event handlers, leaving all other markup exactly as it
 * was. Returns the HTML unchanged when there is nothing to strip.
 */
export async function sanitiseRichText(html: string): Promise<string> {
  if (!html) return "";

  const rewriter = new HTMLRewriter()
    .on(REMOVED_ELEMENTS, {
      element(element) {
        element.remove();
      },
    })
    .on("*", {
      element(element) {
        // Snapshotted: HTMLRewriter invalidates the attribute iterator as soon
        // as an attribute is removed.
        for (const [name, value] of [...element.attributes]) {
          const lower = name.toLowerCase();

          // onclick, onerror, onload — anything that runs on an event.
          if (lower.startsWith("on")) {
            element.removeAttribute(name);
            continue;
          }

          // An iframe's srcdoc is same-origin content, so it inherits the
          // page's CSP and its `unsafe-inline` along with it.
          if (lower === "srcdoc") {
            element.removeAttribute(name);
            continue;
          }

          if (URL_ATTRIBUTES.includes(lower) && isDangerousUrl(value)) {
            element.removeAttribute(name);
          }
        }
      },
    });

  return rewriter.transform(new Response(html)).text();
}

/**
 * Sanitises and enforces the size bound. Returns an error message rather than a
 * shortened string: silently cutting HTML at a byte offset splits a tag and
 * puts broken markup on a live page.
 */
export async function readRichText(
  value: string,
  label: string,
): Promise<{ html: string } | { error: string }> {
  const html = await sanitiseRichText(value.trim());
  if (new TextEncoder().encode(html).length > MAX_RICH_TEXT_BYTES) {
    return {
      error: `${label} is too long to save. Keep it under ${Math.floor(MAX_RICH_TEXT_BYTES / 1000)}KB of HTML.`,
    };
  }
  return { html };
}
