/**
 * WordPress category pages embedded an "Our Products" card grid (image + title
 * + Read More + "inquiry now") inside the category body. The storefront already
 * renders a proper catalogue grid from CMS products — strip the legacy markup
 * so each product image appears once, cleanly, with site-relative URLs.
 */

/** Remove only complete imported card runs when preparing editable category copy. */
export function cleanCategoryEditorBody(html: string) {
  const heading = /<(h[1-6]|p)\b[^>]*>\s*(?:<strong>\s*)?(?:our\s+)?products\s*(?:<\/strong>\s*)?<\/\1>/gi;
  const card = /(?:\s|<p>\s*<\/p>)*<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>\s*<img\b[^>]*>(?:(?!<\/?a\b)[\s\S])*?<\/a>\s*<a\b[^>]*\bhref=["']\1["'][^>]*>\s*Read\s+More\s*<\/a>(?:\s*inquiry\s+now\b)?(?:\s*<p>\s*<\/p>)*/iy;
  let result = "";
  let cursor = 0;
  for (const marker of html.matchAll(heading)) {
    const start = marker.index!;
    if (start < cursor) continue;
    let end = start + marker[0].length;
    card.lastIndex = end;
    while (card.test(html)) end = card.lastIndex;
    if (end === start + marker[0].length) continue;
    result += html.slice(cursor, start);
    cursor = end;
  }
  return result + html.slice(cursor);
}

function tidyEmptyBlocks(html: string) {
  return html
    .replace(/(?:<p>\s*(?:&nbsp;|\s)*<\/p>\s*){2,}/gi, "")
    .replace(/^\s*(?:<p>\s*(?:&nbsp;|\s)*<\/p>\s*)+/i, "")
    .replace(/(?:<p>\s*(?:&nbsp;|\s)*<\/p>\s*)+$/i, "")
    .replace(/(?:\n\s*){3,}/g, "\n\n")
    .trim();
}

function plainHeadingText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findOurProductsMarker(html: string) {
  const tagged = [
    ...html.matchAll(/<(h[1-6]|p|div|span)\b[^>]*>([\s\S]*?)<\/\1>/gi),
  ].find((match) => {
    const text = plainHeadingText(match[2] ?? "");
    return /^(?:our\s+)?products$/.test(text);
  });
  if (tagged && tagged.index !== undefined) {
    return { index: tagged.index, length: tagged[0].length };
  }
  return null;
}

function isArticleSectionHeading(text: string) {
  return /^(?:key features|overview|understanding\b|why\b|types?\b|core components|industrial applications|benefits\b|manufacturing\b|customization\b|contact\b|frequently asked|faq\b|what (?:is|does|are)\b|how (?:do|to|does)\b|applications\b|operational\b|economic\b|sustainability\b|designed for\b|maintenance\b|transforming\b|role of\b|working\b|technical\b|selection\b)/i.test(
    text,
  );
}

function findNextArticleSection(html: string, fromIndex: number) {
  const slice = html.slice(fromIndex);
  for (const match of slice.matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    if (match.index === undefined) continue;
    const text = plainHeadingText(match[2] ?? "");
    if (!text || /^(?:our\s+)?products$/.test(text)) continue;
    if (isArticleSectionHeading(text)) {
      return fromIndex + match.index;
    }
  }
  return -1;
}

function looksLikeLegacyProductCards(chunk: string) {
  const hasReadMore = /Read\s*More/i.test(chunk);
  const hasInquiry = /inquiry\s*now/i.test(chunk);
  const hasImg = /<img\b/i.test(chunk);
  // Cards may link to /products/... or other catalogue paths
  // (e.g. /scrap-baling-machines/..., /baling-machines/...).
  const hasCardLink =
    /href=["'][^"']*(?:\/products\/|\/scrap-baling-machines\/|\/baling-machines\/|\/hydraulic-|\/leveling-jacks\/|\/waste-paper)/i.test(
      chunk,
    ) || /jyotihydraulic\.com\//i.test(chunk);
  return hasImg && hasCardLink && (hasReadMore || hasInquiry);
}

/** Convert absolute live.com product/page links to site-relative paths. */
export function rewriteLegacySiteUrls(html: string) {
  if (!html) return html;
  return html.replace(
    /https?:\/\/(?:www\.)?jyotihydraulic\.com(\/[^"'>\s]*)/gi,
    (_full, path: string) => {
      if (!path || path === "/") return "/";
      return path.endsWith("/") || /\.[a-z0-9]{2,5}$/i.test(path)
        ? path
        : `${path}/`;
    },
  );
}

/**
 * Remove the imported "Our Products" listing from category HTML.
 * Keeps the narrative sections that follow (Understanding…, Why…, FAQs…).
 */
export function removeLegacyProductListing(html: string) {
  if (!html) return html;
  const withoutCards = cleanCategoryEditorBody(html);
  if (withoutCards !== html) return rewriteLegacySiteUrls(withoutCards);
  let current = html;
  let changed = false;

  const marker = findOurProductsMarker(current);
  if (marker) {
    const afterStart = marker.index + marker.length;
    const trailing = current.slice(afterStart);
    if (looksLikeLegacyProductCards(trailing.slice(0, 20_000))) {
      const nextSection = findNextArticleSection(current, afterStart);
      if (nextSection >= 0) {
        current = `${current.slice(0, marker.index)}${current.slice(nextSection)}`;
        changed = true;
      } else {
        // No clear next section — drop from Our Products to end.
        current = current.slice(0, marker.index);
        changed = true;
      }
    } else {
      // Empty or non-card "Our Products" heading — still remove the label.
      const nextSection = findNextArticleSection(current, afterStart);
      const headingOnly = !/<img\b/i.test(trailing.slice(0, 800));
      if (headingOnly) {
        current =
          nextSection >= 0
            ? `${current.slice(0, marker.index)}${current.slice(nextSection)}`
            : current.slice(0, marker.index);
        changed = true;
      }
    }
  }

  // Orphan Elementor product cards with img + Read More (any catalogue path).
  const cardOpen =
    /<a\b[^>]*href=["'][^"']*(?:\/products\/|\/scrap-baling-machines\/|\/baling-machines\/|\/hydraulic-|\/leveling-jacks\/|\/waste-paper|jyotihydraulic\.com\/)[^"']*["'][^>]*>/gi;
  let rebuilt = "";
  let cursor = 0;
  let openMatch: RegExpExecArray | null;
  while ((openMatch = cardOpen.exec(current))) {
    const start = openMatch.index;
    const openEnd = start + openMatch[0].length;
    const window = current.slice(openEnd, openEnd + 4000);
    if (!/<(?:img|h[1-3])\b/i.test(window) || !/Read\s*More|inquiry\s*now/i.test(window)) {
      continue;
    }
    const label = [...window.matchAll(/Read\s*More|inquiry\s*now/gi)].at(-1);
    const searchFrom = label?.index !== undefined ? label.index : 0;
    const closeRel = window.slice(searchFrom).search(/<\/a>/i);
    if (closeRel < 0) continue;
    const end = openEnd + searchFrom + closeRel + 4;
    rebuilt += current.slice(cursor, start);
    cursor = end;
    cardOpen.lastIndex = end;
    changed = true;
  }
  rebuilt += current.slice(cursor);
  current = rebuilt;

  if (/inquiry\s*now/i.test(current)) {
    current = current.replace(/\binquiry\s*now\b/gi, "");
    changed = true;
  }
  if (/<a\b[^>]*>\s*Read\s*More\s*<\/a>/i.test(current)) {
    current = current.replace(/<a\b[^>]*>\s*Read\s*More\s*<\/a>/gi, "");
    changed = true;
  }

  const withUrls = rewriteLegacySiteUrls(current);
  if (withUrls !== current) {
    current = withUrls;
    changed = true;
  }

  return changed ? tidyEmptyBlocks(current) : rewriteLegacySiteUrls(html);
}
