import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { footerSettings, headerSettings, navLinks, redirects } from "@/db/schema";
import {
  ensureSingletons,
  getFooterSettings,
  getHeaderSettings,
  getSettings,
  mediaItems,
  type MediaItem,
} from "@/lib/cms/queries";
import {
  buildPublishedContent,
  findPublishedTarget,
  type PublishedContent,
} from "@/lib/cms/published-content";
import {
  buildCatalogNavItems,
  buildProductsDropdownNav,
  dedupeNavRoots,
  mergeProductsNavChildren,
} from "@/lib/cms/product-nav";
import { normalizePath, publicPath } from "@/lib/paths";

export type { PublishedContent };

export type NavItem = {
  id: string;
  label: string;
  href: string;
  openInNewTab: boolean;
  children: NavItem[];
};

export type SiteContext = {
  settings: Awaited<ReturnType<typeof getSettings>>;
  header: typeof headerSettings.$inferSelect;
  footer: typeof footerSettings.$inferSelect;
  logo: MediaItem | null;
  mobileLogo: MediaItem | null;
  footerLogo: MediaItem | null;
  headerNav: NavItem[];
  footerNav: NavItem[];
};

function buildNavTree(
  rows: {
    id: string;
    label: string;
    href: string;
    parentId: string | null;
    openInNewTab: boolean;
  }[],
): NavItem[] {
  const nodes = new Map<string, NavItem>();
  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      label: row.label,
      href: row.href,
      openInNewTab: row.openInNewTab,
      children: [],
    });
  }
  const roots: NavItem[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id);
    if (!node) continue;
    if (row.parentId && nodes.has(row.parentId)) {
      nodes.get(row.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export const getSite = cache(async (): Promise<SiteContext> => {
  await ensureSingletons();
  const [settings, header, footer] = await Promise.all([getSettings(), getHeaderSettings(), getFooterSettings()]);
  const db = getDb();
  const navRows = await db
    .select()
    .from(navLinks)
    .where(eq(navLinks.isActive, true))
    .orderBy(asc(navLinks.sortOrder));
  const catalogNav = await buildCatalogNavItems(db);
  const headerNavTree = dedupeNavRoots(buildNavTree(navRows.filter((row) => row.location === "header")));
  const productsMenuNav = buildProductsDropdownNav(navRows, headerNavTree, catalogNav);
  const mediaIds = [header.logoId, header.mobileLogoId, footer.logoId, settings.logoId].filter(
    (id): id is string => Boolean(id),
  );
  const uniqueMediaIds = [...new Set(mediaIds)];
  const media = uniqueMediaIds.length ? await mediaItems(uniqueMediaIds) : [];
  const mediaById = new Map(media.map((item) => [item.id, item]));
  const siteLogo = settings.logoId ? mediaById.get(settings.logoId) : undefined;
  return {
    settings,
    header,
    footer,
    logo: (header.logoId ? mediaById.get(header.logoId) : undefined) ?? siteLogo ?? null,
    mobileLogo: header.mobileLogoId ? (mediaById.get(header.mobileLogoId) ?? null) : null,
    footerLogo: footer.logoId ? (mediaById.get(footer.logoId) ?? null) : null,
    headerNav: mergeProductsNavChildren(headerNavTree, productsMenuNav),
    footerNav: dedupeNavRoots(buildNavTree(navRows.filter((row) => row.location === "footer"))),
  };
});

export async function findActiveRedirect(requestPath: string) {
  const db = getDb();
  const normalized = publicPath(normalizePath(requestPath));
  const [row] = await db
    .select()
    .from(redirects)
    .where(and(eq(redirects.fromPath, normalized), eq(redirects.active, true)))
    .limit(1);
  return row ?? null;
}

export async function resolvePublishedContent(pathSegments: string[]): Promise<PublishedContent | null> {
  const path = normalizePath(pathSegments.join("/"));
  if (!path) return null;

  const db = getDb();
  const target = await findPublishedTarget(db, path);
  if (!target) return null;
  return buildPublishedContent(db, target);
}
