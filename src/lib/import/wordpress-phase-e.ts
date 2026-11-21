import { randomUUID } from "crypto";
import { eq, inArray, isNull } from "drizzle-orm";
import type { getDb } from "@/db";
import { certificates, galleryItems, navLinks } from "@/db/schema";
import { revalidatePublicSite } from "@/lib/cms/revalidate-public";
import {
  buildFallbackHeaderNav,
  menuLocationToNavLocation,
  pickWordPressMenusForImport,
  purgeImportedNavLocations,
  wordPressMenuRoots,
  wpUrlToHref,
  type FallbackNavLink,
} from "@/lib/import/wordpress-nav";
import { pagePathFromLink } from "@/lib/import/wordpress-catalog";
import { collectImageRefs, resolveMediaIdFromUrl, type MediaLookup } from "@/lib/import/wordpress-html";
import { loadMediaLookup, resolveOrImportMediaFromUrl } from "@/lib/import/wordpress-media";
import {
  fetchWordPressMenus,
  listAllPublishedPages,
  wpPageContentHtml,
  type ImportCliOptions,
  type WpMenuNode,
} from "@/lib/import/wordpress-client";

type Db = ReturnType<typeof getDb>;

export type PhaseEScope = "all" | "gallery" | "certificates" | "nav";

export type PhaseEOptions = ImportCliOptions & {
  scope: PhaseEScope;
};

export type PhaseEStats = {
  galleryCreated: number;
  certificatesCreated: number;
  certificatesUpdated: number;
  navLinksCreated: number;
  skippedImages: number;
  mediaImported: number;
};

export function parsePhaseECliOptions(argv: string[]): PhaseEOptions {
  const scope: PhaseEScope = argv.includes("--certificates-only")
    ? "certificates"
    : argv.includes("--gallery-only")
      ? "gallery"
      : argv.includes("--nav-only")
        ? "nav"
        : "all";
  const dryRun = argv.includes("--dry-run");
  const skipSeo = argv.includes("--skip-seo");
  const skipMedia = argv.includes("--skip-media");
  const purgeDummy = !argv.includes("--keep-seed");
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const limitValue = limitArg ? Number(limitArg.slice("--limit=".length)) : null;
  const pageStartArg = argv.find((arg) => arg.startsWith("--page-start="));
  const pageStartValue = pageStartArg ? Number(pageStartArg.slice("--page-start=".length)) : 1;
  return {
    scope,
    dryRun,
    skipSeo,
    skipMedia,
    purgeDummy,
    limit: limitValue && Number.isFinite(limitValue) && limitValue > 0 ? limitValue : null,
    pageStart: Number.isInteger(pageStartValue) && pageStartValue > 0 ? pageStartValue : 1,
  };
}

async function findWpPageByPath(pages: Awaited<ReturnType<typeof listAllPublishedPages>>, path: string) {
  return pages.find((page) => pagePathFromLink(page.link) === path) ?? null;
}

export async function purgeSeedGalleryAndCertificates(db: Db) {
  await db.delete(galleryItems);
  const certIds = await db
    .select({ id: certificates.id })
    .from(certificates)
    .where(isNull(certificates.legacyId))
    .then((rows) => rows.map((row) => row.id));
  if (certIds.length) {
    await db.delete(certificates).where(inArray(certificates.id, certIds));
  }
  return { gallery: "all", certificates: certIds.length };
}

export async function purgeSeedNav(db: Db) {
  const navIds = await db
    .select({ id: navLinks.id })
    .from(navLinks)
    .where(isNull(navLinks.legacyId))
    .then((rows) => rows.map((row) => row.id));
  if (navIds.length) {
    await db.update(navLinks).set({ parentId: null }).where(inArray(navLinks.id, navIds));
    await db.delete(navLinks).where(inArray(navLinks.id, navIds));
  }
  return navIds.length;
}

