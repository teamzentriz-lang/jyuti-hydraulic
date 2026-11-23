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
    "products_no_featured",
    `select count(*)::int as c from products
     where status='published' and featured_image_id is null`,
  );
  await q(
    "products_with_gallery_images",
    `select count(distinct product_id)::int as c from product_images`,
  );
  await q(
    "category_link_tables",
    `select table_name from information_schema.tables
     where table_schema='public'
       and (table_name ilike '%categor%' or table_name ilike '%product%assign%' or table_name ilike '%product_categ%')
     order by 1`,
  );
  await q(
    "faqs",
    `select entity_kind, count(*)::int as c from content_faqs group by entity_kind order by c desc`,
  );
  await q(
    "gallery_vids",
    `select coalesce(jsonb_array_length(custom_content->'galleryVideos'),0) as videos
     from pages where path='gallery'`,
  );
  await q(
    "settings_catalogue",
    `select company_name, catalogue_id is not null as has_catalogue
     from site_settings limit 1`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
