import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { productCategories } from "../src/db/schema";
import { removeLegacyProductListing } from "../src/lib/cms/legacy-product-listing";
import { removeLegacyBlogEmbed } from "../src/lib/cms/legacy-blog-embed";

async function main() {
  const db = getDb();
  const [row] = await db
    .select({
      path: productCategories.path,
      body: productCategories.body,
      title: productCategories.title,
    })
    .from(productCategories)
    .where(eq(productCategories.path, "products/e-rickshaw-spare-parts"))
    .limit(1);
  const body = row?.body || "";
  console.log("title", row?.title, "len", body.length);
  console.log("--- first 2000 ---");
  console.log(body.slice(0, 2000));
  const cleaned = removeLegacyProductListing(removeLegacyBlogEmbed(body));
  console.log("--- cleaned has img", /<img/i.test(cleaned));
  console.log("--- cleaned has Read More", /Read\s*More/i.test(cleaned));
  console.log("--- cleaned has scissor", /scissor/i.test(cleaned));
  console.log("--- cleaned len", cleaned.length);
  console.log(cleaned.slice(0, 1500));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
