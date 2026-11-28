/**
 * WordPress imports embedded related-blog cards into product and city HTML.
 * Those cards are not real CMS blog records — they are leftover markup that
 * must be stripped from descriptions without touching the independent Blog
 * system or legitimate page copy.
 */

function plainBlockText(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Headings/labels that mark the start of an imported blog-card block. */
function isBlogSectionMarker(text: string) {
  return /^(?:our\s+)?(?:related\s+|latest\s+)?blogs?$/.test(text);
}

function isDateLabel(text: string) {
  return /^\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/.test(
    text,
  );
}

function isReadMoreLabel(text: string) {
  return /^read\s*more$/.test(text);
}

/**
 * Confirm the trailing markup looks like imported blog cards, not normal copy
 * that happens to mention the word "blogs".
 */
function looksLikeLegacyBlogCardTrail(trailing: string) {
  if (textOnlyBlogCardEnd(trailing) > 0) return true;
  const hasReadMore = /Read\s*More/i.test(trailing);
  const hasMedia = /<(?:img|figure)\b/i.test(trailing);
  const hasCardList =
    /<ul\b[\s\S]*<(?:img|figure|h2|h3)\b[\s\S]*Read\s*More/i.test(trailing) ||
    /<ul\b[\s\S]*<(?:img|figure)\b/i.test(trailing);
  if (!hasReadMore && !hasMedia && !hasCardList) return false;
  if (hasReadMore || hasCardList) return true;
  return /\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(
    trailing,
  );
}

type MarkerMatch = { index: number; length: number };

/**
 * Find either a tagged heading/paragraph whose only text is "Blogs", or the
 * common WordPress bare-text form: `...offer.</p>  Blogs  <ul>...</ul>`.
 */
function findBlogSectionMarker(html: string): MarkerMatch | undefined {
  const tagged = [...html.matchAll(/<(p|h[1-6]|div|section)\b[^>]*>([\s\S]*?)<\/\1>/gi)].find(
    (match) => isBlogSectionMarker(plainBlockText(match[2] ?? "")),
  );
  if (tagged && tagged.index !== undefined) {
    return { index: tagged.index, length: tagged[0].length };
  }

  const bare = [...html.matchAll(/(?:^|>)(\s*)((?:Our\s+)?(?:Related\s+|Latest\s+)?Blogs?)(?=\s*<)/gi)].find(
    (match) => {
      if (match.index === undefined) return false;
      const label = match[2] ?? "";
      return isBlogSectionMarker(label.toLowerCase());
    },
  );
  if (!bare || bare.index === undefined) return undefined;

  const startsWithGt = html[bare.index] === ">";
  const labelOffset = (startsWithGt ? 1 : 0) + (bare[1]?.length ?? 0);
  const index = bare.index + labelOffset;
  const length = bare[2]?.length ?? 0;
  return length ? { index, length } : undefined;
}

/** Find the end index of a balanced HTML element starting at `start`. */
function findBalancedElementEnd(html: string, start: number) {
  const open = /^<([a-z0-9]+)\b[^>]*>/i.exec(html.slice(start));
  if (!open) return -1;
  const tag = open[1].toLowerCase();
  if (/^(img|br|hr|meta|input|link|source)$/i.test(tag)) {
    return start + open[0].length;
  }

  const re = new RegExp(`<(/)?${tag}\\b[^>]*>`, "gi");
  re.lastIndex = start;
  let depth = 0;
  let match = re.exec(html);
  while (match) {
    const isClose = Boolean(match[1]);
    const isSelfClosing = /\/>\s*$/.test(match[0]);
    if (isClose) {
      depth -= 1;
      if (depth === 0) return match.index + match[0].length;
    } else if (!isSelfClosing) {
      depth += 1;
    }
    match = re.exec(html);
  }
  return -1;
}

function nextTopLevelChunk(html: string, from: number) {
  const ws = html.slice(from).match(/^\s*/)?.[0].length ?? 0;
  const start = from + ws;
  if (start >= html.length) return null;
  if (html[start] !== "<") {
    const textEnd = html.indexOf("<", start);
    return {
      start,
      end: textEnd === -1 ? html.length : textEnd,
      html: html.slice(start, textEnd === -1 ? html.length : textEnd),
    };
  }
  const end = findBalancedElementEnd(html, start);
  if (end < 0) return null;
  return { start, end, html: html.slice(start, end) };
}

// Some city imports kept only the post heading and its truncated teaser.
function textOnlyBlogCardEnd(html: string) {
  const list = /^\s*<(ul|ol)\b[^>]*>/i.exec(html);
  if (list) {
    let pos = list[0].length;
    let count = 0;
    for (let item = nextTopLevelChunk(html, pos); item; item = nextTopLevelChunk(html, pos)) {
      const contents = /^<li\b[^>]*>([\s\S]*)<\/li>$/i.exec(item.html)?.[1];
      if (!contents) break;
      const end = textCardPairsEnd(contents);
      if (!end || contents.slice(end).trim()) return 0;
      pos = item.end;
      count++;
    }
    const close = /^\s*<\/(ul|ol)>/i.exec(html.slice(pos));
    return count && close && close[1].toLowerCase() === list[1].toLowerCase() ? pos + close[0].length : 0;
  }
  return textCardPairsEnd(html);
}

function textCardPairsEnd(html: string) {
  let cursor = 0;
  while (cursor < html.length) {
    const heading = nextTopLevelChunk(html, cursor);
    if (!heading || !/^<h[1-6]\b/i.test(heading.html)) break;
    if (!/<a\b[^>]*\bhref\s*=/i.test(heading.html) &&
        !/[|–—-]\s*jyoti hydraulic$/i.test(plainBlockText(heading.html))) break;
    const teaser = nextTopLevelChunk(html, heading.end);
    if (!teaser || (teaser.html.startsWith("<") && !/^<p\b/i.test(teaser.html))) break;
    if (!/(?:…|\.{3}|&hellip;|&#8230;|&#x2026;)$/i.test(plainBlockText(teaser.html))) break;
    cursor = teaser.end;
  }
  return cursor;
}

function upcomingHasReadMore(html: string, from: number) {
  let cursor = from;
  for (let i = 0; i < 6; i += 1) {
    const chunk = nextTopLevelChunk(html, cursor);
    if (!chunk) return false;
    const text = plainBlockText(chunk.html);
    if (isBlogSectionMarker(text)) return false;
    if (isReadMoreLabel(text) || /Read\s*More/i.test(chunk.html)) return true;
    cursor = chunk.end;
  }
  return false;
}

function chunkLooksLikeBlogCard(chunkHtml: string, trailingHtml: string, chunkEnd: number) {
  const text = plainBlockText(chunkHtml);
  if (!text) return true;
  if (isBlogSectionMarker(text)) return false;
  if (isReadMoreLabel(text) || isDateLabel(text)) return true;
  if (/Read\s*More/i.test(chunkHtml)) return true;
  if (/<(?:img|figure)\b/i.test(chunkHtml)) return true;
  if (
    /^<(ul|ol)\b/i.test(chunkHtml) &&
    (/Read\s*More/i.test(chunkHtml) || /<(?:img|figure)\b/i.test(chunkHtml))
  ) {
    return true;
  }
  // Short heading/excerpt that belongs to a card ending in Read More.
  if (text.length <= 400 && upcomingHasReadMore(trailingHtml, chunkEnd)) {
    return true;
  }
  return false;
}

/**
 * Consume contiguous WordPress blog-card markup after the section marker.
 * Uses balanced tag matching so nested <ul>/<li> card lists are removed whole.
 */
function consumeBlogCardMarkup(trailing: string) {
  const textCardsEnd = textOnlyBlogCardEnd(trailing);
  if (textCardsEnd) return textCardsEnd;
  let cursor = 0;
  let consumed = 0;
  let sawCardSignal = false;

  while (cursor < trailing.length) {
    const chunk = nextTopLevelChunk(trailing, cursor);
    if (!chunk) break;

    // Bare text between tags should not appear in card markup.
    if (!chunk.html.startsWith("<")) {
      if (plainBlockText(chunk.html)) break;
      cursor = chunk.end;
      continue;
    }

    if (!chunkLooksLikeBlogCard(chunk.html, trailing, chunk.end)) break;

    if (
      /Read\s*More/i.test(chunk.html) ||
      /<(?:img|figure)\b/i.test(chunk.html) ||
      isDateLabel(plainBlockText(chunk.html)) ||
      isReadMoreLabel(plainBlockText(chunk.html))
    ) {
      sawCardSignal = true;
    }

    consumed = chunk.end;
    cursor = chunk.end;
  }

  return sawCardSignal ? consumed : 0;
}

function removeOneLegacyBlogEmbed(html: string) {
  const marker = findBlogSectionMarker(html);
  if (!marker) return html;

  const trailingStart = marker.index + marker.length;
  const trailing = html.slice(trailingStart);
  if (!looksLikeLegacyBlogCardTrail(trailing)) return html;

  const consumed = consumeBlogCardMarkup(trailing);
  if (consumed <= 0) {
    // Marker confirmed with card-like trailing content, but structure was too
    // irregular to walk. Prefer dropping the remainder only when it is clearly
    // the end-of-article blog list (final Read More + closing tags only).
    const readMoreMatches = [...trailing.matchAll(/Read\s*More/gi)];
    const lastReadMore = readMoreMatches.at(-1);
    if (!lastReadMore || lastReadMore.index === undefined) {
      return html;
    }
    const after = trailing.slice(lastReadMore.index + lastReadMore[0].length);
    const remainder = after
      .replace(/<\/?(?:a|li|ul|ol|div|span|p|h[1-6]|figure|section|article)\b[^>]*>/gi, "")
      .replace(/&nbsp;|&#160;/gi, "")
      .replace(/\s+/g, "");
    if (remainder.length > 0) return html;
    return html.slice(0, marker.index).trim();
  }

  return `${html.slice(0, marker.index).trim()}${html.slice(trailingStart + consumed)}`.trim();
}

function tidyEmptyBlocks(html: string) {
  return html
    .replace(/(?:<p>\s*(?:&nbsp;|\s)*<\/p>\s*){2,}/gi, "")
    .replace(/^\s*(?:<p>\s*(?:&nbsp;|\s)*<\/p>\s*)+/i, "")
    .replace(/(?:<p>\s*(?:&nbsp;|\s)*<\/p>\s*)+$/i, "")
    .trim();
}

/**
 * Removes every legacy embedded blog-card section from HTML.
 * Safe and idempotent: repeated calls return the same result.
 */
export function removeLegacyBlogEmbed(html: string) {
  if (!html) return html;
  let current = html;
  let removed = false;
  for (let pass = 0; pass < 20; pass += 1) {
    const next = removeOneLegacyBlogEmbed(current);
    if (next === current) break;
    removed = true;
    current = next;
  }
  // Only tidy empty paragraphs when a blog section was actually removed.
  return removed ? tidyEmptyBlocks(current) : html;
}

/** True when HTML still contains an identifiable legacy blog-card embed. */
export function hasLegacyBlogEmbed(html: string) {
  if (!html) return false;
  const marker = findBlogSectionMarker(html);
  if (!marker) return false;
  const trailing = html.slice(marker.index + marker.length);
  return looksLikeLegacyBlogCardTrail(trailing);
}

/** Short plain-text sample of the first detected legacy blog section. */
export function legacyBlogEmbedSnippet(html: string, max = 160) {
  const marker = findBlogSectionMarker(html);
  if (!marker) return "";
  const slice = html.slice(marker.index, marker.index + 500);
  const plain = slice
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1)}…`;
}
