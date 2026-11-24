/**
 * WordPress category pages embedded an "Our Products" card grid (image + title
 * + Read More + "inquiry now") inside the category body. The storefront already
 * renders a proper catalogue grid from CMS products — strip the legacy markup
 * so each product image appears once, cleanly.
 */

function tidyEmptyBlocks(html: string) {
  return html
    .replace(/(?:<p>\s*(?:&nbsp;|\s)*<\/p>\s*){2,}/gi, "")
    .replace(/^\s*(?:<p>\s*(?:&nbsp;|\s)*<\/p>\s*)+/i, "")
    .replace(/(?:<p>\s*(?:&nbsp;|\s)*<\/p>\s*)+$/i, "")
    .replace(/(?:\n\s*){3,}/g, "\n\n")
    .trim();
}

function findOurProductsMarker(html: string) {
  const tagged = [
    ...html.matchAll(/<(h[1-6]|p|div|span)\b[^>]*>([\s\S]*?)<\/\1>/gi),
  ].find((match) => {
    const text = (match[2] ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    return /^(?:our\s+)?products$/.test(text);
  });
  if (tagged && tagged.index !== undefined) {
    return { index: tagged.index, length: tagged[0].length };
  }
  return null;
}

function looksLikeLegacyProductCards(chunk: string) {
  const hasReadMore = /Read\s*More/i.test(chunk);
  const hasInquiry = /inquiry\s*now/i.test(chunk);
  const hasImg = /<img\b/i.test(chunk);
  const hasProductLink = /\/products\//i.test(chunk);
  return hasImg && hasProductLink && (hasReadMore || hasInquiry);
}

/**
 * Remove the imported "Our Products" listing from category HTML.
 * Keeps the narrative sections that follow (Understanding…, Why…, FAQs…).
 */
export function removeLegacyProductListing(html: string) {
  if (!html) return html;
  let current = html;
  let changed = false;

  const marker = findOurProductsMarker(current);
  if (marker) {
    const afterStart = marker.index + marker.length;
    const trailing = current.slice(afterStart);
    if (looksLikeLegacyProductCards(trailing.slice(0, 12_000))) {
      const inquiryMatches = [...trailing.matchAll(/inquiry\s*now/gi)];
      const lastInquiry = inquiryMatches.at(-1);
      if (lastInquiry && lastInquiry.index !== undefined) {
        const afterInquiry = trailing.slice(
          lastInquiry.index + lastInquiry[0].length,
        );
        // Skip closing tags / whitespace, then resume at the next real section heading.
        const nextHeading = afterInquiry.search(/<(h[1-3])\b/i);
        if (nextHeading >= 0) {
          const cutEnd =
            afterStart +
            lastInquiry.index +
            lastInquiry[0].length +
            nextHeading;
          current = `${current.slice(0, marker.index)}${current.slice(cutEnd)}`;
          changed = true;
        } else {
          current = current.slice(0, marker.index);
          changed = true;
        }
      }
    }
  }

  // Orphan Elementor product cards still wrapping img + Read More + inquiry now.
  const withoutCards = current.replace(
    /<a\b[^>]*href=["'][^"']*\/products\/[^"']*["'][^>]*>[\s\S]*?(?:Read\s*More[\s\S]*?)?inquiry\s*now[\s\S]*?<\/a>/gi,
    () => {
      changed = true;
      return "";
    },
  );
  current = withoutCards;

  // Loose "inquiry now" labels left after partial cleanup.
  if (/inquiry\s*now/i.test(current)) {
    current = current.replace(/\binquiry\s*now\b/gi, "");
    changed = true;
  }

  return changed ? tidyEmptyBlocks(current) : html;
}
