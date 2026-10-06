import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import { closeDb, getDb } from "@/db";
import { parseImportCliOptions } from "@/lib/import/wordpress-client";
import { runWordPressPhaseC } from "@/lib/import/wordpress-phase-c";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in .env.local before running the content import.");
    process.exit(1);
  }

  const options = parseImportCliOptions(process.argv.slice(2));
  if (options.dryRun) console.log("Dry run — no database writes.");
  if (options.skipSeo) console.log("Skipping public HTML SEO scrape.");
  if (!options.purgeDummy) console.log("Keeping dummy seed pages/posts (--keep-seed).");

  const db = getDb();
  const stats = await runWordPressPhaseC(db, options);

  console.log(
    [
      "Phase C complete.",
      `Pages: ${stats.pagesCreated} created, ${stats.pagesUpdated} updated.`,
      `Posts: ${stats.postsCreated} created, ${stats.postsUpdated} updated.`,
      stats.skipped ? `${stats.skipped} records skipped.` : "",
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
