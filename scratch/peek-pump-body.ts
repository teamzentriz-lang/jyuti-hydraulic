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
  const [row] = await db
    .select({ body: productCategories.body })
    .from(productCategories)
    .where(eq(productCategories.path, "hydraulic-pump"))
    .limit(1);
  const body = row?.body || "";
  const i = body.toLowerCase().indexOf("our products");
  console.log("ourProductsAt", i, "len", body.length);
  console.log(body.slice(Math.max(0, i - 80), i + 1200));
  const after = removeLegacyProductListing(removeLegacyBlogEmbed(body));
  console.log("AFTER Our Products", /Our\s+Products/i.test(after));
  console.log("AFTER Read More+img product", /<a\b[^>]*\/products\//i.test(after) && /Read\s*More/i.test(after) && /<img\b/i.test(after));
  console.log(after.slice(0, 800));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
