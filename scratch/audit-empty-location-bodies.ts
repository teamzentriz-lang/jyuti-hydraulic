import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { getDb } from "../src/db";
import { exportPages, locationPages } from "../src/db/schema";

async function main() {
  const db = getDb();
  const locations = await db.select().from(locationPages);
  const emptyLoc = locations.filter((row) => !(row.body ?? "").replace(/<[^>]+>/g, " ").trim());
  const shortLoc = locations.filter((row) => (row.body ?? "").replace(/<[^>]+>/g, " ").trim().length < 80);
  console.log(
    JSON.stringify(
      {
        locationTotal: locations.length,
        emptyLoc: emptyLoc.length,
        shortLoc: shortLoc.length,
        emptySamples: emptyLoc.slice(0, 8).map((r) => r.path),
        shortSamples: shortLoc.slice(0, 8).map((r) => ({
          path: r.path,
          body: (r.body ?? "").slice(0, 160),
        })),
      },
      null,
      2,
    ),
  );

  const chhota = locations.find((r) => r.path.includes("15-hp") && r.path.includes("chhota"));
  console.log(
    "chhota body len",
    (chhota?.body ?? "").length,
    "preview",
    (chhota?.body ?? "").slice(0, 400),
  );

  const exports = await db.select().from(exportPages);
  const emptyExp = exports.filter((row) => !(row.body ?? "").replace(/<[^>]+>/g, " ").trim());
  console.log(JSON.stringify({ exportTotal: exports.length, emptyExp: emptyExp.length }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
