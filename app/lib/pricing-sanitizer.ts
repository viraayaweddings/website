const priceAmountPattern =
  /(?:₹\s*(?:<!--\s*-->)?\s*[\d,]+(?:\s*(?:<!--\s*-->)?\s*(?:\+|\/-?|\/\s*(?:day|plate)))?|Rs\.?\s*[\d,]+|Starting\s+Rs\.?\s*[\d,]+|Per\s+(?:plate|day)\s*₹?\s*(?:<!--\s*-->)?\s*[\d,]+\+?|Total\s+Saving\s*₹?\s*(?:<!--\s*-->)?\s*[\d,]+(?:\/-?)?)/gi;

const pricingLinePattern =
  /(?:Price Range|How much does .*? cost\?|What is the cost of booking .*?\?|Budget \([^)]*\)|Travel Costs|Booking Policy|What is the price for .*?\?)[^<\n"]*/gi;

const pricingKeyPattern =
  /^(?:price|priceValue|minPrice|maxPrice|minPackageCost|maxPackageCost|minDecorCost|startsAt|indoorPrice|outdoorPrice)$/i;

const pricingObjectKeyPattern = /^(?:perPlateCost|perDayCost)$/i;

const pricingFilterLabelPattern =
  /^(?:pricing|price|price range|budget|budget friendly|per plate|per day)$/i;

function isPricingFilterOption(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return ["label", "name", "title", "key", "labelSlug", "groupKey"].some((field) => {
    const item = value[field];
    return typeof item === "string" && pricingFilterLabelPattern.test(item.trim());
  });
}

export function stripPriceText(value: string) {
  return value
    .replace(priceAmountPattern, "")
    .replace(pricingLinePattern, "")
    .replace(/\s+-\s+Price\s*&amp;\s*Reviews/gi, " - Reviews")
    .replace(/\s+-\s+Price\s+&\s+Reviews/gi, " - Reviews")
    .replace(/\s+-\s+Wedding Venue Cost, Photos/gi, " - Wedding Venue Photos")
    .replace(/\bprice details\b/gi, "details")
    .replace(/\bprices, photos\b/gi, "photos")
    .replace(/\bpricing,?\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function sanitizePricingData(value: any, key = ""): any {
  if (pricingObjectKeyPattern.test(key)) {
    return { minValue: null, maxValue: null };
  }

  if (pricingKeyPattern.test(key)) {
    return null;
  }

  if (typeof value === "string") {
    return stripPriceText(value);
  }

  if (Array.isArray(value)) {
    return value
      .filter((item) => !isPricingFilterOption(item))
      .map((item) => sanitizePricingData(item))
      .filter((item) => {
        if (!item || typeof item !== "object" || !("insert" in item)) return true;
        return typeof item.insert !== "string" || item.insert.trim() !== "";
      });
  }

  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [itemKey, itemValue] of Object.entries(value)) {
      out[itemKey] = sanitizePricingData(itemValue, itemKey);
    }
    return out;
  }

  return value;
}

export function sanitizePricingMarkup(markup: string) {
  return markup
    .replace(/(<title>)([\s\S]*?)(<\/title>)/gi, (_match, open, title, close) => {
      return `${open}${stripPriceText(title)}${close}`;
    })
    .replace(/(<meta\b[^>]*\bcontent=")([^"]*)("[^>]*>)/gi, (_match, open, content, close) => {
      return `${open}${stripPriceText(content)}${close}`;
    })
    .replace(/,\s*"priceRange"\s*:\s*"[^"]*"/gi, "")
    .replace(/"priceRange"\s*:\s*"[^"]*"\s*,?/gi, "")
    .replace(/<(button|li|div|span)\b[^>]*>\s*(?:Pricing|Budget Friendly)\s*<\/\1>/gi, "")
    .replace(priceAmountPattern, "")
    .replace(pricingLinePattern, "")
    .replace(/\b(?:Per plate|Per day|Total Saving|Budget Friendly)\b/gi, "");
}

export const PRICING_RUNTIME_SCRIPT = `
<script id="viraaya-pricing-sanitizer">
(() => {
  const priceText = /(₹\\s*[\\d,]+|Rs\\.?\\s*[\\d,]+|Starting\\s+Rs|Per\\s+(?:plate|day)\\s*₹?|Total\\s+Saving|Price\\s+Range|Budget\\s*(?:Friendly|\\()|Travel\\s+Costs|Payment\\s+On\\s+Booking|cost\\s+of\\s+booking|How\\s+much\\s+does\\s+.*?\\s+cost\\?|What\\s+is\\s+the\\s+price\\s+for)/i;
  const metadataText = /(Price\\s*&\\s*Reviews|Wedding\\s+Venue\\s+Cost|price\\s+details|prices,\\s*photos|pricing)/i;
  const filterText = /^(?:Pricing|Budget Friendly)$/i;

  const scrubString = (value) => {
    if (!value || typeof value !== "string") return value;
    return value
      .replace(/\\s+-\\s+Price\\s*&\\s*Reviews/gi, " - Reviews")
      .replace(/\\s+-\\s+Wedding Venue Cost, Photos/gi, " - Wedding Venue Photos")
      .replace(/price details/gi, "details")
      .replace(/prices,\\s*photos/gi, "photos")
      .replace(/pricing,?\\s*/gi, "")
      .replace(/₹\\s*[\\d,]+(?:\\s*(?:\\+|\\/-?|\\/\\s*(?:day|plate)))?/gi, "")
      .replace(/Rs\\.?\\s*[\\d,]+/gi, "")
      .replace(/Starting\\s+Rs\\.?\\s*[\\d,]+/gi, "")
      .replace(/Per\\s+(?:plate|day)\\s*₹?\\s*[\\d,]*\\+?/gi, "")
      .replace(/Total\\s+Saving\\s*₹?\\s*[\\d,]+(?:\\/-?)?/gi, "")
      .replace(/Budget\\s+Friendly/gi, "")
      .replace(/\\s{2,}/g, " ")
      .trim();
  };

  const removePricingNode = (node) => {
    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (!element) return;
    const target = element.closest("li,p,h2,h3,h4,span,div");
    if (!target || target === document.body || target === document.documentElement) return;
    const text = target.textContent || "";
    if (text.length < 260 || /^(?:li|p|h2|h3|h4|span)$/i.test(target.tagName)) {
      target.remove();
      return;
    }
    const next = scrubString(text);
    if (next !== text && element.childNodes.length === 1) element.textContent = next;
  };

  const sweep = () => {
    document.querySelectorAll("title,meta[property],meta[name]").forEach((node) => {
      if (node.tagName === "TITLE") {
        node.textContent = scrubString(node.textContent || "");
      } else {
        const content = node.getAttribute("content");
        if (content && metadataText.test(content)) node.setAttribute("content", scrubString(content));
      }
    });

    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const text = node.nodeValue || "";
      if (priceText.test(text) || filterText.test(text.trim())) removePricingNode(node);
      else if (metadataText.test(text)) node.nodeValue = scrubString(text);
    });
  };

  sweep();
  [120, 400, 1000, 2500, 5000].forEach((delay) => setTimeout(sweep, delay));
  window.addEventListener("pageshow", sweep, { once: true });
})();
</script>`;
