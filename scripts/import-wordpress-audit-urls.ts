import { config } from "dotenv";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import { closeDb, getDb } from "@/db";
import { auditWordPressUrls, writeMissingUrlReport } from "@/lib/import/wordpress-url-audit";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in .env.local before running the URL audit.");
    process.exit(1);
  }

  const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
  const output = outputArg ? outputArg.slice("--output=".length) : join(process.cwd(), "reports", "wordpress-url-audit.txt");

  const db = getDb();
  const result = await auditWordPressUrls(db);

  await mkdir(dirname(output), { recursive: true });
  await writeMissingUrlReport(result, output);

  console.log(`WordPress paths: ${result.wordpressPaths.length}`);
  console.log(`CMS published routes: ${result.cmsPaths.length}`);
  console.log(`Missing in CMS: ${result.missingInCms.length}`);
  console.log(`CMS-only paths: ${result.cmsOnly.length}`);
  console.log(`Report written to ${output}`);
  if (result.missingInCms.length) {
    console.log("Review missing URLs and add redirects in /admin/redirects/ where paths intentionally changed.");
  }

  await closeDb();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
