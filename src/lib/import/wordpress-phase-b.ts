import { randomUUID } from "crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { getDb } from "@/db";
import {
  productCategories,
  productImages,
  productRelations,
  products,
  routes,
} from "@/db/schema";
import {
  categoryRelatedCategories,
  contentFaqs,
  contentTables,
  pageSections,
  productApplications,
  productDocuments,
  productFeatures,
  productOptions,
  productSpecifications,
  productTechnicalTables,
} from "@/db/schema-cms";
import { reserveRoute } from "@/lib/cms/routes";
import { revalidatePublicSite } from "@/lib/cms/revalidate-public";
import {
  buildCatalogGraph,
  resolveProductCategoryIds,
  slugFromPath,
  sortCategoriesForInsert,
  type CatalogPage,
} from "@/lib/import/wordpress-catalog";
import {
  collectImageUrls,
  extractSpecsFromHtml,
  htmlToPlainSummary,
  processWordPressHtml,
  resolveMediaIdFromUrl,
  type MediaLookup,
} from "@/lib/import/wordpress-html";
import {
  createFeaturedMediaResolver,
  loadMediaLookup,
} from "@/lib/import/wordpress-media";
import {
  fetchSeoFromPublicHtml,
  listAllPublishedPages,
  wpOrigin,
  wpPageContentHtml,
  wpPageTitle,
  type ImportCliOptions,
  type WpPageItem,
} from "@/lib/import/wordpress-client";

type Db = ReturnType<typeof getDb>;

export type PhaseBOptions = ImportCliOptions & {
  /** When true, rows already in Postgres (by WordPress legacy_id or path) are not updated. */
  skipExisting: boolean;
};

export type PhaseBStats = {
  categoriesCreated: number;
  categoriesUpdated: number;
  categoriesSkipped: number;
  productsCreated: number;
  productsUpdated: number;
  productsSkipped: number;
  skipped: number;
};

export function parsePhaseBCliOptions(argv: string[]): PhaseBOptions {
  const base = {
    dryRun: argv.includes("--dry-run"),
    skipSeo: argv.includes("--skip-seo"),
    skipMedia: argv.includes("--skip-media"),
    purgeDummy: !argv.includes("--keep-seed"),
    limit: (() => {
      const limitArg = argv.find((arg) => arg.startsWith("--limit="));
      const limitValue = limitArg ? Number(limitArg.slice("--limit=".length)) : null;
      return limitValue && Number.isFinite(limitValue) && limitValue > 0 ? limitValue : null;
    })(),
    pageStart: (() => {
      const pageStartArg = argv.find((arg) => arg.startsWith("--page-start="));
      const pageStartValue = pageStartArg ? Number(pageStartArg.slice("--page-start=".length)) : 1;
      return Number.isInteger(pageStartValue) && pageStartValue > 0 ? pageStartValue : 1;
    })(),
  };
  const skipExisting = argv.includes("--skip-existing") || argv.includes("--incremental");
  return {
    ...base,
    skipExisting,
    purgeDummy: skipExisting ? false : base.purgeDummy,
  };
}

async function findExistingCategoryId(db: Db, page: CatalogPage) {
  const [byLegacy] = await db
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(eq(productCategories.legacyId, page.id))
    .limit(1);
  if (byLegacy) return byLegacy.id;
  const [byPath] = await db
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(eq(productCategories.path, page.path))
    .limit(1);
  return byPath?.id ?? null;
}

async function findExistingProductId(db: Db, page: CatalogPage) {
  const [byLegacy] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.legacyId, page.id))
    .limit(1);
  if (byLegacy) return byLegacy.id;
  const [byPath] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.path, page.path))
    .limit(1);
  return byPath?.id ?? null;
}

