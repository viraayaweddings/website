/**
 * Guards the HTML fields that reach the public site verbatim.
 *
 * Article bodies, venue descriptions and FAQ answers are injected into pages
 * without escaping, so whatever an editor saves becomes live markup. Two things
 * follow from that:
 *
 *  - Script must not survive. The panel and the public site share an origin, so
 *    a script stored by an editor account would run with an admin's session
 *    cookie attached to every request it makes -- an editor could hand itself
 *    the admin panel.
 *  - Content markup must survive untouched. The stored markup carries the
 *    site's own classes and attributes, and the editor is deliberately a
 *    contenteditable rather than a schema-based model so that ordinary markup
 *    round-trips. A rewrite that "tidied" the HTML would undo that.
 *
 * This is an ALLOW-LIST. The previous version removed `script`, `base`, `on*`
 * and a handful of URL schemes and passed everything else through, which is not
 * a policy HTML can be held to: `javascript&colon;...` in an href, a
 * `<meta http-equiv="refresh">`, a `<style>` block, an external `<form action>`
 * and an unquoted `<img src>` all walked straight past it. Elements and
 * attributes now have to be named to survive, and every URL has to resolve to a
 * scheme this site is willing to emit.
 *
 * HTMLRewriter is used rather than a regex because it tokenises HTML properly:
 * anything a handler does not touch comes back byte-for-byte.
 */
import "../html-rewriter.ts";

/**
 * Content elements kept as-is (subject to attribute filtering).
 *
 * Everything the site's own article and venue markup is built from. An element
 * outside this list is not automatically an attack, so unknown elements are
 * unwrapped rather than dropped -- the text a writer typed inside an unfamiliar
 * tag still reaches the page.
 */
const ALLOWED_ELEMENTS = new Set([
  "a", "abbr", "address", "article", "aside", "b", "bdi", "bdo", "blockquote", "br",
  "caption", "cite", "code", "col", "colgroup", "dd", "del", "details", "dfn", "div",
  "dl", "dt", "em", "figcaption", "figure", "footer", "h1", "h2", "h3", "h4", "h5",
  "h6", "header", "hgroup", "hr", "i", "img", "ins", "kbd", "li", "main", "mark",
  "nav", "ol", "p", "picture", "pre", "q", "rp", "rt", "ruby", "s", "samp", "section",
  "small", "source", "span", "strong", "sub", "summary", "sup", "table", "tbody",
  "td", "tfoot", "th", "thead", "time", "tr", "u", "ul", "var", "wbr",
]);

/**
 * Elements dropped along with their contents.
 *
 * These execute, load, submit, restyle the whole document, or repoint every
 * relative URL on the page. Unwrapping them would keep the payload, so they go
 * entirely.
 */
const DROPPED_ELEMENTS = new Set([
  "script", "style", "base", "link", "meta", "title", "head", "html", "body",
  "iframe", "frame", "frameset", "object", "embed", "applet", "portal",
  "form", "input", "textarea", "select", "option", "optgroup", "button", "label",
  "fieldset", "legend", "output", "datalist", "progress", "meter",
  "svg", "math", "template", "noscript", "slot", "canvas", "map", "area",
  "audio", "video", "track", "source-set", "param", "dialog", "marquee",
  "xmp", "plaintext", "listing", "noframes", "noembed",
]);

/** Attributes allowed on any element. */
const GLOBAL_ATTRIBUTES = new Set(["class", "id", "title", "lang", "dir", "role", "translate"]);

/** Attributes allowed only on the elements that own them. */
const ELEMENT_ATTRIBUTES: Record<string, ReadonlySet<string>> = {
  a: new Set(["href", "target", "rel", "name", "hreflang", "type"]),
  img: new Set(["src", "srcset", "sizes", "alt", "width", "height", "loading", "decoding", "fetchpriority"]),
  source: new Set(["src", "srcset", "sizes", "type", "media", "width", "height"]),
  td: new Set(["colspan", "rowspan", "headers", "scope", "abbr"]),
  th: new Set(["colspan", "rowspan", "headers", "scope", "abbr"]),
  col: new Set(["span", "width"]),
  colgroup: new Set(["span"]),
  table: new Set(["summary", "border", "cellpadding", "cellspacing"]),
  ol: new Set(["start", "reversed", "type"]),
  li: new Set(["value"]),
  time: new Set(["datetime"]),
  del: new Set(["cite", "datetime"]),
  ins: new Set(["cite", "datetime"]),
  q: new Set(["cite"]),
  blockquote: new Set(["cite"]),
  details: new Set(["open"]),
};

