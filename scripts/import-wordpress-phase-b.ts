import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import { closeDb, getDb } from "@/db";
import { parsePhaseBCliOptions, runWordPressPhaseB } from "@/lib/import/wordpress-phase-b";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in .env.local before running the catalogue import.");
    process.exit(1);
  }

  const options = parsePhaseBCliOptions(process.argv.slice(2));
  if (options.dryRun) console.log("Dry run — no database writes.");
  if (options.skipSeo) console.log("Skipping public HTML SEO scrape.");
  if (options.skipExisting) console.log("Only importing catalogue pages not already in the CMS.");
  if (!options.purgeDummy) console.log("Keeping dummy seed categories/products (--keep-seed).");

  const db = getDb();
  const stats = await runWordPressPhaseB(db, options);

  console.log(
    [
      "Phase B complete.",
      `Categories: ${stats.categoriesCreated} created, ${stats.categoriesUpdated} updated${stats.categoriesSkipped ? `, ${stats.categoriesSkipped} skipped (already present)` : ""}.`,
      `Products: ${stats.productsCreated} created, ${stats.productsUpdated} updated${stats.productsSkipped ? `, ${stats.productsSkipped} skipped (already present)` : ""}.`,
      stats.skipped ? `${stats.skipped} products skipped.` : "",
    ]
      .filter(Boolean)
      .join(" "),
  );

  await closeDb();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
