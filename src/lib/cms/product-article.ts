import { cleanPublicExcerpt } from "@/lib/cms/clean-copy";

function plainContent(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeProductSummary(value: string) {
  let plain = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const cut = plain.search(
    /\b(?:our products|read more|get in touch|get your quote|contact with us|feel free to write|key features)\b/i,
  );
  if (cut > 0) plain = plain.slice(0, cut).trim();
  plain = plain
    .replace(/\+?\d[\d\s().-]{8,}\d/g, " ")
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const repeated = plain.match(/^(.{12,100}?[.!?])(?:\s+\1)+/i);
  if (repeated) plain = repeated[1];
  return cleanPublicExcerpt(plain, 320);
}

export function removeLeadingSummaryHtml(html: string, summary: string) {
  const target = plainContent(summary);
  if (target.length < 40) return html;
  const blocks = [...html.matchAll(/<(h[1-6]|p)\b[^>]*>[\s\S]*?<\/\1>/gi)];
  if (!blocks.length || blocks[0].index === undefined) return html;

  let end = 0;
  let consumed = "";
  let removed = false;
  for (const block of blocks) {
    if (block.index !== end) break;
    const text = plainContent(block[0]);
    if (!text) {
      end += block[0].length;
      continue;
    }
    const next = `${consumed} ${text}`.trim();
    if (!target.startsWith(next) && !next.startsWith(target)) break;
    consumed = next;
    end = block.index + block[0].length;
    removed = true;
    if (consumed.length >= target.length) break;
  }
  return removed ? html.slice(end).trim() : html;
}

function removeLegacyContactBlocks(html: string) {
  return html.replace(/<(p|div|li)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, body) => {
    const text = body.replace(/<[^>]+>/g, " ");
    const hasContactValue =
      /(?:\+?\d[\d\s().-]{8,}\d|[\w.+-]+@[\w.-]+\.\w+)/i.test(text);
    const isContactIconOnly = /^[\s☎✉📞📧️]+$/u.test(text);
    return hasContactValue || isContactIconOnly
      ? ""
      : `<${tag}${attrs}>${body}</${tag}>`;
  });
}

export function readableProductArticle(html: string) {
  return removeLegacyContactBlocks(removeLegacyBlogEmbed(html))
    .replace(/inquiry now/gi, "")
    .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, "")
    .replace(/<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/gi, "")
    .replace(/<ul>\s*<\/ul>/gi, "")
    .trim();
}

export function removeLegacyBlogEmbed(html: string) {
  const marker = /<(p|h[1-6]|div|section)\b[^>]*>\s*(?:<strong>)?\s*(?:Our\s+)?Blogs\s*(?:<\/strong>)?\s*<\/\1>/i.exec(
    html,
  );
  if (!marker || marker.index === undefined) return html;
  const trailingStart = marker.index + marker[0].length;
  const trailing = html.slice(trailingStart);
  if (!/(?:<img\b|<figure\b|Read\s*More)/i.test(trailing)) return html;
  // Imported blog cards can contain their own headings. Removing only up to
  // the next heading leaves the remaining cards in the same product article.
  // Use the final Read More marker as the end of the legacy block, preserving
  // any genuine product section that follows it.
  const readMoreMatches = [...trailing.matchAll(/Read\s*More/gi)];
  const lastReadMore = readMoreMatches.at(-1);
  if (!lastReadMore || lastReadMore.index === undefined) {
    return html.slice(0, marker.index).trim();
  }
  const afterReadMore = trailing.slice(
    lastReadMore.index + lastReadMore[0].length,
  );
  const closingTag = /<\/(?:p|a|div|li)>/i.exec(afterReadMore);
  const consumed = closingTag
    ? lastReadMore.index + lastReadMore[0].length + closingTag.index + closingTag[0].length
    : trailing.length;
  return `${html.slice(0, marker.index).trim()}${html.slice(trailingStart + consumed)}`.trim();
}

/**
 * Imported location pages occasionally contain copy from the Bihar template.
 * Keep the public page aligned with its saved location until the CMS record is
 * manually corrected, and remove imported blog-card markup from the article.
 */
export function normalizeLocationBody(html: string, locationName: string) {
  const location = locationName.trim();
  if (!location) return removeLegacyBlogEmbed(html);
  return removeLegacyBlogEmbed(html).replace(
    /\bBihar(?:\s+Sharif)?\b/gi,
    location,
  );
}

/**
 * Product images and related blog cards have their own CMS blocks. Keep them
 * out of the product description so editing copy cannot accidentally publish
 * duplicate media or blog markup.
 */
export function normalizeProductEditorHtml(html: string) {
  return removeLegacyContactBlocks(removeLegacyBlogEmbed(html))
    .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/gi, "")
    .trim();
}

/**
 * WordPress imported related-post cards as links inside the product body.
 * Keep that relationship, but render the cards through the CMS instead of
 * leaving their markup inside the product article.
 */
export function linkedArticlePaths(html: string) {
  const paths: string[] = [];
  const anchors = html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi);
  for (const anchor of anchors) {
    const href = anchor[1];
    if (!href) continue;
    try {
      const url = new URL(href, "https://jyotihydraulic.com");
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (host !== "jyotihydraulic.com") continue;
      const path = url.pathname.replace(/^\/+|\/+$/g, "");
      if (path && !paths.includes(path)) paths.push(path);
    } catch {
      // Ignore malformed imported anchors; they should not break the page.
    }
  }
  return paths;
}

function normalizedHeading(value: string) {
  return value.replace(/<[^>]+>/g, " ").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

/**
 * Keeps the opening product introduction for the hero overview. Everything
 * from the first actual section heading onward remains in the Overview tab.
 * This prevents the short hero copy from being repeated below the gallery.
 */
export function splitProductIntroduction(html: string, productTitle: string) {
  const title = normalizedHeading(productTitle);
  const headings = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)];
  const boundary = headings.find((heading) => {
    const candidate = normalizedHeading(heading[1] ?? "");
    return !candidate || !title || !candidate.startsWith(title.slice(0, 18));
  });
  if (!boundary || boundary.index === undefined) {
    return { introductionHtml: html, detailHtml: "" };
  }
  return {
    introductionHtml: html.slice(0, boundary.index),
    detailHtml: html.slice(boundary.index),
  };
}
