/**
 * One-shot cleanup: remove HTML <table> blocks from product overview/body/
 * richContent when structured specs already exist (products.specs jsonb or
 * product_specifications rows). Specs stay editable only in FullSpecsEditor.
 *
 * Usage: npx tsx scripts/strip-product-overview-tables.ts
 * Dry run: DRY_RUN=1 npx tsx scripts/strip-product-overview-tables.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { eq, sql } from "drizzle-orm";
import { getDb, withDatabaseRetry } from "../src/db";
import { products } from "../src/db/schema";
import { stripSpecTablesFromHtml } from "../src/lib/cms/product-article";

async function main() {
  const dryRun = process.env.DRY_RUN === "1";
  const db = getDb();
  const rows = await withDatabaseRetry(() =>
    db
      .select({
        id: products.id,
        path: products.path,
        overview: products.overview,
        body: products.body,
        richContent: products.richContent,
        specs: products.specs,
      })
      .from(products),
  );

  let relationalCounts = new Map<string, number>();
  try {
    const relational = await withDatabaseRetry(() =>
      db.execute(sql`
        select product_id as id, count(*)::int as c
        from product_specifications
        group by product_id
      `),
    );
    const list = ((relational as { rows?: { id: string; c: number }[] }).rows ??
      []) as { id: string; c: number }[];
    relationalCounts = new Map(list.map((row) => [row.id, row.c]));
  } catch {
    console.warn("product_specifications unavailable; using products.specs only");
  }

  let updated = 0;
  let skipped = 0;
  for (const row of rows) {
    const jsonCount = Array.isArray(row.specs) ? row.specs.length : 0;
    const tableCount = relationalCounts.get(row.id) ?? 0;
    if (!jsonCount && !tableCount) {
      skipped += 1;
      continue;
    }
    const nextOverview = stripSpecTablesFromHtml(row.overview || "");
    const nextBody = stripSpecTablesFromHtml(row.body || "");
    const nextRich = stripSpecTablesFromHtml(row.richContent || "");
    if (
      nextOverview === (row.overview || "") &&
      nextBody === (row.body || "") &&
      nextRich === (row.richContent || "")
    ) {
      skipped += 1;
      continue;
    }
    console.log(
      `${dryRun ? "[dry] " : ""}strip tables: /${row.path}/ (json=${jsonCount}, rows=${tableCount})`,
    );
    if (!dryRun) {
      await withDatabaseRetry(() =>
        db
          .update(products)
          .set({
            overview: nextOverview,
            body: nextBody,
            richContent: nextRich,
            updatedAt: new Date(),
          })
          .where(eq(products.id, row.id)),
      );
    }
    updated += 1;
  }
  console.log(`Done. updated=${updated} skipped=${skipped} dryRun=${dryRun}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
