export function readableProductArticle(html: string) {
  const withoutLegacyBlogCard = html.replace(
    /<(p|h[1-6])\b[^>]*>\s*(?:<strong>)?\s*Blogs\s*(?:<\/strong>)?\s*<\/\1>[\s\S]*?(?=<h2\b|$)/i,
    (match) => /(?:<img\b|<figure\b|Read\s*More)/i.test(match) ? "" : match,
  );
  return withoutLegacyBlogCard
    .replace(/inquiry now/gi, "")
    .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, "")
    .replace(/<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/gi, "")
    .replace(/<ul>\s*<\/ul>/gi, "")
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