async function preloadCategoryMaps(db: Db) {
  const rows = await db
    .select({
      id: productCategories.id,
      legacyId: productCategories.legacyId,
      path: productCategories.path,
    })
    .from(productCategories);
  const categoryUuidByWpId = new Map<number, string>();
  const categoryIdByPath = new Map<string, string>();
  for (const row of rows) {
    categoryIdByPath.set(row.path, row.id);
    if (row.legacyId != null) categoryUuidByWpId.set(row.legacyId, row.id);
  }
  return { categoryUuidByWpId, categoryIdByPath };
}

async function galleryMediaIds(html: string, featuredId: string | null, lookup: MediaLookup) {
  const ordered: string[] = [];
  const seen = new Set<string>();
  if (featuredId) {
    ordered.push(featuredId);
    seen.add(featuredId);
  }
  for (const url of collectImageUrls(html)) {
    const id = resolveMediaIdFromUrl(url, lookup);
    if (id && !seen.has(id)) {
      seen.add(id);
      ordered.push(id);
    }
  }
  return ordered;
}

export async function purgeSeedCatalog(db: Db) {
  const productIds = await db
    .select({ id: products.id })
    .from(products)
    .where(isNull(products.legacyId))
    .then((rows) => rows.map((row) => row.id));

  if (productIds.length) {
    await db.delete(productImages).where(inArray(productImages.productId, productIds));
    await db.delete(productRelations).where(inArray(productRelations.productId, productIds));
    await db.delete(pageSections).where(inArray(pageSections.productId, productIds));
    await db.delete(productSpecifications).where(inArray(productSpecifications.productId, productIds));
    await db.delete(productFeatures).where(inArray(productFeatures.productId, productIds));
    await db.delete(productApplications).where(inArray(productApplications.productId, productIds));
    await db.delete(productDocuments).where(inArray(productDocuments.productId, productIds));
    await db.delete(productOptions).where(inArray(productOptions.productId, productIds));
    await db.delete(productTechnicalTables).where(inArray(productTechnicalTables.productId, productIds));
    await db.delete(contentFaqs).where(and(eq(contentFaqs.entityKind, "product"), inArray(contentFaqs.entityId, productIds)));
    await db.delete(contentTables).where(and(eq(contentTables.entityKind, "product"), inArray(contentTables.entityId, productIds)));
    await db.delete(products).where(inArray(products.id, productIds));
  }

  await db.update(productCategories).set({ parentId: null }).where(isNull(productCategories.legacyId));
  const categoryIds = await db
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(isNull(productCategories.legacyId))
    .then((rows) => rows.map((row) => row.id));

  if (categoryIds.length) {
    await db.delete(categoryRelatedCategories).where(inArray(categoryRelatedCategories.categoryId, categoryIds));
    await db.delete(pageSections).where(inArray(pageSections.categoryId, categoryIds));
    await db.delete(contentFaqs).where(and(eq(contentFaqs.entityKind, "category"), inArray(contentFaqs.entityId, categoryIds)));
    await db.delete(contentTables).where(and(eq(contentTables.entityKind, "category"), inArray(contentTables.entityId, categoryIds)));
    await db.delete(productCategories).where(inArray(productCategories.id, categoryIds));
  }

  const removedEntityIds = [...productIds, ...categoryIds];
  if (removedEntityIds.length) {
    await db.delete(routes).where(inArray(routes.entityId, removedEntityIds));
  }

  return { products: productIds.length, categories: categoryIds.length };
}