/** Attributes whose value is a URL and therefore has to be resolved. */
const URL_ATTRIBUTES = new Set(["href", "src", "cite"]);

/** Schemes this site is willing to emit. Everything else is refused. */
const ALLOWED_SCHEMES = new Set(["http", "https", "mailto", "tel"]);

/** Generous, but bounded: a runaway paste should fail loudly, not corrupt a row. */
export const MAX_RICH_TEXT_BYTES = 200_000;

/**
 * Named character references that can smuggle a scheme past a naive check.
 *
 * A browser reads `java&Tab;script:` and `javascript&colon;` as
 * `javascript:`, so both have to be resolved before the scheme is read. Only
 * the references that produce a character with meaning inside a URL scheme are
 * listed; anything else is handled by the unresolved-reference rule below.
 */
const NAMED_REFERENCES: Record<string, string> = {
  tab: "\t",
  newline: "\n",
  colon: ":",
  semi: ";",
  sol: "/",
  bsol: "\\",
  quest: "?",
  num: "#",
  period: ".",
  commat: "@",
  excl: "!",
  lpar: "(",
  rpar: ")",
  apos: "'",
  quot: '"',
  nbsp: " ",
  zerowidthspace: "​",
  amp: "&",
};

function codePoint(value: number, fallback: string): string {
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff
    ? String.fromCodePoint(value)
    : fallback;
}

