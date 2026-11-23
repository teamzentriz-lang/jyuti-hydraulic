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
    "product_image_cols",
    `select column_name from information_schema.columns
     where table_name='products'
       and (column_name ilike '%media%' or column_name ilike '%image%' or column_name ilike '%cover%')
     order by 1`,
  );
  await q(
    "products_without_images",
    `select count(*)::int as c from products p
     where p.status='published'
       and not exists (select 1 from product_images pi where pi.product_id = p.id)`,
  );
  await q(
    "posts_no_cover",
    `select count(*)::int as c from posts where status='published' and cover_media_id is null`,
  );
  await q(
    "empty_or_thin_categories",
    `select pc.path, pc.title,
      (select count(*)::int from product_category_assignments a
        join products pr on pr.id = a.product_id
        where a.category_id = pc.id and pr.status='published') as products
     from product_categories pc
     where pc.status='published'
     order by products asc, pc.path`,
  );
  await q(
    "faqs",
    `select entity_kind, count(*)::int as c from content_faqs group by entity_kind order by c desc`,
  );
  await q(
    "gallery_vids",
    `select jsonb_typeof(custom_content->'galleryVideos') as t,
            coalesce(jsonb_array_length(custom_content->'galleryVideos'),0) as videos
     from pages where path='gallery'`,
  );
  await q(
    "site_catalogue_setting",
    `select key, left(value::text, 120) as value
     from site_settings
     where key ilike '%catalog%' or key ilike '%pdf%' or key ilike '%brochure%'`,
  );
  await q(
    "home_content_keys",
    `select jsonb_object_keys(content) as k from home_content limit 1`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
