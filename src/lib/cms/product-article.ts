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
