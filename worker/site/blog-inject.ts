/**
 * HTMLRewriter handlers that fill the blog shell with database content.
 *
 * Kept separate from inject.ts because an article has considerably more slots
 * than the site chrome does.
 */
import type { BlogPost } from "../db/schema";
import { renderLabel, type ResolvedLabels } from "./labels";
import {
  parseFaqs,
  renderBannerMeta,
  renderFaqItems,
  renderListingCards,
  renderTocItems,
} from "./blog";

/** Replaces the text of a whole element in one go, buffering its chunks. */
function replaceText(rewriter: HTMLRewriter, selector: string, value: string): void {
  rewriter.on(selector, {
    element(element) {
      element.setInnerContent(value);
    },
  });
}

export function applyPostHandlers(
  rewriter: HTMLRewriter,
  post: BlogPost,
  /** Editable section headings. */
  labels?: ResolvedLabels,
): void {
  const canonical = `/blogs/${post.slug}`;

  // --- head ---------------------------------------------------------------
  replaceText(rewriter, "title", post.seoTitle);

  const metaContent: [string, string][] = [
    ['meta[name="description"]', post.metaDescription],
    ['meta[property="og:title"]', post.seoTitle],
    ['meta[property="og:description"]', post.metaDescription],
    ['meta[property="og:image"]', post.ogImage],
    ['meta[property="og:url"]', canonical],
    ['meta[name="twitter:title"]', post.seoTitle],
    ['meta[name="twitter:description"]', post.metaDescription],
    ['meta[name="twitter:image"]', post.ogImage],
  ];

  for (const [selector, value] of metaContent) {
    rewriter.on(selector, {
      element(element) {
        element.setAttribute("content", value);
      },
    });
  }

  rewriter.on('link[rel="canonical"]', {
    element(element) {
      element.setAttribute("href", canonical);
    },
  });

  // --- banner -------------------------------------------------------------
  rewriter.on(".banner-wrapper__inner .item", {
    element(element) {
      if (!post.bannerImage) return;
      element.setAttribute("style", `background-image: url('${post.bannerImage}');`);
    },
  });

  replaceText(rewriter, ".blog-banner-breadcrumb .breadcrumb-item.active", post.category);
  replaceText(rewriter, "h1.blog-banner-title", post.heading);

  rewriter.on(".blog-banner-meta", {
    element(element) {
      element.setInnerContent(renderBannerMeta(post), { html: true });
    },
  });

  // --- article ------------------------------------------------------------
  rewriter.on(".blog-description", {
    element(element) {
      // Stored as HTML by design; authored only by signed-in editors.
      element.setInnerContent(post.bodyHtml, { html: true });
    },
  });

  rewriter.on(".blog-toc-list", {
    element(element) {
      element.setInnerContent(renderTocItems(post.bodyHtml), { html: true });
    },
  });

  rewriter.on("#blogFaqAccordion", {
    element(element) {
      element.setInnerContent(renderFaqItems(parseFaqs(post.faqs)), { html: true });
    },
  });

  if (labels) {
    // The contents heading is the one span in the header without a class.
    rewriter.on(".blog-toc-header span", {
      element(element) {
        if (element.hasAttribute("class")) return;
        element.setInnerContent(renderLabel(labels, "blog.toc", "").html, { html: true });
      },
    });

    rewriter.on(".faq-wrapper h2.all-heading", {
      element(element) {
        const rendered = renderLabel(labels, "blog.faq", "fw-600 text-primary");
        element.setInnerContent(rendered.html, { html: rendered.hasHtml });
      },
    });
  }

  // Ties an enquiry submitted from this page back to the article.
  rewriter.on('input[name="source_page"]', {
    element(element) {
      element.setAttribute("value", post.slug);
    },
  });
}

/**
 * The listing grid. Each card lives in its own column div, so the row that
 * contains them is replaced wholesale.
 */
export function applyListingHandlers(
  rewriter: HTMLRewriter,
  posts: BlogPost[],
  labels?: ResolvedLabels,
): void {
  rewriter.on(".blog-wrapper .container > .row", {
    element(element) {
      element.setInnerContent(renderListingCards(posts, labels), { html: true });
    },
  });
}
