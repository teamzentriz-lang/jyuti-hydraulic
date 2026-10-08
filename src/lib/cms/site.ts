import { cache } from "react";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { footerSettings, headerSettings, media, navLinks, redirects } from "@/db/schema";
import { storageService } from "@/lib/storage";
import {
  ensureSingletons,
  getFooterSettings,
  getHeaderSettings,
  getSettings,
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

async function loadAvailableMedia(ids: string[]) {
  const available = new Map<string, MediaItem>();
  if (!ids.length) return available;
  const rows = await getDb()
    .select({
      id: media.id,
      url: media.url,
      filename: media.filename,
      alt: media.alt,
      mimeType: media.mimeType,
      storageKey: media.storageKey,
      storageDriver: media.storageDriver,
      legacyUrl: media.legacyUrl,
    })
    .from(media)
    .where(inArray(media.id, ids));
  for (const row of rows) {
    const remote =
      /^https?:\/\//i.test(row.url) || Boolean(row.legacyUrl && /^https?:\/\//i.test(row.legacyUrl));
    let local = false;
    try {
      local = await storageService.exists(row.storageKey, row.storageDriver);
    } catch {
      local = false;
    }
    if (!local && !remote) continue;
    available.set(row.id, {
      id: row.id,
      url: row.url,
      filename: row.filename,
      alt: row.alt,
      mimeType: row.mimeType,
    });
  }
  return available;
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
  const mediaById = await loadAvailableMedia(uniqueMediaIds);
  const siteLogo = settings.logoId ? mediaById.get(settings.logoId) : undefined;
  return {
    settings,
    header,
    footer,
    logo: header.logoId ? (mediaById.get(header.logoId) ?? null) : (siteLogo ?? null),
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
