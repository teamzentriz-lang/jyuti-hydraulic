import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import { closeDb, getDb } from "@/db";
import { parsePhaseBCliOptions, runWordPressPhaseB } from "@/lib/import/wordpress-phase-b";
import { repairMissingPublishedRoutes } from "@/lib/import/repair-routes";
import { revalidatePublicSite } from "@/lib/cms/revalidate-public";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in .env.local");
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");
  const db = getDb();

  const catalogStats = await runWordPressPhaseB(
    db,
    parsePhaseBCliOptions(["--skip-existing", "--keep-seed", "--skip-seo", ...(dryRun ? ["--dry-run"] : [])]),
  );
  console.log("Phase B incremental:", catalogStats);

  const repaired = await repairMissingPublishedRoutes(db, dryRun);
  console.log(`${dryRun ? "Would repair" : "Repaired"} routes:`, repaired);

  if (!dryRun) {
    revalidatePublicSite([
      "city/worm-gear-screw-jack-manufacturers-in-salem",
      "waste-paper-corrugated-box-baling-press-machine",
    ]);
  }

  await closeDb();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
