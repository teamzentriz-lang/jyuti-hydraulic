export function readableProductArticle(html: string) {
  return removeLegacyBlogEmbed(html)
    .replace(/inquiry now/gi, "")
    .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, "")
    .replace(/<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/gi, "")
    .replace(/<ul>\s*<\/ul>/gi, "")
    .trim();
}

export function removeLegacyBlogEmbed(html: string) {
  const marker = /<(p|h[1-6])\b[^>]*>\s*(?:<strong>)?\s*Blogs\s*(?:<\/strong>)?\s*<\/\1>/i.exec(
    html,
  );
  if (!marker || marker.index === undefined) return html;
  const trailingStart = marker.index + marker[0].length;
  const trailing = html.slice(trailingStart);
  if (!/(?:<img\b|<figure\b|Read\s*More)/i.test(trailing)) return html;
  const nextHeading = trailing.search(/<h[1-6]\b/i);
  const end = nextHeading >= 0 ? trailingStart + nextHeading : html.length;
  return html.slice(0, marker.index) + html.slice(end);
}

/**
 * Product images and related blog cards have their own CMS blocks. Keep them
 * out of the product description so editing copy cannot accidentally publish
 * duplicate media or blog markup.
 */
export function normalizeProductEditorHtml(html: string) {
  const withoutBlog = html.replace(
    /<(p|h[1-6])\b[^>]*>\s*(?:<strong>)?\s*Blogs\s*(?:<\/strong>)?\s*<\/\1>[\s\S]*?(?=<h[1-6]\b|$)/i,
    "",
  );
  return withoutBlog
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
