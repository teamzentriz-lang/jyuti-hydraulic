import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

async function main() {
  const db = getDb();
  const r = await db.execute(sql`
    select path,
      seo_title,
      left(coalesce(og_title, ''), 100) as og_title,
      left(coalesce(og_description, ''), 120) as og_desc,
      og_image_id is not null as has_og_img,
      cover_media_id is not null as has_cover,
      (select left(coalesce(legacy_url, url), 120) from media where id = posts.og_image_id) as og_img_url,
      (select left(coalesce(legacy_url, url), 120) from media where id = posts.cover_media_id) as cover_url
    from posts
    where path = 'how-to-select-the-right-hydraulic-pump-for-an-industrial-power-pack'
    limit 1
  `);
  console.log(JSON.stringify((r as { rows?: unknown }).rows ?? r, null, 2));

  const cols = await db.execute(sql`
    select column_name from information_schema.columns
    where table_name='posts'
      and (column_name ilike '%og%' or column_name ilike '%twitter%' or column_name ilike '%seo%')
    order by 1
  `);
  console.log("cols", JSON.stringify((cols as { rows?: unknown }).rows ?? cols, null, 2));

  const nullOg = await db.execute(sql`
    select
      count(*)::int as total,
      count(*) filter (where og_title is null or og_title = '')::int as missing_og_title,
      count(*) filter (where og_description is null or og_description = '')::int as missing_og_desc,
      count(*) filter (where og_image_id is null)::int as missing_og_image
    from posts where status='published'
  `);
  console.log("post_og_stats", JSON.stringify((nullOg as { rows?: unknown }).rows ?? nullOg, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
