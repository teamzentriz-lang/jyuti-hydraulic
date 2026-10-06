import { normalizePath, normalizeSlug } from "@/lib/paths";
import type { WpPageItem } from "@/lib/import/wordpress-client";
import { wpOrigin } from "@/lib/import/wordpress-client";

/** First path segment for sibling catalogue trees at the site root (mirrors live nav). */
export const CATALOG_ROOT_SLUGS = new Set([
  "products",
  "hydraulic-cylinder-manufacturers",
  "hydraulic-power-pack",
  "worm-gear-screw-jack",
  "baling-machine-manufacturers-in-india",
  "baling-machines",
  "scrap-baling-machines",
  "hydraulic-rotary-union",
  "leveling-jacks",
  "hydraulic-pump-manufacturers-in-india",
  "hydraulic-pump",
  "hydraulic-jacks",
  "waste-paper-corrugated-box-baling-press-machine",
]);

const NON_CATALOG_ROOTS = new Set([
  "about-us",
  "contact",
  "catalogue",
  "gallery",
  "certificates",
  "blogs",
  "blog",
  "thank-you",
  "return-policy",
  "privacy-policy",
  "terms",
  "city",
  "exports",
  "wp-content",
  "feed",
  "sitemap",
]);

export type CatalogPage = WpPageItem & {
  path: string;
  depth: number;
  isLeaf: boolean;
};

export function pagePathFromLink(link: string) {
  const origin = wpOrigin();
  const href = link.startsWith("http") ? link : `${origin}/${link.replace(/^\//, "")}`;
  try {
    return normalizePath(new URL(href).pathname);
  } catch {
    return normalizePath(link);
  }
}

export function pathDepth(path: string) {
  return path ? path.split("/").length : 0;
}

function isBlockedCatalogRoot(path: string) {
  const root = path.split("/")[0] ?? "";
  return !root || NON_CATALOG_ROOTS.has(root);
}

/** Pages that belong to the product catalogue (not city, exports, or static pages). */
export function filterCatalogCandidates(pages: WpPageItem[]): WpPageItem[] {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const pathById = new Map<number, string>();
  for (const page of pages) {
    pathById.set(page.id, pagePathFromLink(page.link));
  }

  const inCatalog = new Set<number>();

  function markWithAncestors(id: number) {
    let current: number | undefined = id;
    while (current && current > 0) {
      if (inCatalog.has(current)) break;
      inCatalog.add(current);
      const wpParent: number = byId.get(current)?.parent ?? 0;
      current = wpParent > 0 ? wpParent : undefined;
    }
  }

  for (const page of pages) {
    const path = pathById.get(page.id) ?? "";
    if (isBlockedCatalogRoot(path)) continue;
    const root = path.split("/")[0] ?? "";
    if (path.startsWith("products/") || path === "products" || CATALOG_ROOT_SLUGS.has(root)) {
      markWithAncestors(page.id);
    }
  }

  return pages.filter((page) => inCatalog.has(page.id));
}

export function buildCatalogGraph(pages: WpPageItem[]): CatalogPage[] {
  const catalogPages = filterCatalogCandidates(pages);
  const catalogIds = new Set(catalogPages.map((page) => page.id));
  const children = new Map<number, number[]>();

  for (const page of catalogPages) {
    if (page.parent > 0 && catalogIds.has(page.parent)) {
      const list = children.get(page.parent) ?? [];
      list.push(page.id);
      children.set(page.parent, list);
    }
  }

  return catalogPages.map((page) => {
    const path = pagePathFromLink(page.link);
    const childCount = (children.get(page.id) ?? []).length;
    const root = path.split("/")[0] ?? "";
    // Lone WordPress roots (no parent, no children) are category landings, not products.
    const standaloneRoot = page.parent === 0 && CATALOG_ROOT_SLUGS.has(root);
    const isLeaf = childCount === 0 && !standaloneRoot;
    return {
      ...page,
      path,
      depth: pathDepth(path),
      isLeaf,
    };
  });
}

export function slugFromPath(path: string) {
  const parts = path.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? path;
  return normalizeSlug(last) || "item";
}

export function sortCategoriesForInsert(categories: CatalogPage[]) {
  return [...categories].sort((a, b) => a.depth - b.depth || a.path.localeCompare(b.path));
}

export function resolveProductCategoryIds(input: {
  path: string;
  parentCategoryId: string | null;
  categoryIdByPath: Map<string, string>;
}) {
  const segments = input.path.split("/").filter(Boolean);
  if (!input.parentCategoryId) {
    return { categoryId: null as string | null, subCategoryId: null as string | null };
  }
  if (segments.length <= 2) {
    return { categoryId: input.parentCategoryId, subCategoryId: null };
  }
  const rootPath = segments[0] === "products" && segments.length > 2 ? segments[1] : segments[0];
  const rootKey = segments[0] === "products" ? `products/${rootPath}` : rootPath;
  const rootId = input.categoryIdByPath.get(rootKey) ?? input.categoryIdByPath.get(rootPath) ?? null;
  return {
    categoryId: rootId ?? input.parentCategoryId,
    subCategoryId: input.parentCategoryId,
  };
}
