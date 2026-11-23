/**
 * Fill empty og_image_id / twitter_image_id from the same visual frontend already
 * uses (cover / featured / hero), so CMS Social fields show live-equivalent images.
 *
 * Usage: npx tsx scripts/backfill-og-images-from-featured.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import postgres from "postgres";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
  const db = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  try {
    const posts = await db`
      update posts
      set
        og_image_id = coalesce(og_image_id, cover_media_id),
        twitter_image_id = coalesce(twitter_image_id, og_image_id, cover_media_id),
        updated_at = now()
      where status = 'published'
        and (
          (og_image_id is null and cover_media_id is not null)
          or (twitter_image_id is null and coalesce(og_image_id, cover_media_id) is not null)
        )
    `;
    const products = await db`
      update products
      set
        og_image_id = coalesce(og_image_id, featured_image_id, thumbnail_id),
        twitter_image_id = coalesce(twitter_image_id, og_image_id, featured_image_id, thumbnail_id),
        updated_at = now()
      where status = 'published'
        and (
          (og_image_id is null and coalesce(featured_image_id, thumbnail_id) is not null)
          or (twitter_image_id is null and coalesce(og_image_id, featured_image_id, thumbnail_id) is not null)
        )
    `;
    const pages = await db`
      update pages
      set
        og_image_id = coalesce(og_image_id, featured_image_id, hero_media_id),
        twitter_image_id = coalesce(twitter_image_id, og_image_id, featured_image_id, hero_media_id),
        updated_at = now()
      where status = 'published'
        and (
          (og_image_id is null and coalesce(featured_image_id, hero_media_id) is not null)
          or (twitter_image_id is null and coalesce(og_image_id, featured_image_id, hero_media_id) is not null)
        )
    `;
    console.log("posts updated rows:", posts.count);
    console.log("products updated rows:", products.count);
    console.log("pages updated rows:", pages.count);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
