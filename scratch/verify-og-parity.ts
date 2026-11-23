import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

async function main() {
  const db = getDb();
  const posts = await db.execute(sql`
    select
      count(*)::int as total,
      count(*) filter (where coalesce(og_title,'') <> '')::int as has_og_title,
      count(*) filter (where coalesce(og_description,'') <> '')::int as has_og_desc,
      count(*) filter (where og_image_id is not null)::int as has_og_image
    from posts where status='published'
  `);
  const products = await db.execute(sql`
    select
      count(*)::int as total,
      count(*) filter (where coalesce(og_title,'') <> '')::int as has_og_title,
      count(*) filter (where coalesce(og_description,'') <> '')::int as has_og_desc,
      count(*) filter (where og_image_id is not null)::int as has_og_image
    from products where status='published'
  `);
  console.log("posts", JSON.stringify((posts as { rows?: unknown }).rows ?? posts));
  console.log("products", JSON.stringify((products as { rows?: unknown }).rows ?? products));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
