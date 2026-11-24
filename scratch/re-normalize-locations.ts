import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { locationPages } from "../src/db/schema";
import { normalizeLocationBody } from "../src/lib/cms/product-article";

async function main() {
  const db = getDb();
  const rows = await db.select().from(locationPages);
  let updated = 0;
  for (const row of rows) {
    const next = normalizeLocationBody(row.body ?? "", row.locationName ?? "");
    if (next === (row.body ?? "")) continue;
    await db
      .update(locationPages)
      .set({ body: next, updatedAt: new Date() })
      .where(eq(locationPages.id, row.id));
    updated += 1;
  }
  console.log(JSON.stringify({ updated, total: rows.length }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
