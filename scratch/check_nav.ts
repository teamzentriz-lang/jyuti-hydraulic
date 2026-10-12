import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { getDb } from "../src/db/index";
import { navLinks, productCategories, products } from "../src/db/schema";
import { getSite } from "../src/lib/cms/site";
import { buildCatalogNavItems } from "../src/lib/cms/product-nav";

async function main() {
  const db = getDb();
  const allNavLinks = await db.select().from(navLinks);
  console.log("=== NAV LINKS COUNT ===", allNavLinks.length);
  console.log("NAV LINKS:", JSON.stringify(allNavLinks, null, 2));

  const allCats = await db.select().from(productCategories);
  console.log("=== PRODUCT CATEGORIES COUNT ===", allCats.length);
  console.log("CATS:", allCats.map(c => ({ id: c.id, title: c.title, status: c.status, showInMenu: c.showInMenu, parentId: c.parentId })));

  const catalogNav = await buildCatalogNavItems(db);
  console.log("=== CATALOG NAV ITEMS ===", catalogNav.length);
  console.log("CATALOG NAV:", JSON.stringify(catalogNav, null, 2));

  const site = await getSite();
  console.log("=== SITE HEADER NAV ===");
  console.log("HEADER NAV:", JSON.stringify(site.headerNav, null, 2));
}

main().catch(console.error);