/** Resolves numeric and scheme-relevant named references, ampersands last. */
function decodeReferences(value: string): string {
  let previous = "";
  let current = value;

  // Nested encodings (`&amp;#106;`) need more than one pass; three is ample and
  // bounded, so a crafted value cannot spin here.
  for (let pass = 0; pass < 3 && current !== previous; pass += 1) {
    previous = current;
    current = current
      .replace(/&#x([0-9a-f]+);?/gi, (match, hex) => codePoint(Number.parseInt(hex, 16), match))
      .replace(/&#(\d+);?/g, (match, decimal) => codePoint(Number(decimal), match))
      .replace(/&([a-z][a-z0-9]*);/gi, (match, name) => NAMED_REFERENCES[name.toLowerCase()] ?? match);
  }

  return current;
}

/** Whitespace, control characters and zero-width marks browsers ignore in a scheme. */
function stripInvisible(value: string): string {
  let out = "";
  for (const character of value) {
    const point = character.codePointAt(0) ?? 0;
    if (point <= 0x20 || point === 0x7f) continue;
    if (point >= 0x200b && point <= 0x200d) continue;
    if (point === 0xfeff) continue;
    out += character;
  }
  return out;
}

/**
 * Whether a URL attribute value is one this site will emit.
 *
 * Allow-list, not deny-list: a value either resolves to a scheme on the list or
 * is site-relative, otherwise it goes. A value still carrying an unresolved
 * character reference is refused outright, because what the browser will make
 * of it cannot be reasoned about here.
 */
export function isAllowedUrl(raw: string): boolean {
  const value = stripInvisible(decodeReferences(String(raw || "")));
  if (!value) return false;

  // An unknown `&name;` survived decoding. Legitimate URLs escape their query
  // separators as `&amp;`, which is resolved above, so anything left is either
  // a reference this code does not model or an attempt to hide a scheme.
  if (/&[a-z0-9]+;/i.test(value)) return false;

  // Fragment, root-relative, query-only and protocol-relative-looking values.
  if (value.startsWith("//")) return false; // protocol-relative: scheme is the visitor's
  if (value.startsWith("/") || value.startsWith("#") || value.startsWith("?")) return true;

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value);
  if (!scheme) return true; // no scheme at all: a relative path
  return ALLOWED_SCHEMES.has(scheme[1].toLowerCase());
}

/**
 * Inline style values that reach outside the page.
 *
 * `url()` fetches from wherever it is pointed, which leaks the reader's address
 * to a third party and is the usual way a stored payload phones home;
 * `@import`, `expression()` and `behavior:` are worse. Everything else an
 * editor might set -- colour, alignment, spacing -- is left alone.
 */
function isSafeStyle(value: string): boolean {
  const flat = stripInvisible(decodeReferences(value)).toLowerCase();
  return !/(url\(|@import|expression\(|behaviou?r:|-moz-binding|javascript:)/.test(flat);
}

/**
 * Images have to come from this site.
 *
 * `/media/...` is the library the panel uploads to; `/storage/...` and the
 * other site-relative paths are pictures the original pages shipped with, and
 * articles written before the library existed still point at them. Both are
 * this origin, which is the property that matters -- an external image source
 * hands every reader's address and user agent to whoever hosts it, and is the
 * usual way a stored payload reports back.
 */
function isLocalImageUrl(value: string): boolean {
  const flat = stripInvisible(decodeReferences(String(value || "")));
  if (!flat || flat.includes("..")) return false;
  if (flat.startsWith("//")) return false; // protocol-relative: another origin
  return flat.startsWith("/");
}

/** Every URL in a srcset, without their descriptors. */
function srcsetUrls(value: string): string[] {
  return value
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

export interface SanitiseResult {
  html: string;
  /** Image sources pointing off this origin, so the editor can be told. */
  foreignImages: string[];
}

/**
 * Applies the policy above. Returns the cleaned markup and anything the editor
 * needs to hear about.
 */
export async function sanitiseRichTextDetailed(html: string): Promise<SanitiseResult> {
  if (!html) return { html: "", foreignImages: [] };

  const foreignImages: string[] = [];

  const rewriter = new HTMLRewriter().on("*", {
    element(element) {
      const tag = element.tagName.toLowerCase();

      if (DROPPED_ELEMENTS.has(tag)) {
        element.remove();
        return;
      }

      if (!ALLOWED_ELEMENTS.has(tag)) {
        // Not known to be dangerous, not known to be wanted: keep the words,
        // lose the wrapper.
        element.removeAndKeepContent();
        return;
      }

      const permitted = ELEMENT_ATTRIBUTES[tag];
      let wantsNewTab = false;

      // Snapshotted: HTMLRewriter invalidates the attribute iterator as soon as
      // an attribute is removed.
      for (const [name, value] of [...element.attributes]) {
        const lower = name.toLowerCase();

        const allowed =
          GLOBAL_ATTRIBUTES.has(lower) ||
          permitted?.has(lower) === true ||
          lower.startsWith("aria-") ||
          lower.startsWith("data-") ||
          lower === "style";

        if (!allowed) {
          element.removeAttribute(name);
          continue;
        }

        if (lower === "style") {
          if (!isSafeStyle(value)) element.removeAttribute(name);
          continue;
        }

        if (lower === "target") {
          if (value.trim().toLowerCase() !== "_blank") element.removeAttribute(name);
          else wantsNewTab = true;
          continue;
        }

        if ((tag === "img" || tag === "source") && (lower === "src" || lower === "srcset")) {
          const candidates = lower === "srcset" ? srcsetUrls(value) : [value];
          const foreign = candidates.filter((candidate) => !isLocalImageUrl(candidate));
          if (foreign.length) {
            foreignImages.push(...foreign);
            element.removeAttribute(name);
          }
          continue;
        }

        if (URL_ATTRIBUTES.has(lower) && !isAllowedUrl(value)) {
          element.removeAttribute(name);
        }
      }

      // A new-tab link without this hands the opener to whatever it opens.
      if (tag === "a" && wantsNewTab) {
        element.setAttribute("rel", "noopener noreferrer");
      }
    },
  });

  const cleaned = await rewriter.transform(new Response(html)).text();
  return { html: cleaned, foreignImages: [...new Set(foreignImages)] };
}

/** The cleaned markup alone, for callers that only need the string. */
export async function sanitiseRichText(html: string): Promise<string> {
  return (await sanitiseRichTextDetailed(html)).html;
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
  const result = await sanitiseRichTextDetailed(value.trim());

  if (result.foreignImages.length) {
    const first = result.foreignImages[0].slice(0, 80);
    return {
      error: `${label} has an image hosted somewhere else (${first}). Upload it to the media library and use its /media/... path.`,
    };
  }

  if (new TextEncoder().encode(result.html).length > MAX_RICH_TEXT_BYTES) {
    return {
      error: `${label} is too long to save. Keep it under ${Math.floor(MAX_RICH_TEXT_BYTES / 1000)}KB of HTML.`,
    };
  }

  return { html: result.html };
}
