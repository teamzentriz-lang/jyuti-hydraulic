import { config } from "dotenv";
import { eq } from "drizzle-orm";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const { closeDb, getDb } = await import("../src/db");
  const { pages } = await import("../src/db/schema");
  const { extractYoutubeVideos } = await import(
    "../src/lib/cms/gallery-videos"
  );
  const { processWordPressHtml } = await import(
    "../src/lib/import/wordpress-html"
  );
  const { loadMediaLookup } = await import("../src/lib/import/wordpress-media");

  const db = getDb();
  const [page] = await db
    .select()
    .from(pages)
    .where(eq(pages.path, "gallery"))
    .limit(1);
  if (!page) throw new Error("Gallery page missing in CMS");

  const response = await fetch(
    "https://jyotihydraulic.com/wp-json/wp/v2/pages?slug=gallery&_fields=id,content",
  );
  const [wp] = (await response.json()) as {
    id: number;
    content?: { rendered?: string };
  }[];
  const raw = wp?.content?.rendered || "";
  const videos = extractYoutubeVideos(raw);
  const lookup = await loadMediaLookup(db);
  const body = processWordPressHtml(raw, lookup);

  await db
    .update(pages)
    .set({
      body,
      customContent: {
        ...(page.customContent ?? {}),
        galleryVideos: videos,
      },
      updatedAt: new Date(),
    })
    .where(eq(pages.id, page.id));

  console.log({
    videos: videos.length,
    bodyLen: body.length,
    sample: videos.slice(0, 5),
  });
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
