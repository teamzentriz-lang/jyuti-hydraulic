import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { productCategories } from "../src/db/schema";
import { removeLegacyProductListing } from "../src/lib/cms/legacy-product-listing";

async function main() {
  const db = getDb();
  const [row] = await db
    .select({ body: productCategories.body })
    .from(productCategories)
    .where(eq(productCategories.path, "products/hydraulic-power-pack"))
    .limit(1);
  const before = row?.body || "";
  const after = removeLegacyProductListing(before);
  console.log("before has Our Products", /Our\s+Products/i.test(before));
  console.log("after has Our Products", /Our\s+Products/i.test(after));
  console.log("before inquiry", /inquiry\s*now/i.test(before));
  console.log("after inquiry", /inquiry\s*now/i.test(after));
  console.log("before Read More", /Read\s*More/i.test(before));
  console.log("after Read More", /Read\s*More/i.test(after));
  console.log("after still has Understanding", /Understanding Hydraulic/i.test(after));
  console.log("len", before.length, "->", after.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
