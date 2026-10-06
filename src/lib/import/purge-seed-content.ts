import { and, eq, inArray, isNull } from "drizzle-orm";
import type { getDb } from "@/db";
import {
  certificates,
  galleryItems,
  homeContent,
  homeFeaturedProducts,
  homeHeroImages,
  media,
  navLinks,
  pages,
  posts,
  productCategories,
  productImages,
  productRelations,
  products,
  routes,
  siteSettings,
  headerSettings,
  footerSettings,
} from "@/db/schema";
import {
  catalogues,
  categoryRelatedCategories,
  contentFaqs,
  contentTables,
  galleryImages,
  pageSections,
  postTags,
  productApplications,
  productDocuments,
  productFeatures,
  productOptions,
  productSpecifications,
  productTechnicalTables,
} from "@/db/schema-cms";
import { isPlaceholderMedia } from "@/lib/media-url";

type Db = ReturnType<typeof getDb>;

async function idsWithoutLegacy<T extends { id: string }>(db: Db, table: { id: typeof products.id; legacyId: typeof products.legacyId }, legacyColumn = "legacyId") {
  const rows = await db.select({ id: table.id }).from(table as typeof products).where(isNull(table.legacyId));
  return rows.map((row) => row.id);
}

export async function purgeSeedContent(db: Db) {
  const productIds = await db.select({ id: products.id }).from(products).where(isNull(products.legacyId)).then((r) => r.map((x) => x.id));
  const pageIds = await db.select({ id: pages.id }).from(pages).where(isNull(pages.legacyId)).then((r) => r.map((x) => x.id));
  const postIds = await db.select({ id: posts.id }).from(posts).where(isNull(posts.legacyId)).then((r) => r.map((x) => x.id));

  await db.delete(homeHeroImages);
  await db.delete(homeFeaturedProducts);
  await db.update(homeContent).set({ aboutMediaId: null, updatedAt: new Date() }).where(eq(homeContent.id, "default"));

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
    .then((r) => r.map((x) => x.id));
  if (categoryIds.length) {
    await db.delete(categoryRelatedCategories).where(inArray(categoryRelatedCategories.categoryId, categoryIds));
    await db.delete(pageSections).where(inArray(pageSections.categoryId, categoryIds));
    await db.delete(contentFaqs).where(and(eq(contentFaqs.entityKind, "category"), inArray(contentFaqs.entityId, categoryIds)));
    await db.delete(contentTables).where(and(eq(contentTables.entityKind, "category"), inArray(contentTables.entityId, categoryIds)));
    await db.delete(productCategories).where(inArray(productCategories.id, categoryIds));
  }

  if (pageIds.length) {
    await db.delete(pageSections).where(inArray(pageSections.pageId, pageIds));
    await db.delete(contentFaqs).where(and(eq(contentFaqs.entityKind, "page"), inArray(contentFaqs.entityId, pageIds)));
    await db.delete(contentTables).where(and(eq(contentTables.entityKind, "page"), inArray(contentTables.entityId, pageIds)));
    await db.delete(pages).where(inArray(pages.id, pageIds));
  }

  if (postIds.length) {
    await db.delete(postTags).where(inArray(postTags.postId, postIds));
    await db.delete(contentFaqs).where(and(eq(contentFaqs.entityKind, "post"), inArray(contentFaqs.entityId, postIds)));
    await db.delete(contentTables).where(and(eq(contentTables.entityKind, "post"), inArray(contentTables.entityId, postIds)));
    await db.delete(posts).where(inArray(posts.id, postIds));
  }

  await db.delete(galleryItems);
  await db.delete(certificates);
  await db.delete(galleryImages);
  await db.delete(catalogues);
  await db.delete(navLinks).where(isNull(navLinks.legacyId));

  const removedEntityIds = [...productIds, ...pageIds, ...categoryIds, ...postIds];
  if (removedEntityIds.length) {
    await db.delete(routes).where(inArray(routes.entityId, removedEntityIds));
  }

  const seedMediaRows = await db
    .select({ id: media.id, url: media.url, legacyUrl: media.legacyUrl })
    .from(media)
    .where(isNull(media.legacyUrl));
  const seedMediaIds = seedMediaRows.filter((row) => isPlaceholderMedia(row)).map((row) => row.id);
  const allSeedMediaIds = seedMediaRows.map((row) => row.id);

  if (allSeedMediaIds.length) {
    const [settings] = await db.select().from(siteSettings).where(eq(siteSettings.id, "default")).limit(1);
    const clearLogo = settings?.logoId && allSeedMediaIds.includes(settings.logoId);
    const clearFavicon = settings?.faviconId && allSeedMediaIds.includes(settings.faviconId);
    const clearCatalogue = settings?.catalogueId && allSeedMediaIds.includes(settings.catalogueId);
    if (clearLogo || clearFavicon || clearCatalogue) {
      await db
        .update(siteSettings)
        .set({
          ...(clearLogo ? { logoId: null } : {}),
          ...(clearFavicon ? { faviconId: null } : {}),
          ...(clearCatalogue ? { catalogueId: null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(siteSettings.id, "default"));
    }
    await db.update(headerSettings).set({ logoId: null, updatedAt: new Date() }).where(eq(headerSettings.id, "default"));
    await db.update(footerSettings).set({ logoId: null, updatedAt: new Date() }).where(eq(footerSettings.id, "default"));
    await db.delete(media).where(inArray(media.id, allSeedMediaIds));
  }

  return {
    products: productIds.length,
    categories: categoryIds.length,
    pages: pageIds.length,
    posts: postIds.length,
    media: allSeedMediaIds.length,
    placeholderMedia: seedMediaIds.length,
  };
}
