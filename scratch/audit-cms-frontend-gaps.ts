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
    "posts_published",
    "select count(*)::int as c from posts where status='published'",
  );
  await q(
    "pages_published",
    "select count(*)::int as c from pages where status='published'",
  );
  await q(
    "products_published",
    "select count(*)::int as c from products where status='published'",
  );
  await q(
    "categories_published",
    "select count(*)::int as c from product_categories where status='published'",
  );
  await q(
    "cities_published",
    "select count(*)::int as c from location_pages where status='published'",
  );
  await q(
    "exports_published",
    "select count(*)::int as c from export_pages where status='published'",
  );
  await q("gallery_items", "select count(*)::int as c from gallery_items");
  await q("certificates", "select count(*)::int as c from certificates");
  await q(
    "catalogues_published",
    "select count(*)::int as c from catalogues where status='published'",
  );
  await q(
    "hub_city_exports",
    "select path, status, title from pages where path in ('city','exports')",
  );
  await q(
    "bevel",
    "select path, status from posts where path like '%bevel-gear%' union all select path, status from pages where path like '%bevel-gear%'",
  );
  await q(
    "products_no_cover",
    "select count(*)::int as c from products where status='published' and cover_media_id is null",
  );
  await q(
    "posts_no_cover",
    "select count(*)::int as c from posts where status='published' and cover_media_id is null",
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
    "content_faqs_by_kind",
    `select entity_kind, count(*)::int as c
     from content_faqs
     group by entity_kind
     order by c desc`,
  );
  await q(
    "gallery_videos_custom",
    `select
       jsonb_array_length(coalesce(custom_content->'galleryVideos','[]'::jsonb)) as videos
     from pages where path='gallery'`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
