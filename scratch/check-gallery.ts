import { config } from "dotenv";
import { sql } from "drizzle-orm";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const { closeDb, getDb } = await import("../src/db");
  const { galleryForSite } = await import("../src/lib/cms/queries");
  const db = getDb();

  const [counts] = await db.execute<{
    items: number;
    albums: number;
    with_media: number;
  }>(sql`
    select
      (select count(*)::int from gallery_items) as items,
      (select count(*)::int from gallery_albums) as albums,
      (select count(*)::int from gallery_items where media_id is not null) as with_media
  `);
  console.log("counts", counts);

  const sample = await db.execute(sql`
    select id, title, caption, media_id, sort_order
    from gallery_items
    order by sort_order
    limit 10
  `);
  console.log("sample", sample);

  const site = await galleryForSite();
  console.log("galleryForSite length", site.length);
  console.log(
    "galleryForSite sample",
    site.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.title,
      hasMedia: Boolean(item.media),
      url: item.media?.url,
      legacy: item.media?.legacyUrl,
    })),
  );

  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