async function upsertCategory(
  db: Db,
  page: CatalogPage,
  parentUuid: string | null,
  lookup: MediaLookup,
  mediaIdFromFeatured: ReturnType<typeof createFeaturedMediaResolver>,
  options: PhaseBOptions,
  stats: PhaseBStats,
) {
  if (options.skipExisting) {
    const existingId = await findExistingCategoryId(db, page);
    if (existingId) {
      stats.categoriesSkipped += 1;
      return existingId;
    }
  }

  const rawHtml = wpPageContentHtml(page);
  const body = processWordPressHtml(rawHtml, lookup);
  const summary = htmlToPlainSummary(body, 2000);
  const title = wpPageTitle(page);
  const slug = slugFromPath(page.path);
  const legacyUrl = page.link.startsWith("http") ? page.link : `${wpOrigin()}/${page.link.replace(/^\//, "")}`;

  let seoTitle: string | null = title;
  let seoDescription: string | null = summary.slice(0, 500) || null;
  if (!options.skipSeo && !options.dryRun) {
    const seo = await fetchSeoFromPublicHtml(legacyUrl.replace(/\/$/, "") + "/");
    if (seo.seoTitle) seoTitle = seo.seoTitle;
    if (seo.seoDescription) seoDescription = seo.seoDescription;
  }

  const featuredImageId = options.dryRun
    ? null
    : await mediaIdFromFeatured(page.featured_media, lookup);

  const [existing] = await db
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(eq(productCategories.legacyId, page.id))
    .limit(1);

  if (options.dryRun) {
    if (existing) stats.categoriesUpdated += 1;
    else stats.categoriesCreated += 1;
    return existing?.id ?? `dry-${page.id}`;
  }

  const id = existing?.id ?? randomUUID();
  const values = {
    title,
    slug,
    path: page.path,
    parentId: parentUuid,
    summary,
    body,
    imageId: featuredImageId,
    thumbnailId: featuredImageId,
    sortOrder: page.id,
    seoTitle,
    seoDescription,
    canonicalUrl: legacyUrl.endsWith("/") ? legacyUrl : `${legacyUrl}/`,
    status: "published" as const,
    legacyId: page.id,
    legacySlug: page.slug,
    legacyUrl,
    legacyType: "page",
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(productCategories).set(values).where(eq(productCategories.id, id));
    stats.categoriesUpdated += 1;
  } else {
    await db.insert(productCategories).values({ id, ...values });
    stats.categoriesCreated += 1;
  }

  await db.transaction(async (tx) => {
    await reserveRoute(tx, {
      path: page.path,
      kind: "category",
      entityId: id,
      status: "published",
    });
  });

  return id;
}

async function upsertProduct(
  db: Db,
  page: CatalogPage,
  parentCategoryId: string | null,
  categoryIdByPath: Map<string, string>,
  lookup: MediaLookup,
  mediaIdFromFeatured: ReturnType<typeof createFeaturedMediaResolver>,
  options: PhaseBOptions,
  stats: PhaseBStats,
) {
  if (options.skipExisting) {
    const existingId = await findExistingProductId(db, page);
    if (existingId) {
      stats.productsSkipped += 1;
      return;
    }
  }

  const rawHtml = wpPageContentHtml(page);
  const body = processWordPressHtml(rawHtml, lookup);
  const summary = htmlToPlainSummary(body, 2000);
  const specs = extractSpecsFromHtml(rawHtml);
  const title = wpPageTitle(page);
  const slug = slugFromPath(page.path);
  const legacyUrl = page.link.startsWith("http") ? page.link : `${wpOrigin()}/${page.link.replace(/^\//, "")}`;
  const { categoryId, subCategoryId } = resolveProductCategoryIds({
    path: page.path,
    parentCategoryId,
    categoryIdByPath,
  });

  let seoTitle: string | null = title;
  let seoDescription: string | null = summary.slice(0, 500) || null;
  if (!options.skipSeo && !options.dryRun) {
    const seo = await fetchSeoFromPublicHtml(legacyUrl.replace(/\/$/, "") + "/");
    if (seo.seoTitle) seoTitle = seo.seoTitle;
    if (seo.seoDescription) seoDescription = seo.seoDescription;
  }

  const featuredImageId = options.dryRun ? null : await mediaIdFromFeatured(page.featured_media, lookup);
  const galleryIds = options.dryRun ? [] : await galleryMediaIds(rawHtml, featuredImageId, lookup);

  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.legacyId, page.id))
    .limit(1);

  if (options.dryRun) {
    if (existing) stats.productsUpdated += 1;
    else stats.productsCreated += 1;
    return;
  }

  const id = existing?.id ?? randomUUID();
  const values = {
    title,
    slug,
    path: page.path,
    categoryId,
    subCategoryId,
    summary,
    body,
    richContent: body,
    overview: body,
    specs,
    featuredImageId,
    thumbnailId: featuredImageId,
    sortOrder: page.id,
    seoTitle,
    seoDescription,
    canonicalUrl: legacyUrl.endsWith("/") ? legacyUrl : `${legacyUrl}/`,
    status: "published" as const,
    legacyId: page.id,
    legacySlug: page.slug,
    legacyUrl,
    legacyType: "page",
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(products).set(values).where(eq(products.id, id));
    stats.productsUpdated += 1;
  } else {
    await db.insert(products).values({ id, ...values });
    stats.productsCreated += 1;
  }

  await db.delete(productImages).where(eq(productImages.productId, id));
  if (galleryIds.length) {
    await db.insert(productImages).values(
      galleryIds.map((mediaId, sortOrder) => ({
        productId: id,
        mediaId,
        sortOrder,
      })),
    );
  }

  await db.transaction(async (tx) => {
    await reserveRoute(tx, {
      path: page.path,
      kind: "product",
      entityId: id,
      status: "published",
    });
  });
}

