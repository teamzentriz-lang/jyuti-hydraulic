import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import { pagePathFromLink } from "@/lib/import/wordpress-catalog";
import { filterCityPages } from "@/lib/import/wordpress-geo";
import { listAllPublishedPages } from "@/lib/import/wordpress-client";

async function main() {
  const all = await listAllPublishedPages(null);
  const cities = filterCityPages(all);
  const cityPaths = new Set(cities.map((p) => p.path));
  const missing: { id: number; path: string; link: string }[] = [];
  for (const page of all) {
    const path = pagePathFromLink(page.link);
    if (path.startsWith("city/") && path !== "city" && !cityPaths.has(path)) {
      missing.push({ id: page.id, path, link: page.link });
    }
  }
  console.log("filtered cities:", cities.length);
  console.log("excluded city-like pages:", missing.length);
  for (const row of missing) {
    console.log(JSON.stringify(row));
    console.log("regex ok:", /^city\/[a-z0-9-]+$/.test(row.path));
  }
}

main().catch(console.error);
