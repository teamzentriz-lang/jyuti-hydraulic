import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { productCategories } from "../src/db/schema";

async function main() {
  const db = getDb();
  const [row] = await db
    .select({
      path: productCategories.path,
      body: productCategories.body,
    })
    .from(productCategories)
    .where(eq(productCategories.path, "products/hydraulic-power-pack"))
    .limit(1);
  const body = row?.body || "";
  const i = body.toLowerCase().indexOf("our products");
  console.log("len", body.length, "ourProductsAt", i);
  console.log(body.slice(Math.max(0, i - 80), i + 3500));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
