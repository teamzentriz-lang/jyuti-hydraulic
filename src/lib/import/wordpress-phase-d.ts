import { randomUUID } from "crypto";
import { asc, eq, inArray, isNull } from "drizzle-orm";
import type { getDb } from "@/db";
import { exportPages, locationPages, productCategories, products, routes } from "@/db/schema";
import { reserveRoute } from "@/lib/cms/routes";
import { revalidatePublicSite } from "@/lib/cms/revalidate-public";
import {
  citySlugFromPath,
  exportSlugFromPath,
  filterCityPages,
  filterExportPages,
  matchCatalogId,
  parseExportCountry,
  parseExportProductLine,
  parseLocationName,
  parseRegion,
  productHintFromGeoSlug,
  type CatalogMatch,
  type GeoPage,
} from "@/lib/import/wordpress-geo";
import {
  htmlToPlainSummary,
  processWordPressHtml,
  type MediaLookup,
} from "@/lib/import/wordpress-html";
import { loadMediaLookup } from "@/lib/import/wordpress-media";
import {
  fetchSeoFromPublicHtml,
  listAllPublishedPages,
  wpOrigin,
  wpPageContentHtml,
  wpPageTitle,
  type ImportCliOptions,
} from "@/lib/import/wordpress-client";

type Db = ReturnType<typeof getDb>;

const IMPORT_CONCURRENCY = 6;

async function importInParallel<T>(
  items: T[],
  label: string,
  importOne: (item: T) => Promise<void>,
) {
  let next = 0;
  let completed = 0;

  await Promise.all(
    Array.from({ length: Math.min(IMPORT_CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const item = items[next++];
        await importOne(item);
        completed += 1;
        if (completed % 25 === 0 || completed === items.length) {
          console.log(`${label}: ${completed}/${items.length}.`);
        }
      }
    }),
  );
}

export type PhaseDScope = "all" | "city" | "exports";

export type PhaseDOptions = ImportCliOptions & {
  scope: PhaseDScope;
};

export type PhaseDStats = {
  locationsCreated: number;
  locationsUpdated: number;
  exportsCreated: number;
  exportsUpdated: number;
  skipped: number;
};

