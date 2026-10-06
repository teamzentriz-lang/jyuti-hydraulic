import { eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { locationPages, productCategories, products, routes } from "@/db/schema";
import { reserveRoute } from "@/lib/cms/routes";
import { normalizePath } from "@/lib/paths";

type Db = ReturnType<typeof getDb>;

export type RouteRepairStats = {
  locations: number;
  categories: number;
  products: number;
};

async function publishedPaths(db: Db) {
  const rows = await db.select({ path: routes.path }).from(routes).where(eq(routes.status, "published"));
  return new Set(rows.map((row) => row.path));
}

/** Attach published routes for catalogue/location rows that exist but have no route (failed import). */
export async function repairMissingPublishedRoutes(db: Db, dryRun = false): Promise<RouteRepairStats> {
  const stats: RouteRepairStats = { locations: 0, categories: 0, products: 0 };
  const paths = await publishedPaths(db);

  const repair = async (
    kind: "location" | "category" | "product",
    table: typeof locationPages | typeof productCategories | typeof products,
    counter: keyof RouteRepairStats,
  ) => {
    const rows = await db
      .select({ id: table.id, path: table.path, status: table.status })
      .from(table)
      .where(eq(table.status, "published"));
    for (const row of rows) {
      const path = normalizePath(row.path);
      if (!path || paths.has(path)) continue;
      if (dryRun) {
        stats[counter] += 1;
        continue;
      }
      await db.transaction(async (tx) => {
        await reserveRoute(tx, { path, kind, entityId: row.id, status: "published" });
      });
      paths.add(path);
      stats[counter] += 1;
    }
  };

  await repair("location", locationPages, "locations");
  await repair("category", productCategories, "categories");
  await repair("product", products, "products");

  return stats;
}
