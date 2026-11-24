/**
 * Restore damaged / Elementor-polluted location bodies from live WP,
 * extracting only real article headings + paragraphs, then applying
 * normalizeLocationBody (images / contact chrome stripped).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { locationPages } from "../src/db/schema";
import { normalizeLocationBody } from "../src/lib/cms/product-article";

function plainLen(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
}

function plainText(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Pull meaningful heading and paragraph blocks out of Elementor / WP chrome. */
export function extractArticleHtml(raw: string) {
  const withoutChrome = raw
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");

  const blocks = [
    ...withoutChrome.matchAll(/<(h[1-6]|p)\b[^>]*>[\s\S]*?<\/\1>/gi),
  ]
    .map((match) => match[0])
    .filter((block) => {
      const text = plainText(block);
      if (text.length < 3) return false;
      if (
        /^(send a message|inquiry now|contact with us|feel free to write|call us|email us|get a quote|read more)$/i.test(
          text,
        )
      ) {
        return false;
      }
      // Drop Elementor/CSS leftovers mistaken as text.
      if (/elementor-|\/\*!|\{[\s\S]*\}/.test(text)) return false;
      return true;
    });

  // Deduplicate consecutive identical blocks (common in WP templates).
  const deduped: string[] = [];
  for (const block of blocks) {
    const key = plainText(block).toLowerCase();
    const prev = deduped[deduped.length - 1];
    if (prev && plainText(prev).toLowerCase() === key) continue;
    deduped.push(block);
  }
  return deduped.join("\n");
}

async function fetchLiveBody(path: string) {
  const slug = path.replace(/^city\//, "");
  const urls = [
    `https://jyotihydraulic.com/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&_fields=content,link,slug`,
    `https://jyotihydraulic.com/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=content,link,slug`,
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "jyuti-restore/1.1" },
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) continue;
      const rows = (await response.json()) as { content?: { rendered?: string } }[];
      const rendered = rows?.[0]?.content?.rendered ?? "";
      const extracted = extractArticleHtml(rendered);
      if (plainLen(extracted) > 80) return extracted;
    } catch {
      // try next
    }
  }
  return "";
}

function needsRestore(body: string) {
  const plain = plainLen(body);
  if (plain < 80) return true;
  if (/elementor-|data-elementor|elementor-widget/i.test(body)) return true;
  if (/^<p>\s*Send a message\s*<\/p>$/i.test(body.trim())) return true;
  return false;
}

async function main() {
  const db = getDb();
  const rows = await db.select().from(locationPages);
  const damaged = rows.filter((row) => needsRestore(row.body ?? ""));
  console.log(`needs restore ${damaged.length} / ${rows.length}`);

  let restored = 0;
  let failed = 0;
  for (const row of damaged) {
    const live = await fetchLiveBody(row.path);
    if (plainLen(live) < 80) {
      failed += 1;
      console.log("FAIL", row.path, "liveLen", plainLen(live));
      continue;
    }
    const cleaned = normalizeLocationBody(live, row.locationName ?? "");
    if (plainLen(cleaned) < 40) {
      failed += 1;
      console.log("FAIL-clean", row.path, "cleanLen", plainLen(cleaned));
      continue;
    }
    await db
      .update(locationPages)
      .set({ body: cleaned, updatedAt: new Date() })
      .where(eq(locationPages.id, row.id));
    restored += 1;
    console.log("OK", row.path, "→", plainLen(cleaned), "chars");
  }

  console.log(JSON.stringify({ restored, failed, damaged: damaged.length }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
