import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "h2",
  "h3",
  "h4",
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "blockquote",
];

const allowedHtmlBlockTags = [
  ...allowedTags,
  "div",
  "span",
  "section",
  "article",
  "header",
  "footer",
  "nav",
  "main",
  "figure",
  "figcaption",
];

export function sanitizeRichText(html: string) {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: "noopener noreferrer",
        },
      }),
    },
  }).trim();
}

/**
 * Sanitizes administrator-authored header/footer markup while preserving
 * valid JSON-LD blocks. Executable scripts, inline event handlers, iframes and
 * other unsafe embeds are still removed.
 */
export function sanitizeHtmlBlock(html: string) {
  const jsonLd: string[] = [];
  const withoutJsonLd = html.replace(
    /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    (_match, body: string) => {
      const source = body.trim();
      try {
        JSON.parse(source);
        jsonLd.push(`<script type="application/ld+json">${source}</script>`);
      } catch {
        // Invalid JSON-LD is discarded instead of being published as code.
      }
      return "";
    },
  );
  const cleaned = sanitizeHtml(withoutJsonLd, {
    allowedTags: allowedHtmlBlockTags,
    allowedAttributes: {
      "*": ["class", "id", "role", "aria-label", "aria-hidden"],
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: "noopener noreferrer",
        },
      }),
    },
  }).trim();
  return [cleaned, ...jsonLd].filter(Boolean).join("\n").trim();
}
