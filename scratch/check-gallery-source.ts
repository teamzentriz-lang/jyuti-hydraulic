import { config } from "dotenv";
import { eq } from "drizzle-orm";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const { closeDb, getDb } = await import("../src/db");
  const { pages } = await import("../src/db/schema");
  const db = getDb();
  const [page] = await db
    .select()
    .from(pages)
    .where(eq(pages.path, "gallery"))
    .limit(1);
  console.log({
    found: Boolean(page),
    title: page?.title,
    bodyLen: page?.body?.length ?? 0,
    excerpt: page?.excerpt?.slice?.(0, 120),
    legacyUrl: page?.legacyUrl,
    youtubeCount: (page?.body.match(/youtube|youtu\.be|iframe/gi) || [])
      .length,
    imgCount: (page?.body.match(/<img\b/gi) || []).length,
    bodyPreview: page?.body?.slice(0, 500),
  });

  const live = await fetch("https://jyotihydraulic.com/gallery/");
  const html = await live.text();
  const iframes = [...html.matchAll(/<iframe\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(
    (m) => m[1],
  );
  const imgs = [...html.matchAll(/<img\b[^>]*src=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((src) => !/logo|icon|flag|emoji|gravatar|data:image/i.test(src));
  console.log({
    liveIframes: iframes.slice(0, 15),
    liveIframeCount: iframes.length,
    liveImgCount: imgs.length,
    liveImgs: imgs.slice(0, 10),
  });

  const wp = await fetch(
    "https://jyotihydraulic.com/wp-json/wp/v2/pages?slug=gallery&_fields=id,content,link",
  );
  const [wpPage] = (await wp.json()) as {
    id: number;
    content?: { rendered?: string };
    link: string;
  }[];
  const content = wpPage?.content?.rendered || "";
  console.log({
    wpId: wpPage?.id,
    wpContentLen: content.length,
    wpYoutube: (content.match(/youtube|youtu\.be|iframe/gi) || []).length,
    wpImgs: (content.match(/<img\b/gi) || []).length,
    wpPreview: content.slice(0, 800),
  });

  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