async function importImagesFromPage(
  db: Db,
  pagePath: string,
  pageLegacyId: number,
  rawHtml: string,
  lookup: MediaLookup,
  options: PhaseEOptions,
  stats: PhaseEStats,
  mode: "gallery" | "certificates",
) {
  const refs = collectImageRefs(rawHtml);
  const limited = options.limit ? refs.slice(0, options.limit) : refs;
  const seenMedia = new Set<string>();

  let order = 0;
  for (const ref of limited) {
    let mediaId = resolveMediaIdFromUrl(ref.src, lookup);
    if (!mediaId && !options.dryRun && !options.skipMedia) {
      const resolved = await resolveOrImportMediaFromUrl(db, ref.src, lookup, {
        dryRun: false,
        alt: ref.alt,
        title: ref.alt,
      });
      if (resolved.imported) stats.mediaImported += 1;
      mediaId = resolved.mediaId;
    }
    if (!mediaId || seenMedia.has(mediaId)) {
      if (!mediaId) stats.skippedImages += 1;
      continue;
    }
    seenMedia.add(mediaId);

    const title = (ref.alt.trim() || pagePath).slice(0, 300);
    const caption = ref.alt.slice(0, 2000);
    const legacyId = pageLegacyId * 100 + order;

    if (options.dryRun) {
      if (mode === "gallery") stats.galleryCreated += 1;
      else stats.certificatesCreated += 1;
      order += 1;
      continue;
    }

    if (mode === "gallery") {
      await db.insert(galleryItems).values({
        title,
        caption,
        mediaId,
        sortOrder: order,
      });
      stats.galleryCreated += 1;
    } else {
      const [existing] = await db.select({ id: certificates.id }).from(certificates).where(eq(certificates.legacyId, legacyId)).limit(1);
      const values = {
        title,
        caption,
        mediaId,
        sortOrder: order,
        legacyId,
        legacyUrl: ref.src.startsWith("http") ? ref.src : null,
        status: "published",
        updatedAt: new Date(),
      };
      if (existing) {
        await db.update(certificates).set(values).where(eq(certificates.id, existing.id));
        stats.certificatesUpdated += 1;
      } else {
        await db.insert(certificates).values({ id: randomUUID(), ...values });
        stats.certificatesCreated += 1;
      }
    }
    order += 1;
  }
}

async function insertNavTree(
  db: Db,
  location: "header" | "footer" | "products",
  nodes: WpMenuNode[],
  options: PhaseEOptions,
  stats: PhaseEStats,
  legacyMap: Map<number, string>,
  parentUuid: string | null = null,
) {
  const sorted = [...nodes].sort((a, b) => a.order - b.order);
  for (const node of sorted) {
    if (!node.id || !node.title) continue;
    if (options.dryRun) {
      legacyMap.set(node.id, legacyMap.get(node.id) ?? `dry-${node.id}`);
      stats.navLinksCreated += 1;
    } else {
      const [existing] = await db.select({ id: navLinks.id }).from(navLinks).where(eq(navLinks.legacyId, node.id)).limit(1);
      const rowId = existing?.id ?? legacyMap.get(node.id) ?? randomUUID();
      legacyMap.set(node.id, rowId);
      const values = {
        location,
        label: node.title.slice(0, 160),
        href: wpUrlToHref(node.url),
        parentId: parentUuid,
        itemType: "custom_url",
        sortOrder: node.order,
        isActive: true,
        openInNewTab: false,
        legacyId: node.id,
        updatedAt: new Date(),
      };
      if (existing) {
        await db.update(navLinks).set(values).where(eq(navLinks.id, existing.id));
      } else {
        await db.insert(navLinks).values({ id: rowId, ...values });
      }
      stats.navLinksCreated += 1;
    }

    if (node.children?.length) {
      const parentKey = legacyMap.get(node.id) ?? null;
      await insertNavTree(db, location, node.children, options, stats, legacyMap, parentKey);
    }
  }
}

