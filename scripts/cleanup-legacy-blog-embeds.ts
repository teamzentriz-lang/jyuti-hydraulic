/**
 * Permanently remove WordPress-imported blog-card HTML from Product and City
 * page descriptions. Does not touch actual blog posts or related-post tables.
 *
 * Dry-run (default):
 *   npx tsx scripts/cleanup-legacy-blog-embeds.ts
 *   npm run db:cleanup-legacy-blog-embeds
 *
 * Apply updates:
 *   npx tsx scripts/cleanup-legacy-blog-embeds.ts --apply
 *   npm run db:cleanup-legacy-blog-embeds:apply
 */
import { config } from "dotenv";
import { eq } from "drizzle-orm";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import {
  hasLegacyBlogEmbed,
  legacyBlogEmbedSnippet,
  removeLegacyBlogEmbed,
} from "../src/lib/cms/legacy-blog-embed";

type FieldChange = {
  field: string;
  beforeLength: number;
  afterLength: number;
  snippet: string;
};

type RecordChange = {
  kind: "product" | "city";
  id: string;
  title: string;
  path: string;
  fields: FieldChange[];
};

function cleanField(value: string): { next: string; changed: boolean; snippet: string } {
  if (!hasLegacyBlogEmbed(value)) {
    return { next: value, changed: false, snippet: "" };
  }
  return {
    next: removeLegacyBlogEmbed(value),
    changed: true,
    snippet: legacyBlogEmbedSnippet(value),
  };
}

function printReport(
  productsInspected: number,
  citiesInspected: number,
  changes: RecordChange[],
  apply: boolean,
) {
  const productChanges = changes.filter((item) => item.kind === "product");
  const cityChanges = changes.filter((item) => item.kind === "city");

  console.log("");
  console.log("=== Legacy blog-embed cleanup report ===");
  console.log(`Mode: ${apply ? "APPLY" : "DRY-RUN (no writes)"}`);
  console.log(`Product records inspected: ${productsInspected}`);
  console.log(`Product records requiring cleanup: ${productChanges.length}`);
  console.log(`City records inspected: ${citiesInspected}`);
  console.log(`City records requiring cleanup: ${cityChanges.length}`);
  console.log(`Total records ${apply ? "modified" : "to modify"}: ${changes.length}`);
  console.log("");

  const examples = changes.slice(0, 8);
  if (!examples.length) {
    console.log("No legacy embedded blog HTML found.");
    return;
  }

  console.log("Examples of detected legacy content:");
  for (const item of examples) {
    console.log(`- [${item.kind}] ${item.path} (${item.title})`);
    for (const field of item.fields) {
      console.log(
        `    field=${field.field} chars ${field.beforeLength} → ${field.afterLength}`,
      );
      if (field.snippet) console.log(`    snippet: ${field.snippet}`);
    }
  }
  if (changes.length > examples.length) {
    console.log(`…and ${changes.length - examples.length} more record(s).`);
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { closeDb, getDb } = await import("../src/db");
  const { locationPages, products } = await import("../src/db/schema");
  const db = getDb();

  const productRows = await db
    .select({
      id: products.id,
      title: products.title,
      path: products.path,
      overview: products.overview,
      body: products.body,
      richContent: products.richContent,
    })
    .from(products);

  const cityRows = await db
    .select({
      id: locationPages.id,
      title: locationPages.title,
      path: locationPages.path,
      body: locationPages.body,
    })
    .from(locationPages);

  const productUpdates: Array<{
    id: string;
    title: string;
    path: string;
    overview: string;
    body: string;
    richContent: string;
    fields: FieldChange[];
  }> = [];
  const cityUpdates: Array<{
    id: string;
    title: string;
    path: string;
    body: string;
    fields: FieldChange[];
  }> = [];

  for (const row of productRows) {
    const fields: FieldChange[] = [];
    const next = {
      overview: row.overview,
      body: row.body,
      richContent: row.richContent,
    };

    for (const field of ["overview", "body", "richContent"] as const) {
      const result = cleanField(row[field] ?? "");
      if (!result.changed) continue;
      next[field] = result.next;
      fields.push({
        field,
        beforeLength: (row[field] ?? "").length,
        afterLength: result.next.length,
        snippet: result.snippet,
      });
    }

    if (!fields.length) continue;
    productUpdates.push({
      id: row.id,
      title: row.title,
      path: row.path,
      overview: next.overview,
      body: next.body,
      richContent: next.richContent,
      fields,
    });
  }

  for (const row of cityRows) {
    const result = cleanField(row.body ?? "");
    if (!result.changed) continue;
    cityUpdates.push({
      id: row.id,
      title: row.title,
      path: row.path,
      body: result.next,
      fields: [
        {
          field: "body",
          beforeLength: (row.body ?? "").length,
          afterLength: result.next.length,
          snippet: result.snippet,
        },
      ],
    });
  }

  const changes: RecordChange[] = [
    ...productUpdates.map((item) => ({
      kind: "product" as const,
      id: item.id,
      title: item.title,
      path: item.path,
      fields: item.fields,
    })),
    ...cityUpdates.map((item) => ({
      kind: "city" as const,
      id: item.id,
      title: item.title,
      path: item.path,
      fields: item.fields,
    })),
  ];

  if (apply && changes.length) {
    await db.transaction(async (tx) => {
      for (const item of productUpdates) {
        await tx
          .update(products)
          .set({
            overview: item.overview,
            body: item.body,
            richContent: item.richContent,
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.id));
      }
      for (const item of cityUpdates) {
        await tx
          .update(locationPages)
          .set({
            body: item.body,
            updatedAt: new Date(),
          })
          .where(eq(locationPages.id, item.id));
      }
    });
  }

  printReport(productRows.length, cityRows.length, changes, apply);

  if (!apply && changes.length) {
    console.log("");
    console.log("Review the dry-run above, then apply with:");
    console.log("  npx tsx scripts/cleanup-legacy-blog-embeds.ts --apply");
    console.log("  npm run db:cleanup-legacy-blog-embeds:apply");
  }

  await closeDb();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