export async function runWordPressPhaseB(db: Db, options: PhaseBOptions): Promise<PhaseBStats> {
  const stats: PhaseBStats = {
    categoriesCreated: 0,
    categoriesUpdated: 0,
    categoriesSkipped: 0,
    productsCreated: 0,
    productsUpdated: 0,
    productsSkipped: 0,
    skipped: 0,
  };

  console.log(`Fetching published pages from ${wpOrigin()}…`);
  const allPages = await listAllPublishedPages(options.limit);
  const catalog = buildCatalogGraph(allPages);
  const categories = sortCategoriesForInsert(catalog.filter((page) => !page.isLeaf));
  const productsPages = catalog.filter((page) => page.isLeaf);

  console.log(
    `Catalogue: ${catalog.length} pages (${categories.length} categories, ${productsPages.length} products).`,
  );

  if (options.skipExisting) {
    console.log("Incremental mode — skipping catalogue rows already in the database (legacy_id or path).");
  }

  if (!options.dryRun && options.purgeDummy) {
    const purged = await purgeSeedCatalog(db);
    console.log(`Removed dummy catalogue rows: ${purged.products} products, ${purged.categories} categories.`);
  }

  const lookup = await loadMediaLookup(db);
  const mediaIdFromFeatured = createFeaturedMediaResolver();
  const preloaded = await preloadCategoryMaps(db);
  const categoryUuidByWpId = preloaded.categoryUuidByWpId;
  const categoryIdByPath = preloaded.categoryIdByPath;

  for (const page of categories) {
    let parentUuid: string | null = null;
    const wpParent = page.parent;
    if (wpParent > 0 && categoryUuidByWpId.has(wpParent)) {
      parentUuid = categoryUuidByWpId.get(wpParent) ?? null;
    }
    const id = await upsertCategory(db, page, parentUuid, lookup, mediaIdFromFeatured, options, stats);
    categoryUuidByWpId.set(page.id, id);
    categoryIdByPath.set(page.path, id);
  }

  for (const page of productsPages) {
    const wpParent = page.parent;
    let parentCategoryId: string | null = null;
    if (wpParent > 0) {
      parentCategoryId = categoryUuidByWpId.get(wpParent) ?? null;
      if (!parentCategoryId) {
        console.warn(`Skipping product ${page.path}: parent WP page ${wpParent} is not a category.`);
        stats.skipped += 1;
        continue;
      }
    } else {
      console.warn(`Skipping product ${page.path}: no parent category in WordPress.`);
      stats.skipped += 1;
      continue;
    }

    await upsertProduct(db, page, parentCategoryId, categoryIdByPath, lookup, mediaIdFromFeatured, options, stats);
  }

  if (!options.dryRun) {
    revalidatePublicSite(catalog.map((page) => page.path));
  }

  return stats;
}

/** @internal exported for tests */
export function classifyCatalogForTest(pages: WpPageItem[]) {
  return buildCatalogGraph(pages);
}
