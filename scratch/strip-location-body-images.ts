/**
 * Persist cleaned location/export bodies so admin editors no longer load
 * mid-article WordPress product images / contact chrome.
 * Skips updates that would wipe most of the copy (safety guard).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { exportPages, locationPages } from "../src/db/schema";
import { normalizeLocationBody } from "../src/lib/cms/product-article";

function plainLen(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
}

async function main() {
  const db = getDb();
  const locations = await db.select().from(locationPages);
  let locationUpdated = 0;
  let locationSkipped = 0;
  for (const row of locations) {
    const before = row.body ?? "";
    const next = normalizeLocationBody(before, row.locationName ?? "");
    if (next === before) continue;
    const beforeLen = plainLen(before);
    const afterLen = plainLen(next);
    if (beforeLen > 120 && afterLen < Math.max(40, beforeLen * 0.35)) {
      locationSkipped += 1;
      console.log("SKIP-unsafe", row.path, beforeLen, "→", afterLen);
      continue;
    }
    await db
      .update(locationPages)
      .set({ body: next, updatedAt: new Date() })
      .where(eq(locationPages.id, row.id));
    locationUpdated += 1;
    if (locationUpdated <= 20 || before.includes("<img")) {
      console.log("location", row.path, beforeLen, "→", afterLen);
    }
  }

  const exports = await db.select().from(exportPages);
  let exportUpdated = 0;
  let exportSkipped = 0;
  for (const row of exports) {
    const before = row.body ?? "";
    const next = normalizeLocationBody(before, row.country ?? "");
    if (next === before) continue;
    const beforeLen = plainLen(before);
    const afterLen = plainLen(next);
    if (beforeLen > 120 && afterLen < Math.max(40, beforeLen * 0.35)) {
      exportSkipped += 1;
      console.log("SKIP-unsafe-export", row.path, beforeLen, "→", afterLen);
      continue;
    }
    await db
      .update(exportPages)
      .set({ body: next, updatedAt: new Date() })
      .where(eq(exportPages.id, row.id));
    exportUpdated += 1;
    console.log("export", row.path);
  }

  console.log(
    JSON.stringify({
      locationUpdated,
      locationSkipped,
      exportUpdated,
      exportSkipped,
      locationTotal: locations.length,
      exportTotal: exports.length,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
