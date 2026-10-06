import { canonicalLegacyUrl, normalizeWordPressSizedUploadUrl } from "@/lib/import/wordpress-phase-a";
import { wpOrigin } from "@/lib/import/wordpress-client";
import { sanitizeRichText } from "@/lib/sanitize";
import type { SpecRow } from "@/db/schema";

export type MediaLookup = {
  byLegacyUrl: Map<string, string>;
  byPathname: Map<string, string>;
};

export function wordpressUploadPathnameKeys(pathname: string): string[] {
  let path = decodeURIComponent(pathname).toLowerCase();
  const keys = new Set<string>();
  const add = (value: string) => {
    keys.add(value.toLowerCase());
    keys.add(encodeURI(value).toLowerCase());
  };
  add(path);
  let changed = true;
  while (changed) {
    changed = false;
    const withoutSize = path.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, "$1");
    if (withoutSize !== path) {
      path = withoutSize;
      add(path);
      changed = true;
    }
    const withoutScaled = path.replace(/-scaled(\.[a-z0-9]+)$/i, "$1");
    if (withoutScaled !== path) {
      path = withoutScaled;
      add(path);
      changed = true;
    }
  }
  return [...keys];
}

export function registerMediaLookupRow(lookup: MediaLookup, legacyUrl: string, id: string) {
  try {
    const canonical = canonicalLegacyUrl(legacyUrl);
    lookup.byLegacyUrl.set(canonical, id);
    const normalized = canonicalLegacyUrl(normalizeWordPressSizedUploadUrl(canonical));
    lookup.byLegacyUrl.set(normalized, id);
    for (const key of wordpressUploadPathnameKeys(new URL(canonical).pathname)) {
      lookup.byPathname.set(key, id);
    }
    for (const key of wordpressUploadPathnameKeys(new URL(normalized).pathname)) {
      lookup.byPathname.set(key, id);
    }
  } catch {
    // skip invalid legacy URLs
  }
}

export function buildMediaLookup(rows: { id: string; legacyUrl: string | null }[]): MediaLookup {
  const byLegacyUrl = new Map<string, string>();
  const byPathname = new Map<string, string>();
  const lookup: MediaLookup = { byLegacyUrl, byPathname };

  for (const row of rows) {
    if (!row.legacyUrl) continue;
    registerMediaLookupRow(lookup, row.legacyUrl, row.id);
  }

  return lookup;
}

export function resolveMediaIdFromUrl(src: string, lookup: MediaLookup): string | null {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith("/api/media/")) return null;
  try {
    const absolute = trimmed.startsWith("http")
      ? trimmed
      : new URL(trimmed, `${wpOrigin()}/`).toString();
    const candidates = [
      canonicalLegacyUrl(absolute),
      canonicalLegacyUrl(normalizeWordPressSizedUploadUrl(absolute)),
    ];
    for (const canonical of candidates) {
      const fromLegacy = lookup.byLegacyUrl.get(canonical);
      if (fromLegacy) return fromLegacy;
      for (const key of wordpressUploadPathnameKeys(new URL(canonical).pathname)) {
        const fromPath = lookup.byPathname.get(key);
        if (fromPath) return fromPath;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function stripElementorHtml(html: string) {
  let out = html;
  out = out.replace(/<style[\s\S]*?<\/style>/gi, "");
  out = out.replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/\sdata-elementor-[^=]+="[^"]*"/gi, "");
  out = out.replace(/\sclass="[^"]*elementor[^"]*"/gi, "");
  return out.trim();
}

export function rewriteMediaUrls(html: string, lookup: MediaLookup) {
  return html.replace(/(<img\b[^>]*\bsrc=)(["'])([^"']+)\2/gi, (match, prefix, quote, src) => {
    const id = resolveMediaIdFromUrl(src, lookup);
    if (!id) return match;
    return `${prefix}${quote}/api/media/${id}${quote}`;
  });
}

export function htmlToPlainSummary(html: string, maxLength = 500) {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

export function extractSpecsFromHtml(html: string): SpecRow[] {
  const specs: SpecRow[] = [];
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowPattern.exec(html))) {
    const rowHtml = rowMatch[1];
    const cells = [...rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) =>
      htmlToPlainSummary(cell[1], 400),
    );
    if (cells.length === 2 && cells[0] && cells[1]) {
      specs.push({ label: cells[0], value: cells[1] });
    }
  }
  return specs;
}

export type HtmlImageRef = { src: string; alt: string };

export function collectImageRefs(html: string): HtmlImageRef[] {
  const refs: HtmlImageRef[] = [];
  const pattern = /<img\b([^>]*?)>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const attrs = match[1] ?? "";
    const src = attrs.match(/\bsrc=(["'])([^"']+)\1/i)?.[2];
    if (!src) continue;
    const alt = attrs.match(/\balt=(["'])([^"']*)\1/i)?.[2] ?? "";
    refs.push({ src, alt });
  }
  return refs;
}

export function collectImageUrls(html: string): string[] {
  return collectImageRefs(html).map((ref) => ref.src);
}

export function processWordPressHtml(html: string, lookup: MediaLookup) {
  const stripped = stripElementorHtml(html);
  const rewritten = rewriteMediaUrls(stripped, lookup);
  return sanitizeRichText(rewritten);
}
