import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { productCategories } from "../src/db/schema";
import { removeLegacyBlogEmbed } from "../src/lib/cms/legacy-blog-embed";
import { removeLegacyProductListing } from "../src/lib/cms/legacy-product-listing";

async function main() {
  const db = getDb();
  const rows = await db
    .select({
      path: productCategories.path,
      title: productCategories.title,
      body: productCategories.body,
    })
    .from(productCategories)
    .where(eq(productCategories.status, "published"));

  let dirtyBefore = 0;
  let dirtyAfter = 0;
  const stillDirty: string[] = [];

  for (const row of rows) {
    const before = row.body || "";
    const after = removeLegacyProductListing(removeLegacyBlogEmbed(before));
    const beforeDirty =
      /Our\s+Products/i.test(before) ||
      (/\/products\//i.test(before) &&
        /Read\s*More/i.test(before) &&
        /<img\b/i.test(before));
    const afterDirty =
      /<(h[1-6]|p)\b[^>]*>\s*Our\s+Products\s*<\/\1>/i.test(after) ||
      (/<a\b[^>]*\/products\//i.test(after) &&
        /Read\s*More/i.test(after) &&
        /<img\b/i.test(after));
    if (beforeDirty) dirtyBefore += 1;
    if (afterDirty) {
      dirtyAfter += 1;
      stillDirty.push(row.path);
    }
  }

  console.log(
    JSON.stringify(
      {
        categories: rows.length,
        hadLegacyProductEmbeds: dirtyBefore,
        stillDirtyAfterStrip: dirtyAfter,
        stillDirty,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