async function insertFallbackNavBranch(
  db: Db,
  location: "header" | "footer",
  items: FallbackNavLink[],
  options: PhaseEOptions,
  stats: PhaseEStats,
  parentId: string | null,
  legacyBase: number,
) {
  let order = 0;
  for (const item of items) {
    const rowId = randomUUID();
    if (!options.dryRun) {
      await db.insert(navLinks).values({
        id: rowId,
        location,
        label: item.label,
        href: item.href,
        parentId,
        itemType: item.itemType ?? "custom_url",
        referenceId: item.referenceId ?? null,
        sortOrder: order,
        legacyId: legacyBase + order,
      });
    }
    stats.navLinksCreated += 1;
    if (item.children?.length) {
      await insertFallbackNavBranch(db, location, item.children, options, stats, options.dryRun ? null : rowId, legacyBase + order * 1000);
    }
    order += 1;
  }
}

async function importFallbackNav(db: Db, options: PhaseEOptions, stats: PhaseEStats) {
  const { header, footer } = await buildFallbackHeaderNav(db);
  await insertFallbackNavBranch(db, "header", header, options, stats, null, 900000);
  await insertFallbackNavBranch(db, "footer", footer, options, stats, null, 920000);
}

async function importNavFromWordPress(db: Db, options: PhaseEOptions, stats: PhaseEStats) {
  const menus = await fetchWordPressMenus();
  if (!menus.length) {
    console.log("WordPress menus API unavailable — building nav from CMS categories and static links.");
    await importFallbackNav(db, options, stats);
    return;
  }

  const selected = pickWordPressMenusForImport(menus);
  if (selected.length < menus.length) {
    console.log(`Using ${selected.length} WordPress menu(s); skipped ${menus.length - selected.length} duplicate/extra menus.`);
  }

  for (const menu of selected) {
    const location = menuLocationToNavLocation(menu.slug, menu.locations);
    if (location === "products") continue;
    const legacyMap = new Map<number, string>();
    const roots = wordPressMenuRoots(menu.items);
    await insertNavTree(db, location, roots, options, stats, legacyMap, null);
  }
}

export async function runWordPressPhaseE(db: Db, options: PhaseEOptions): Promise<PhaseEStats> {
  const stats: PhaseEStats = {
    galleryCreated: 0,
    certificatesCreated: 0,
    certificatesUpdated: 0,
    navLinksCreated: 0,
    skippedImages: 0,
    mediaImported: 0,
  };

  const importGallery = options.scope === "all" || options.scope === "gallery";
  const importCertificates = options.scope === "all" || options.scope === "certificates";
  const importNav = options.scope === "all" || options.scope === "nav";

  if (!options.dryRun && options.purgeDummy) {
    if (importGallery || importCertificates) {
      const purged = await purgeSeedGalleryAndCertificates(db);
      console.log(`Cleared gallery (${purged.gallery}) and ${purged.certificates} seed certificates.`);
    }
    if (importNav) {
      await purgeImportedNavLocations(db, ["header", "footer"]);
      console.log("Cleared existing header and footer navigation before import.");
    }
  }

  const lookup = await loadMediaLookup(db);

  if (importGallery || importCertificates) {
    const pages = await listAllPublishedPages(options.limit, options.pageStart);
    if (importGallery) {
      const galleryPage = await findWpPageByPath(pages, "gallery");
      if (galleryPage) {
        await importImagesFromPage(
          db,
          "gallery",
          galleryPage.id,
          wpPageContentHtml(galleryPage),
          lookup,
          options,
          stats,
          "gallery",
        );
      } else {
        console.warn("No published WordPress page at path gallery.");
      }
    }
    if (importCertificates) {
      const certPage = await findWpPageByPath(pages, "certificates");
      if (certPage) {
        await importImagesFromPage(
          db,
          "certificates",
          certPage.id,
          wpPageContentHtml(certPage),
          lookup,
          options,
          stats,
          "certificates",
        );
      } else {
        console.warn("No published WordPress page at path certificates.");
      }
    }
  }

  if (importNav) {
    await importNavFromWordPress(db, options, stats);
  }

  if (!options.dryRun) {
    revalidatePublicSite(["gallery", "certificates"]);
  }

  return stats;
}
