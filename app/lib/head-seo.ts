// Rewrites the server-rendered <title> and SEO <meta> tags of a captured detail
// template to per-vendor values. The captured templates carry a single static
// title/description (from whichever vendor was captured), so without this every
// venue/photographer/decorator detail page ships identical <head> SEO until the
// client bundle hydrates and corrects document.title. This makes the initial
// HTML (what crawlers see) unique per vendor. Purely <head> metadata — no
// visible page change.

function escapeHtmlText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtmlAttr(value: string) {
  return escapeHtmlText(value).replace(/"/g, "&quot;");
}

// Set the content="" of a <meta> tag identified by an attribute (e.g. name or
// property), regardless of attribute order. No-op if the tag isn't present.
function setMetaContent(html: string, idAttr: string, idValue: string, content: string) {
  const tagRe = new RegExp(`<meta\\b[^>]*\\b${idAttr}=["']${idValue}["'][^>]*>`, "i");
  return html.replace(tagRe, (tag) => {
    if (/\bcontent=["']/i.test(tag)) {
      return tag.replace(/\bcontent=["'][^"']*["']/i, `content="${escapeHtmlAttr(content)}"`);
    }
    return tag.replace(/\s*\/?>$/, ` content="${escapeHtmlAttr(content)}">`);
  });
}

export function rewriteHeadSeo(
  html: string,
  { title, description }: { title?: string | null; description?: string | null }
) {
  let out = html;
  if (title) {
    out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(title)}</title>`);
    out = setMetaContent(out, "property", "og:title", title);
    out = setMetaContent(out, "name", "twitter:title", title);
  }
  if (description) {
    out = setMetaContent(out, "name", "description", description);
    out = setMetaContent(out, "property", "og:description", description);
    out = setMetaContent(out, "name", "twitter:description", description);
  }
  return out;
}
