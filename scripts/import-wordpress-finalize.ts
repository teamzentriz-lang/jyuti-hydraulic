import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in .env.local, then run this again.");
    process.exit(1);
  }

  const { closeDb, getDb } = await import("../src/db");
  const { applyWordPressGlobals } = await import("../src/lib/import/apply-globals");
  const { purgeSeedContent } = await import("../src/lib/import/purge-seed-content");
  const { revalidatePublicSite } = await import("../src/lib/cms/revalidate-public");

  const base = (process.env.WP_ORIGIN || "https://jyotihydraulic.com").replace(/\/$/, "");
  const db = getDb();
  const purged = await purgeSeedContent(db);
  console.log(
    `Removed seed content: ${purged.products} products, ${purged.categories} categories, ${purged.pages} pages, ${purged.posts} posts, ${purged.media} non-migrated media files.`,
  );
  const applied = await applyWordPressGlobals(db, base);
  if (applied.replacedLogo && applied.logo) console.log(`Logo set from ${applied.logo.filename}.`);
  if (applied.catalogueId) console.log("Catalogue PDF linked in site settings.");
  revalidatePublicSite();
  console.log("Public site cache revalidated.");
  await closeDb();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  const { closeDb } = await import("../src/db");
  await closeDb().catch(() => undefined);
  process.exit(1);
});
