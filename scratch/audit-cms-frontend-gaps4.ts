import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

async function q(label: string, query: string) {
  const db = getDb();
  const r = await db.execute(sql.raw(query));
  const rows = (r as { rows?: unknown }).rows ?? r;
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(rows, null, 2));
}

async function main() {
  await q(
    "categories_by_product_count",
    `select pc.path, pc.title,
       (select count(*)::int from products p
         where p.category_id = pc.id and p.status='published') as products
     from product_categories pc
     where pc.status='published'
     order by products asc, pc.path`,
  );
  await q(
    "products_no_featured_list",
    `select path, title from products
     where status='published' and featured_image_id is null
     order by path`,
  );
  await q(
    "drafts_hidden",
    `select 'products' as kind, count(*)::int as c from products where status<>'published'
     union all select 'posts', count(*)::int from posts where status<>'published'
     union all select 'pages', count(*)::int from pages where status<>'published'
     union all select 'categories', count(*)::int from product_categories where status<>'published'
     union all select 'cities', count(*)::int from location_pages where status<>'published'
     union all select 'exports', count(*)::int from export_pages where status<>'published'`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
