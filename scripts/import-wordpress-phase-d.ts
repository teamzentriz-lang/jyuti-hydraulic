import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import { closeDb, getDb } from "@/db";
import { parsePhaseDCliOptions, runWordPressPhaseD } from "@/lib/import/wordpress-phase-d";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in .env.local before running the geo import.");
    process.exit(1);
  }

  const options = parsePhaseDCliOptions(process.argv.slice(2));
  if (options.dryRun) console.log("Dry run — no database writes.");
  if (options.skipSeo) console.log("Skipping public HTML SEO scrape.");
  if (!options.purgeDummy) console.log("Keeping dummy location/export rows (--keep-seed).");
  if (options.scope === "city") console.log("Importing city pages only.");
  if (options.scope === "exports") console.log("Importing export pages only.");

  const db = getDb();
  const stats = await runWordPressPhaseD(db, options);

  console.log(
    [
      "Phase D complete.",
      `Locations: ${stats.locationsCreated} created, ${stats.locationsUpdated} updated.`,
      `Exports: ${stats.exportsCreated} created, ${stats.exportsUpdated} updated.`,
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
