import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { routes } from "@/db/schema";
import { publicPath, siteOrigin } from "@/lib/paths";

export const dynamic = "force-dynamic";

const STATIC_PATHS = [
  "/",
  "/products/",
  "/gallery/",
  "/certificates/",
  "/catalogue/",
  "/blogs/",
  "/contact/",
  "/about-us/",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const pages = new Map<string, Date | undefined>();
  for (const path of STATIC_PATHS) pages.set(path, undefined);

  try {
    const rows = await getDb()
      .select({ path: routes.path, updatedAt: routes.updatedAt })
      .from(routes)
      .where(eq(routes.status, "published"));
    for (const row of rows) {
      const path = publicPath(row.path);
      if (path.startsWith("/admin") || path.startsWith("/api")) continue;
      pages.set(path, row.updatedAt);
    }
  } catch {
    // Static pages still ship if the database is unavailable.
  }

  return [...pages.entries()].map(([path, updatedAt]) => ({
    url: `${origin}${path}`,
    lastModified: updatedAt,
  }));
}