export function parsePhaseDCliOptions(argv: string[]): PhaseDOptions {
  const scope: PhaseDScope = argv.includes("--exports-only")
    ? "exports"
    : argv.includes("--city-only")
      ? "city"
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

function publicLegacyUrl(link: string) {
  const legacyUrl = link.startsWith("http") ? link : `${wpOrigin()}/${link.replace(/^\//, "")}`;
  return legacyUrl.endsWith("/") ? legacyUrl : `${legacyUrl}/`;
}

export async function purgeSeedGeoContent(db: Db) {
  const locationIds = await db
    .select({ id: locationPages.id })
    .from(locationPages)
    .where(isNull(locationPages.legacyId))
    .then((rows) => rows.map((row) => row.id));

  const exportIds = await db
    .select({ id: exportPages.id })
    .from(exportPages)
    .where(isNull(exportPages.legacyId))
    .then((rows) => rows.map((row) => row.id));

  if (locationIds.length) {
    await db.delete(locationPages).where(inArray(locationPages.id, locationIds));
  }
  if (exportIds.length) {
    await db.delete(exportPages).where(inArray(exportPages.id, exportIds));
  }

  const removedEntityIds = [...locationIds, ...exportIds];
  if (removedEntityIds.length) {
    await db.delete(routes).where(inArray(routes.entityId, removedEntityIds));
  }

  return { locations: locationIds.length, exports: exportIds.length };
}

async function loadCatalogMatchers(db: Db) {
  const [productRows, categoryRows] = await Promise.all([
    db
      .select({ id: products.id, path: products.path, slug: products.slug })
      .from(products)
      .orderBy(asc(products.path)),
    db
      .select({ id: productCategories.id, path: productCategories.path, slug: productCategories.slug })
      .from(productCategories)
      .orderBy(asc(productCategories.path)),
  ]);

  const byPathLength = (a: CatalogMatch, b: CatalogMatch) => b.path.length - a.path.length;
  return {
    products: [...productRows].sort(byPathLength),
    categories: [...categoryRows].sort(byPathLength),
  };
}

async function upsertLocation(
  db: Db,
  page: GeoPage,
  lookup: MediaLookup,
  matchers: { products: CatalogMatch[]; categories: CatalogMatch[] },
  options: PhaseDOptions,
  stats: PhaseDStats,
) {
  const rawHtml = wpPageContentHtml(page);
  const body = processWordPressHtml(rawHtml, lookup);
  const title = wpPageTitle(page);
  const slug = citySlugFromPath(page.path);
  const locationName = parseLocationName(title, slug);
  const region = parseRegion(locationName);
  const legacyUrl = publicLegacyUrl(page.link);
  const hint = productHintFromGeoSlug(slug);
  const productId = matchCatalogId(hint, matchers.products);
  const categoryId = productId ? null : matchCatalogId(hint, matchers.categories);

  let seoTitle: string | null = title;
  let seoDescription: string | null = htmlToPlainSummary(body, 500) || null;
  if (!options.skipSeo && !options.dryRun) {
    const seo = await fetchSeoFromPublicHtml(legacyUrl);
    if (seo.seoTitle) seoTitle = seo.seoTitle;
    if (seo.seoDescription) seoDescription = seo.seoDescription;
  }

  const [existing] = await db
    .select({ id: locationPages.id })
    .from(locationPages)
    .where(eq(locationPages.legacyId, page.id))
    .limit(1);

  if (options.dryRun) {
    if (existing) stats.locationsUpdated += 1;
    else stats.locationsCreated += 1;
    return;
  }

  const id = existing?.id ?? randomUUID();
  const values = {
    title,
    slug,
    path: page.path,
    locationName,
    region,
    categoryId,
    productId,
    body,
    seoTitle,
    seoDescription,
    status: "published" as const,
    legacyId: page.id,
    legacyUrl,
    updatedAt: new Date(),
  };

  await db.transaction(async (tx) => {
    if (existing) {
      await tx.update(locationPages).set(values).where(eq(locationPages.id, id));
      stats.locationsUpdated += 1;
    } else {
      await tx.insert(locationPages).values({ id, ...values });
      stats.locationsCreated += 1;
    }
    await reserveRoute(tx, {
      path: page.path,
      kind: "location",
      entityId: id,
      status: "published",
    });
  });
}

async function upsertExport(
  db: Db,
  page: GeoPage,
  lookup: MediaLookup,
  matchers: { products: CatalogMatch[]; categories: CatalogMatch[] },
  options: PhaseDOptions,
  stats: PhaseDStats,
) {
  const rawHtml = wpPageContentHtml(page);
  const body = processWordPressHtml(rawHtml, lookup);
  const title = wpPageTitle(page);
  const slug = exportSlugFromPath(page.path);
  const country = parseExportCountry(title, slug);
  const productLine = parseExportProductLine(title, slug);
  const legacyUrl = publicLegacyUrl(page.link);
  const hint = productHintFromGeoSlug(slug);
  const productId = matchCatalogId(hint, matchers.products);
  const categoryId = productId ? null : matchCatalogId(hint, matchers.categories);

  let seoTitle: string | null = title;
  let seoDescription: string | null = htmlToPlainSummary(body, 500) || null;
  if (!options.skipSeo && !options.dryRun) {
    const seo = await fetchSeoFromPublicHtml(legacyUrl);
    if (seo.seoTitle) seoTitle = seo.seoTitle;
    if (seo.seoDescription) seoDescription = seo.seoDescription;
  }

  const [existing] = await db
    .select({ id: exportPages.id })
    .from(exportPages)
    .where(eq(exportPages.legacyId, page.id))
    .limit(1);

  if (options.dryRun) {
    if (existing) stats.exportsUpdated += 1;
    else stats.exportsCreated += 1;
    return;
  }

  const id = existing?.id ?? randomUUID();
  const values = {
    title,
    slug,
    path: page.path,
    country,
    productLine,
    categoryId,
    productId,
    body,
    seoTitle,
    seoDescription,
    status: "published" as const,
    legacyId: page.id,
    legacyUrl,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(exportPages).set(values).where(eq(exportPages.id, id));
    stats.exportsUpdated += 1;
  } else {
    await db.insert(exportPages).values({ id, ...values });
    stats.exportsCreated += 1;
  }

  await db.transaction(async (tx) => {
    await reserveRoute(tx, {
      path: page.path,
      kind: "export",
      entityId: id,
      status: "published",
    });
  });
}

export async function runWordPressPhaseD(db: Db, options: PhaseDOptions): Promise<PhaseDStats> {
  const stats: PhaseDStats = {
    locationsCreated: 0,
    locationsUpdated: 0,
    exportsCreated: 0,
    exportsUpdated: 0,
    skipped: 0,
  };

  console.log(`Fetching published pages from ${wpOrigin()}…`);
  const allPages = await listAllPublishedPages(options.limit, options.pageStart);

  let cityPages = filterCityPages(allPages);
  let exportPagesList = filterExportPages(allPages);

  if (options.limit) {
    if (options.scope === "city" || options.scope === "all") {
      cityPages = cityPages.slice(0, options.limit);
    } else {
      cityPages = [];
    }
    if (options.scope === "exports" || options.scope === "all") {
      exportPagesList = exportPagesList.slice(0, options.limit);
    } else {
      exportPagesList = [];
    }
  } else if (options.scope === "city") {
    exportPagesList = [];
  } else if (options.scope === "exports") {
    cityPages = [];
  }

  console.log(`City pages: ${cityPages.length}. Export pages: ${exportPagesList.length}.`);

  if (!options.dryRun && options.purgeDummy) {
    const purged = await purgeSeedGeoContent(db);
    console.log(`Removed dummy geo content: ${purged.locations} locations, ${purged.exports} exports.`);
  }

  const lookup = await loadMediaLookup(db);
  const matchers = await loadCatalogMatchers(db);

  await importInParallel(cityPages, "Imported city pages", async (page) => {
    try {
      await upsertLocation(db, page, lookup, matchers, options, stats);
    } catch (error) {
      console.warn(`Skipped city page ${page.path}:`, error instanceof Error ? error.message : error);
      stats.skipped += 1;
    }
  });

  await importInParallel(exportPagesList, "Imported export pages", async (page) => {
    try {
      await upsertExport(db, page, lookup, matchers, options, stats);
    } catch (error) {
      console.warn(`Skipped export page ${page.path}:`, error instanceof Error ? error.message : error);
      stats.skipped += 1;
    }
  });

  if (!options.dryRun) {
    const paths = [...cityPages.map((page) => page.path), ...exportPagesList.map((page) => page.path)];
    if (paths.length > 200) {
      revalidatePublicSite();
      console.log("Revalidated site layout (skipped per-path revalidation for large import).");
    } else {
      revalidatePublicSite(paths);
    }
  }

  return stats;
}
