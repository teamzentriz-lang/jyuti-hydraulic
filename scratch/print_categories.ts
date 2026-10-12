import dotenv from "dotenv";
dotenv.config();
import { listAllPublishedPages } from "../src/lib/import/wordpress-client";
import { buildCatalogGraph } from "../src/lib/import/wordpress-catalog";

async function main() {
  const pages = await listAllPublishedPages(null);
  const catalog = buildCatalogGraph(pages);
  const categories = catalog.filter((c) => !c.isLeaf);
  console.log("=== 16 CATEGORIES ===");
  for (const c of categories) {
    console.log(
      "- " +
        c.title.rendered +
        " (path: " +
        c.path +
        ", parent: " +
        c.parent +
        ")",
    );
  }
}
main().catch(console.error);
