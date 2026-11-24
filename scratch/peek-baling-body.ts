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
    .select({ body: productCategories.body, path: productCategories.path })
    .from(productCategories)
    .where(eq(productCategories.path, "baling-machines"))
    .limit(1);
  const body = row?.body || "";
  const i = body.toLowerCase().indexOf("our products");
  console.log("ourProductsAt", i);
  console.log("--- around marker ---");
  console.log(body.slice(Math.max(0, i - 100), i + 800));
  const after = removeLegacyProductListing(removeLegacyBlogEmbed(body));
  console.log("after has Our Products", /Our\s+Products/i.test(after));
  console.log("after len", after.length, "before", body.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
