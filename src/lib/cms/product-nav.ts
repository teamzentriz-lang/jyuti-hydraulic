import { and, asc, eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { productCategories, products } from "@/db/schema";
import type { NavItem } from "@/lib/cms/site";
import { normalizePath, publicPath } from "@/lib/paths";

type Db = ReturnType<typeof getDb>;

function categoryToNavItem(row: { id: string; title: string; path: string }): NavItem {
  return {
    id: `cat-${row.id}`,
    label: row.title,
    href: publicPath(row.path),
    openInNewTab: false,
    children: [],
  };
}

/** Published catalogue tree for the Products menu (categories + product pages). */
export async function buildCatalogNavItems(db: Db): Promise<NavItem[]> {
  const [categoryRows, productRows] = await Promise.all([
    db
      .select({
        id: productCategories.id,
        title: productCategories.title,
        path: productCategories.path,
        parentId: productCategories.parentId,
        sortOrder: productCategories.sortOrder,
        showInMenu: productCategories.showInMenu,
      })
      .from(productCategories)
      .where(and(eq(productCategories.status, "published"), eq(productCategories.showInMenu, true)))
      .orderBy(asc(productCategories.sortOrder), asc(productCategories.title)),
    db
      .select({
        id: products.id,
        title: products.title,
        path: products.path,
        categoryId: products.categoryId,
        subCategoryId: products.subCategoryId,
        sortOrder: products.sortOrder,
      })
      .from(products)
      .where(eq(products.status, "published"))
      .orderBy(asc(products.sortOrder), asc(products.title)),
  ]);

  if (!categoryRows.length) return [];

  const nodes = new Map<string, NavItem>();
  for (const row of categoryRows) {
    nodes.set(row.id, categoryToNavItem(row));
  }

  const roots: NavItem[] = [];
  for (const row of categoryRows) {
    const node = nodes.get(row.id);
    if (!node) continue;
    if (row.parentId && nodes.has(row.parentId)) {
      nodes.get(row.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  for (const product of productRows) {
    const parentId = product.subCategoryId ?? product.categoryId;
    if (!parentId || !nodes.has(parentId)) continue;
    nodes.get(parentId)!.children.push({
      id: `prod-${product.id}`,
      label: product.title,
      href: publicPath(product.path),
      openInNewTab: false,
      children: [],
    });
  }

  const sortChildren = (items: NavItem[]) => {
    for (const item of items) {
      if (item.children.length) sortChildren(item.children);
    }
  };
  sortChildren(roots);

  return roots;
}

export function isProductsNavItem(item: NavItem) {
  return /^products$/i.test(item.label.trim());
}

export type NavLinkMenuRow = {
  id: string;
  label: string;
  href: string;
  location: string;
  parentId: string | null;
  openInNewTab: boolean;
  itemType: string;
  referenceId: string | null;
  sortOrder: number;
};

type CatalogIndex = {
  byPath: Map<string, NavItem>;
  byCategoryId: Map<string, NavItem>;
};

function catalogPathKey(href: string) {
  return normalizePath(href);
}

function indexCatalogTree(catalogNav: NavItem[]): CatalogIndex {
  const byPath = new Map<string, NavItem>();
  const byCategoryId = new Map<string, NavItem>();

  function walk(items: NavItem[]) {
    for (const item of items) {
      byPath.set(catalogPathKey(item.href), item);
      if (item.id.startsWith("cat-")) {
        byCategoryId.set(item.id.slice(4), item);
      }
      if (item.children.length) walk(item.children);
    }
  }

  walk(catalogNav);
  return { byPath, byCategoryId };
}

function catalogChildrenForLink(row: NavLinkMenuRow, catalog: CatalogIndex): NavItem[] {
  if (row.itemType === "product_category" && row.referenceId) {
    return catalog.byCategoryId.get(row.referenceId)?.children ?? [];
  }
  return catalog.byPath.get(catalogPathKey(row.href))?.children ?? [];
}

function navLinkRowToItem(row: NavLinkMenuRow, children: NavItem[]): NavItem {
  return {
    id: row.id,
    label: row.label,
    href: publicPath(row.href),
    openInNewTab: row.openInNewTab,
    children,
  };
}

function buildNavLinkBranch(rows: NavLinkMenuRow[], parentId: string | null, catalog: CatalogIndex): NavItem[] {
  return rows
    .filter((row) => (row.parentId ?? null) === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
    .map((row) => {
      let children = buildNavLinkBranch(rows, row.id, catalog);
      if (!children.length) {
        children = catalogChildrenForLink(row, catalog);
      } else {
        children = children.map((child) => enrichNavItemFromCatalog(child, catalog));
      }
      return navLinkRowToItem(row, children);
    });
}

function enrichNavItemFromCatalog(item: NavItem, catalog: CatalogIndex): NavItem {
  const children = item.children.length
    ? item.children.map((child) => enrichNavItemFromCatalog(child, catalog))
    : (catalog.byPath.get(catalogPathKey(item.href))?.children ?? []);
  return { ...item, children };
}

/** Products hover menu: admin links first, then catalogue fallback. */
export function buildProductsDropdownNav(
  navRows: NavLinkMenuRow[],
  headerNav: NavItem[],
  catalogNav: NavItem[],
): NavItem[] {
  const catalog = indexCatalogTree(catalogNav);
  const productMenuRows = navRows.filter((row) => row.location === "products");

  if (productMenuRows.length) {
    return buildNavLinkBranch(productMenuRows, null, catalog);
  }

  const headerChildren = headerNav.find(isProductsNavItem)?.children ?? [];
  if (headerChildren.length) {
    return headerChildren.map((item) => enrichNavItemFromCatalog(item, catalog));
  }

  return catalogNav.map((item) => enrichNavItemFromCatalog(item, catalog));
}

export function mergeProductsNavChildren(headerNav: NavItem[], productsChildren: NavItem[]): NavItem[] {
  if (!productsChildren.length) return headerNav;
  return headerNav.map((item) =>
    isProductsNavItem(item) ? { ...item, children: productsChildren } : item,
  );
}

export function dedupeNavRoots(items: NavItem[]): NavItem[] {
  const seen = new Set<string>();
  const out: NavItem[] = [];
  for (const item of items) {
    const key = `${item.label.trim().toLowerCase()}|${item.href.replace(/\/+$/, "") || "/"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
