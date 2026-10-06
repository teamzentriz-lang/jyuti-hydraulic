import "dotenv/config";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "@/db";
import { media } from "@/db/schema";
import { createStorageProviderForRecord } from "@/lib/storage/factory";
import { LocalStorageProvider } from "@/lib/storage/local-provider";
import { R2StorageProvider, readR2ConfigFromEnv } from "@/lib/storage/r2-provider";

const BATCH_SIZE = 50;

type CliOptions = {
  dryRun: boolean;
  batchSize: number;
};

function parseArgs(argv: string[]): CliOptions {
  const dryRun = argv.includes("--dry-run");
  const batchArg = argv.find((arg) => arg.startsWith("--batch="));
  const batchSize = batchArg ? Number(batchArg.split("=")[1]) : BATCH_SIZE;
  return { dryRun, batchSize: Number.isFinite(batchSize) && batchSize > 0 ? batchSize : BATCH_SIZE };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const db = getDb();
  const local = createStorageProviderForRecord("local") as LocalStorageProvider;
  const r2 = new R2StorageProvider(readR2ConfigFromEnv());

  const rows = await db
    .select({
      id: media.id,
      storageKey: media.storageKey,
      storageDriver: media.storageDriver,
      url: media.url,
    })
    .from(media)
    .where(eq(media.storageDriver, "local"));

  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  const failures: { id: string; storageKey: string; error: string }[] = [];
  const wouldMigrate: string[] = [];
  let alreadyOnR2 = 0;

  console.log(options.dryRun ? "DRY RUN\n" : "Media migration started\n");
  console.log(`Total local records: ${rows.length}\n`);

  for (let offset = 0; offset < rows.length; offset += options.batchSize) {
    const batch = rows.slice(offset, offset + options.batchSize);
    for (const row of batch) {
      try {
        const existsOnR2 = await r2.exists(row.storageKey);
        if (existsOnR2) {
          alreadyOnR2 += 1;
          if (!options.dryRun) {
            await db
              .update(media)
              .set({
                storageDriver: "r2",
                url: r2.getUrl(row.storageKey),
                updatedAt: new Date(),
              })
              .where(eq(media.id, row.id));
          }
          skipped += 1;
          continue;
        }

        const existsLocally = await local.exists(row.storageKey);
        if (!existsLocally) {
          failed += 1;
          failures.push({
            id: row.id,
            storageKey: row.storageKey,
            error: "Local file not found.",
          });
          continue;
        }

        if (options.dryRun) {
          wouldMigrate.push(row.storageKey);
          continue;
        }

        const bytes = await local.getObject(row.storageKey);
        const [existing] = await db.select({ mimeType: media.mimeType }).from(media).where(eq(media.id, row.id)).limit(1);
        await r2.upload({
          body: bytes,
          mimeType: existing?.mimeType ?? "application/octet-stream",
          originalName: row.storageKey.split("/").pop() ?? "file",
          storageKey: row.storageKey,
        });

        const verified = await r2.exists(row.storageKey);
        if (!verified) throw new Error("Upload verification failed.");

        await db
          .update(media)
          .set({
            storageDriver: "r2",
            url: r2.getUrl(row.storageKey),
            updatedAt: new Date(),
          })
          .where(eq(media.id, row.id));

        migrated += 1;
      } catch (error) {
        failed += 1;
        failures.push({
          id: row.id,
          storageKey: row.storageKey,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  if (options.dryRun) {
    console.log("Would migrate:");
    for (const key of wouldMigrate) console.log(key);
    console.log(`\nWould migrate: ${wouldMigrate.length}`);
    console.log(`Already on R2: ${alreadyOnR2}`);
    console.log(`Missing local file: ${failures.length}`);
    await closeDb();
    return;
  }

  const remaining = Math.max(0, rows.length - migrated - skipped - failed);
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped (already on R2): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Remaining: ${remaining}`);

  if (failures.length) {
    console.log("\nFailures:");
    for (const item of failures) {
      console.log(`${item.id}\t${item.storageKey}\t${item.error}`);
    }
    console.log("\nMigration completed with errors.");
  } else {
    console.log("\nMigration completed successfully.");
  }

  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
