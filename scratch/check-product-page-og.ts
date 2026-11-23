import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

async function main() {
  const db = getDb();
  for (const table of ["products", "pages", "product_categories"] as const) {
    const r = await db.execute(sql.raw(`
      select
        count(*)::int as total,
        count(*) filter (where coalesce(og_title,'') = '')::int as missing_og_title,
        count(*) filter (where coalesce(og_description,'') = '')::int as missing_og_desc,
        count(*) filter (where og_image_id is null)::int as missing_og_image
      from ${table}
      where status='published'
    `));
    console.log(table, JSON.stringify((r as { rows?: unknown }).rows ?? r));
  }

  const sample = await db.execute(sql`
    select path,
      left(coalesce(og_title,''),80) as og_title,
      left(coalesce(og_description,''),80) as og_desc,
      og_image_id is not null as has_og_img
    from products
    where path like '%worm-gear-screw-jack-25-ton%'
    limit 1
  `);
  console.log("product_sample", JSON.stringify((sample as { rows?: unknown }).rows ?? sample, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
