/**
 * Incremental Phase B: import only catalogue categories/products missing from Postgres.
 * Matches existing rows by WordPress legacy_id or canonical path.
 */
import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import { closeDb, getDb } from "@/db";
import { parsePhaseBCliOptions, runWordPressPhaseB } from "@/lib/import/wordpress-phase-b";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in .env.local before running the incremental catalogue import.");
    process.exit(1);
  }

  const forward = process.argv.slice(2).filter((arg) => arg !== "--incremental" && arg !== "--skip-existing");
  const options = parsePhaseBCliOptions(["--skip-existing", "--keep-seed", ...forward]);

  if (options.dryRun) console.log("Dry run — no database writes.");
  if (options.skipSeo) console.log("Skipping public HTML SEO scrape.");
  console.log("Incremental Phase B — existing categories/products are left unchanged.");

  const db = getDb();
  const stats = await runWordPressPhaseB(db, options);

  console.log(
    [
      "Incremental Phase B complete.",
      `Categories: ${stats.categoriesCreated} created, ${stats.categoriesUpdated} updated, ${stats.categoriesSkipped} skipped (already present).`,
      `Products: ${stats.productsCreated} created, ${stats.productsUpdated} updated, ${stats.productsSkipped} skipped (already present).`,
      stats.skipped ? `${stats.skipped} products skipped (missing parent category).` : "",
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
