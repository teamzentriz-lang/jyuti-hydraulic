import { config } from "dotenv";
import { and, eq, isNotNull, isNull } from "drizzle-orm";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const { closeDb, getDb } = await import("../src/db");
  const { products } = await import("../src/db/schema");
  const { listAllPublishedPages, fetchWpAttachmentSourceUrl } = await import(
    "../src/lib/import/wordpress-client"
  );
  const {
    loadMediaLookup,
    resolveOrImportMediaFromUrl,
  } = await import("../src/lib/import/wordpress-media");
  const { collectImageUrls } = await import(
    "../src/lib/import/wordpress-html"
  );

  const db = getDb();
  const missing = await db
    .select({
      id: products.id,
      title: products.title,
      path: products.path,
      legacyId: products.legacyId,
    })
    .from(products)
    .where(
      and(
        isNotNull(products.legacyId),
        isNull(products.featuredImageId),
      ),
    );
  if (!missing.length) {
    console.log("All imported products already have CMS featured images.");
    await closeDb();
    return;
  }

  const pages = await listAllPublishedPages(null);
  const pageById = new Map(pages.map((page) => [page.id, page]));
  const pageByPath = new Map(
    pages.map((page) => [new URL(page.link).pathname.replace(/^\/+|\/+$/g, ""), page]),
  );
  const lookup = await loadMediaLookup(db);
  let attached = 0;

  for (const product of missing) {
    const page =
      (product.legacyId ? pageById.get(product.legacyId) : undefined) ??
      pageByPath.get(product.path.replace(/^\/+|\/+$/g, ""));
    if (!page) continue;
    const sourceUrl = page.featured_media
      ? await fetchWpAttachmentSourceUrl(page.featured_media)
      : collectImageUrls(page.content?.rendered ?? "")[0];
    if (!sourceUrl) continue;
    const result = await resolveOrImportMediaFromUrl(db, sourceUrl, lookup, {
      dryRun: false,
      alt: product.title,
      title: product.title,
    });
    if (!result.mediaId) continue;
    await db
      .update(products)
      .set({
        featuredImageId: result.mediaId,
        thumbnailId: result.mediaId,
        updatedAt: new Date(),
      })
      .where(eq(products.id, product.id));
    attached += 1;
    console.log(`Attached CMS image: ${product.title}`);
  }

  console.log(`Attached ${attached} product images in the CMS.`);
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
