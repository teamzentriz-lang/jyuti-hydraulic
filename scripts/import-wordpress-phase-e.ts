import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import { closeDb, getDb } from "@/db";
import { parsePhaseECliOptions, runWordPressPhaseE } from "@/lib/import/wordpress-phase-e";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in .env.local before running Phase E.");
    process.exit(1);
  }

  const options = parsePhaseECliOptions(process.argv.slice(2));
  if (options.dryRun) console.log("Dry run — no database writes.");
  if (!options.purgeDummy) console.log("Keeping seed gallery/certificates/nav (--keep-seed).");

  const db = getDb();
  const stats = await runWordPressPhaseE(db, options);

  console.log(
    [
      "Phase E complete.",
      `Gallery items: ${stats.galleryCreated}.`,
      `Certificates: ${stats.certificatesCreated} created, ${stats.certificatesUpdated} updated.`,
      `Media pulled from WordPress for unmatched images: ${stats.mediaImported}.`,
      stats.skippedImages ? `Skipped images (no match / not downloadable): ${stats.skippedImages}.` : null,
      `Nav links: ${stats.navLinksCreated}.`,
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
