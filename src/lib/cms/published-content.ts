import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { classifyDatabaseError } from "@/db/errors";
import {
  exportPages,
  locationPages,
  media,
  pages,
  posts,
  productCategories,
  productCategoryAssignments,
  productImages,
  products,
  routes,
  type SpecRow,
} from "@/db/schema";
import {
  loadContentFaqs,
  loadPageSections,
  loadProductPayload,
  type PageSectionPayload,
} from "@/lib/cms/entity-data";
import { mediaItems, type MediaItem } from "@/lib/cms/queries";
import { mediaDeliveryUrl } from "@/lib/media-url";
import {
  normalizeLocationBody,
  normalizeSeoDescription,
  removeLegacyBlogEmbed,
} from "@/lib/cms/product-article";
import { removeLegacyProductListing } from "@/lib/cms/legacy-product-listing";
import type { RouteKind } from "@/lib/paths";

type Db = ReturnType<typeof getDb>;

export type RenderedPageSection = PageSectionPayload & {
  image: MediaItem | null;
  backgroundImage: MediaItem | null;
  mobileImage: MediaItem | null;
};

export type DetailBlock = { heading: string; html: string };

export type PublishedFeature = {
  title: string;
  description: string;
  icon: MediaItem | null;
  image: MediaItem | null;
};

export type PublishedApplication = {
  title: string;
  description: string;
  image: MediaItem | null;
};

export type PublishedFaq = { question: string; answer: string };

export type PublishedContentTable = {
  title: string;
  headers: string[];
  rows: string[][];
  caption: string;
};

export type PublishedTechnicalTable = {
  tableTitle: string;
  columns: string[];
  rows: string[][];
};

export type PublishedDocument = {
  title: string;
  url: string | null;
  documentType: string;
  description: string;
};

export type PublishedContent = {
  kind: RouteKind;
  path: string;
  title: string;
  subtitle?: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  focusKeyword?: string | null;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: MediaItem | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImage?: MediaItem | null;
  body: string;
  summary?: string;
  brand?: string | null;
  modelNumber?: string | null;
  stock?: string | null;
  rating?: number | null;
  shippingArea?: string | null;
  hero?: MediaItem | null;
  cover?: MediaItem | null;
  image?: MediaItem | null;
  specs?: SpecRow[];
  gallery?: MediaItem[];
  related?: {
    id: string;
    title: string;
    path: string;
    summary: string;
    imageUrl: string | null;
    imageAlt: string;
  }[];
  brochureUrl?: string | null;
  enquiryEnabled?: boolean;
  filterCategories?: { id: string; title: string; path: string }[];
  childCategories?: {
    id: string;
    title: string;
    path: string;
    summary: string;
    image: MediaItem | null;
    fallbackImageUrl?: string | null;
    fallbackImageAlt?: string;
  }[];
  categoryProducts?: {
    id: string;
    title: string;
    path: string;
    summary: string;
    imageUrl: string | null;
    imageAlt: string;
  }[];
  meta?: Record<string, string>;
  sections?: RenderedPageSection[];
  detailBlocks?: DetailBlock[];
  features?: PublishedFeature[];
  applications?: PublishedApplication[];
  faqs?: PublishedFaq[];
  contentTables?: PublishedContentTable[];
  technicalTables?: PublishedTechnicalTable[];
  documents?: PublishedDocument[];
  relatedPostIds?: string[];
  parent?: { title: string; path: string } | null;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
};

type PublishedTarget = { kind: RouteKind; entityId: string };

async function optionalMedia(id: string | null) {
  return id ? ((await mediaItems([id]))[0] ?? null) : null;
}

export async function findPublishedTarget(
  db: Db,
  path: string,
): Promise<PublishedTarget | null> {
  let route: typeof routes.$inferSelect | undefined;
  try {
    [route] = await db
      .select()
      .from(routes)
      .where(eq(routes.path, path))
      .limit(1);
  } catch (error) {
    // The routes table is additive; fall back to the source tables on older
    // production databases instead of turning every public page into a 500.
    if (classifyDatabaseError(error).reason !== "schema") throw error;
  }
  if (route?.status === "published") {
    return { kind: route.kind as RouteKind, entityId: route.entityId };
  }

  const [page] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.path, path), eq(pages.status, "published")))
    .limit(1);
  if (page) return { kind: "page", entityId: page.id };

  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.path, path), eq(posts.status, "published")))
    .limit(1);
  if (post) return { kind: "post", entityId: post.id };

  const [category] = await db
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(
      and(
        eq(productCategories.path, path),
        eq(productCategories.status, "published"),
      ),
    )
    .limit(1);
  if (category) return { kind: "category", entityId: category.id };

  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.path, path), eq(products.status, "published")))
    .limit(1);
  if (product) return { kind: "product", entityId: product.id };

  const [location] = await db
    .select({ id: locationPages.id })
    .from(locationPages)
    .where(
      and(eq(locationPages.path, path), eq(locationPages.status, "published")),
    )
    .limit(1);
  if (location) return { kind: "location", entityId: location.id };

  const [exportPage] = await db
    .select({ id: exportPages.id })
    .from(exportPages)
    .where(and(eq(exportPages.path, path), eq(exportPages.status, "published")))
    .limit(1);
  if (exportPage) return { kind: "export", entityId: exportPage.id };

  return null;
}

async function hydratePageSections(
  sections: PageSectionPayload[],
): Promise<RenderedPageSection[]> {
  const active = sections.filter((section) => section.isActive);
  const mediaIds = active.flatMap((section) =>
    [section.imageId, section.backgroundImageId, section.mobileImageId].filter(
      (id): id is string => Boolean(id),
    ),
  );
  const items = await mediaItems(mediaIds);
  const byId = new Map(items.map((item) => [item.id, item]));
  return active.map((section) => ({
    ...section,
    image: section.imageId ? (byId.get(section.imageId) ?? null) : null,
    backgroundImage: section.backgroundImageId
      ? (byId.get(section.backgroundImageId) ?? null)
      : null,
    mobileImage: section.mobileImageId
      ? (byId.get(section.mobileImageId) ?? null)
      : null,
  }));
}

function productDetailBlocks(row: typeof products.$inferSelect): DetailBlock[] {
  const pairs: { key: keyof typeof products.$inferSelect; heading: string }[] =
    [
      { key: "overview", heading: "Overview" },
      { key: "richContent", heading: "Details" },
      { key: "featuresText", heading: "Features" },
      { key: "benefits", heading: "Benefits" },
      { key: "advantages", heading: "Advantages" },
      { key: "applicationsText", heading: "Applications" },
      { key: "workingPrinciple", heading: "Working principle" },
      { key: "construction", heading: "Construction" },
      { key: "material", heading: "Material" },
      { key: "manufacturingDetails", heading: "Manufacturing" },
      { key: "qualityInformation", heading: "Quality" },
      { key: "maintenanceInformation", heading: "Maintenance" },
      { key: "safetyInformation", heading: "Safety" },
      { key: "customizationInformation", heading: "Customization" },
    ];
  return pairs.flatMap(({ key, heading }) => {
    const html = row[key];
    return typeof html === "string" && html.trim() ? [{ heading, html }] : [];
  });
}

async function categoryProductCards(db: Db, categoryId: string) {
  const [assignmentTable] = await db.execute<{ tableName: string | null }>(
    sql`select to_regclass('public.product_category_assignments') as "tableName"`,
  );
  const fields = {
    id: products.id,
    title: products.title,
    path: products.path,
    summary: products.summary,
    featuredImageId: products.featuredImageId,
    thumbnailId: products.thumbnailId,
  };
  const productRows = assignmentTable?.tableName
    ? await db
        .selectDistinct(fields)
        .from(products)
        .leftJoin(
          productCategoryAssignments,
          eq(productCategoryAssignments.productId, products.id),
        )
        .where(
          and(
            or(
              eq(products.categoryId, categoryId),
              eq(products.subCategoryId, categoryId),
              eq(productCategoryAssignments.categoryId, categoryId),
            ),
            eq(products.status, "published"),
          ),
        )
        .orderBy(asc(products.sortOrder), asc(products.title))
    : await db
        .select(fields)
        .from(products)
        .where(
          and(
            or(
              eq(products.categoryId, categoryId),
              eq(products.subCategoryId, categoryId),
            ),
            eq(products.status, "published"),
          ),
        )
        .orderBy(asc(products.sortOrder), asc(products.title));

  if (!productRows.length) return [];

  const directMedia = await mediaItems(
    productRows.flatMap((row) =>
      row.thumbnailId || row.featuredImageId
        ? [row.thumbnailId || row.featuredImageId!]
        : [],
    ),
  );
  const directMediaById = new Map(directMedia.map((item) => [item.id, item]));

  const galleryImages = await db
    .select({
      productId: productImages.productId,
      mediaId: media.id,
      url: media.url,
      legacyUrl: media.legacyUrl,
      alt: media.alt,
    })
    .from(productImages)
    .innerJoin(media, eq(productImages.mediaId, media.id))
    .where(
      inArray(
        productImages.productId,
        productRows.map((row) => row.id),
      ),
    )
    .orderBy(asc(productImages.sortOrder));

  const imageByProduct = new Map<string, { url: string; alt: string }>();
  for (const row of galleryImages) {
    if (!imageByProduct.has(row.productId)) {
      imageByProduct.set(row.productId, {
        url: mediaDeliveryUrl({
          id: row.mediaId,
          url: row.url,
          legacyUrl: row.legacyUrl,
        }),
        alt: row.alt ?? "",
      });
    }
  }

  return productRows.map((row) => {
    const directImage = directMediaById.get(
      row.thumbnailId || row.featuredImageId || "",
    );
    const galleryImage = imageByProduct.get(row.id);
    const imageUrl = directImage
      ? mediaDeliveryUrl(directImage)
      : (galleryImage?.url ?? null);
    const imageAlt = directImage?.alt || galleryImage?.alt || row.title;
    return {
      id: row.id,
      title: row.title,
      path: row.path,
      summary: row.summary,
      imageUrl,
      imageAlt,
    };
  });
}

async function loadProductExtras(
  productId: string,
  row: typeof products.$inferSelect,
) {
  const payload = await loadProductPayload(productId);
  const mediaIds = [
    ...payload.features.flatMap((item) => [
      item.iconMediaId,
      item.imageMediaId,
    ]),
    ...payload.applications.map((item) => item.imageMediaId),
    ...payload.documents.map((item) => item.mediaId),
  ].filter((id): id is string => Boolean(id));
  const items = await mediaItems(mediaIds);
  const byId = new Map(items.map((item) => [item.id, item]));

  const tableSpecs = payload.specifications
    .filter((spec) => spec.label.trim() || spec.value.trim())
    .map((spec) => ({ label: spec.label, value: spec.value }));
  const jsonSpecs = row.specs.filter(
    (spec) => spec.label.trim() || spec.value.trim(),
  );
  const specs = tableSpecs.length ? tableSpecs : jsonSpecs;

  return {
    specs,
    detailBlocks: productDetailBlocks(row),
    sections: await hydratePageSections(payload.sections),
    features: payload.features
      .filter((item) => item.title.trim() || item.description.trim())
      .map((item) => ({
        title: item.title,
        description: item.description,
        icon: item.iconMediaId ? (byId.get(item.iconMediaId) ?? null) : null,
        image: item.imageMediaId ? (byId.get(item.imageMediaId) ?? null) : null,
      })),
    applications: payload.applications
      .filter((item) => item.title.trim() || item.description.trim())
      .map((item) => ({
        title: item.title,
        description: item.description,
        image: item.imageMediaId ? (byId.get(item.imageMediaId) ?? null) : null,
      })),
    faqs: payload.faqs.filter(
      (item) => item.isActive && (item.question.trim() || item.answer.trim()),
    ),
    contentTables: payload.contentTables.filter(
      (table) => table.title.trim() || table.rows.length,
    ),
    technicalTables: payload.technicalTables.filter(
      (table) => table.tableTitle.trim() || table.rows.length,
    ),
    documents: payload.documents
      .filter((doc) => doc.title.trim() || doc.mediaId)
      .map((doc) => ({
        title: doc.title,
        url: doc.mediaId ? (byId.get(doc.mediaId)?.url ?? null) : null,
        documentType: doc.documentType,
        description: doc.description,
      })),
    gallery: await mediaItems(payload.galleryMediaIds),
    relatedProductIds: payload.relatedProducts,
    relatedPostIds: payload.relatedPosts.map((item) => item.postId),
  };
}

/** Featured / gallery image for the related product linked on city/export pages. */
async function relatedProductImage(
  db: Db,
  productId: string | null | undefined,
): Promise<MediaItem | null> {
  if (!productId) return null;
  const [product] = await db
    .select({
      featuredImageId: products.featuredImageId,
      thumbnailId: products.thumbnailId,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  const directId = product?.featuredImageId || product?.thumbnailId;
  if (directId) {
    const items = await mediaItems([directId]);
    if (items[0]) return items[0];
  }
  const [gallery] = await db
    .select({ mediaId: productImages.mediaId })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.sortOrder))
    .limit(1);
  if (!gallery?.mediaId) return null;
  const [item] = await mediaItems([gallery.mediaId]);
  return item ?? null;
}

export async function buildPublishedContent(
  db: Db,
  target: PublishedTarget,
): Promise<PublishedContent | null> {
  const { kind, entityId } = target;

  if (kind === "page") {
    const [row] = await db
      .select()
      .from(pages)
      .where(eq(pages.id, entityId))
      .limit(1);
    if (!row || row.status !== "published") return null;
    const [hero, ogImage, twitterImage] = await Promise.all([
      optionalMedia(row.heroMediaId),
      optionalMedia(row.ogImageId),
      optionalMedia(row.twitterImageId),
    ]);
    const sections = await hydratePageSections(
      await loadPageSections(entityId),
    );
    return {
      kind,
      path: row.path,
      title: row.title,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      focusKeyword: row.focusKeyword,
      canonicalUrl: row.canonicalUrl,
      ogTitle: row.ogTitle,
      ogDescription: row.ogDescription,
      ogImage,
      twitterTitle: row.twitterTitle,
      twitterDescription: row.twitterDescription,
      twitterImage,
      body: removeLegacyBlogEmbed(row.body),
      summary: row.excerpt || row.shortDescription || undefined,
      hero,
      sections,
    };
  }

  if (kind === "post") {
    const [row] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, entityId))
      .limit(1);
    if (!row || row.status !== "published") return null;
    const [cover, ogImage, twitterImage] = await Promise.all([
      optionalMedia(row.coverMediaId),
      optionalMedia(row.ogImageId),
      optionalMedia(row.twitterImageId),
    ]);
    return {
      kind,
      path: row.path,
      title: row.title,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      focusKeyword: row.focusKeyword,
      canonicalUrl: row.canonicalUrl,
      ogTitle: row.ogTitle,
      ogDescription: row.ogDescription,
      ogImage,
      twitterImage,
      body: row.body,
      summary: row.excerpt,
      cover,
      meta: {
        ...(row.publishedAt
          ? { publishedAt: row.publishedAt.toISOString() }
          : {}),
        ...(row.updatedAt ? { updatedAt: row.updatedAt.toISOString() } : {}),
        ...(row.updatedDateText
          ? { updatedDateText: row.updatedDateText }
          : {}),
        ...(row.author ? { author: row.author } : {}),
        ...(row.authorRole ? { authorRole: row.authorRole } : {}),
        ...(row.authorUrl ? { authorUrl: row.authorUrl } : {}),
        ...(row.reviewedByName ? { reviewedByName: row.reviewedByName } : {}),
        ...(row.reviewedByRole ? { reviewedByRole: row.reviewedByRole } : {}),
        ...(row.reviewedByUrl ? { reviewedByUrl: row.reviewedByUrl } : {}),
        ...(row.verifiedByName ? { verifiedByName: row.verifiedByName } : {}),
        ...(row.verifiedByRole ? { verifiedByRole: row.verifiedByRole } : {}),
        ...(row.verifiedByUrl ? { verifiedByUrl: row.verifiedByUrl } : {}),
      },
    };
  }

  if (kind === "category") {
    const [row] = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, entityId))
      .limit(1);
    if (!row || row.status !== "published") return null;
    const [image, ogImage] = await Promise.all([
      optionalMedia(row.imageId),
      optionalMedia(row.ogImageId),
    ]);
    const childCategoryRows = await db
      .select({
        id: productCategories.id,
        title: productCategories.title,
        path: productCategories.path,
        summary: productCategories.summary,
        imageId: productCategories.imageId,
        thumbnailId: productCategories.thumbnailId,
      })
      .from(productCategories)
      .where(
        and(
          eq(productCategories.parentId, row.id),
          eq(productCategories.status, "published"),
        ),
      )
      .orderBy(asc(productCategories.sortOrder), asc(productCategories.title));
    const childMedia = await mediaItems(
      childCategoryRows.flatMap((item) =>
        item.thumbnailId || item.imageId
          ? [item.thumbnailId || item.imageId!]
          : [],
      ),
    );
    const childMediaById = new Map(childMedia.map((item) => [item.id, item]));
    const childCategories = await Promise.all(
      childCategoryRows.map(async ({ imageId, thumbnailId, ...item }) => {
        const categoryImage =
          childMediaById.get(thumbnailId || imageId || "") ?? null;
        if (categoryImage) return { ...item, image: categoryImage };

        const [firstProduct] = await categoryProductCards(db, item.id);
        return {
          ...item,
          image: null,
          fallbackImageUrl: firstProduct?.imageUrl ?? null,
          fallbackImageAlt: firstProduct?.imageAlt || item.title,
        };
      }),
    );
    const filterCategories = await db
      .select({
        id: productCategories.id,
        title: productCategories.title,
        path: productCategories.path,
      })
      .from(productCategories)
      .where(
        and(
          eq(productCategories.status, "published"),
          row.parentId
            ? eq(productCategories.parentId, row.parentId)
            : isNull(productCategories.parentId),
        ),
      )
      .orderBy(asc(productCategories.sortOrder), asc(productCategories.title));
    return {
      kind,
      path: row.path,
      title: row.title,
      subtitle: row.subtitle || "ISO-9001:2015 Certified Company",
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      focusKeyword: row.focusKeyword,
      canonicalUrl: row.canonicalUrl,
      ogImage,
      body: removeLegacyProductListing(removeLegacyBlogEmbed(row.body)),
      summary: row.summary,
      image,
      childCategories,
      categoryProducts: await categoryProductCards(db, row.id),
      filterCategories,
      faqs: (await loadContentFaqs("category", row.id))
        .filter(
          (item) =>
            item.isActive && (item.question.trim() || item.answer.trim()),
        )
        .map((item) => ({
          question: item.question,
          answer: item.answer,
        })),
    };
  }

  if (kind === "product") {
    const [row] = await db
      .select()
      .from(products)
      .where(eq(products.id, entityId))
      .limit(1);
    if (!row || row.status !== "published") return null;
    const extras = await loadProductExtras(entityId, row);
    const relatedIds = extras.relatedProductIds.filter(
      (item) => item.relatedProductId !== entityId,
    );
    const relatedRows = relatedIds.length
      ? await db
          .select({
            id: products.id,
            title: products.title,
            path: products.path,
            summary: products.summary,
          })
          .from(products)
          .where(
            and(
              eq(products.status, "published"),
              inArray(
                products.id,
                relatedIds.map((r) => r.relatedProductId),
              ),
            ),
          )
      : [];
    const relatedOrder = new Map(
      relatedIds.map((item, index) => [item.relatedProductId, index]),
    );
    const relatedSorted = [...relatedRows].sort(
      (a, b) => (relatedOrder.get(a.id) ?? 0) - (relatedOrder.get(b.id) ?? 0),
    );
    const relatedImages = relatedSorted.length
      ? await db
          .select({
            productId: productImages.productId,
            mediaId: media.id,
            url: media.url,
            legacyUrl: media.legacyUrl,
            alt: media.alt,
          })
          .from(productImages)
          .innerJoin(media, eq(productImages.mediaId, media.id))
          .where(
            inArray(
              productImages.productId,
              relatedSorted.map((item) => item.id),
            ),
          )
          .orderBy(asc(productImages.sortOrder))
      : [];
    const relatedImageByProduct = new Map<
      string,
      { url: string; alt: string }
    >();
    for (const image of relatedImages) {
      if (!relatedImageByProduct.has(image.productId)) {
        relatedImageByProduct.set(image.productId, {
          url: mediaDeliveryUrl({
            id: image.mediaId,
            url: image.url,
            legacyUrl: image.legacyUrl,
          }),
          alt: image.alt ?? "",
        });
      }
    }
    const brochure = row.brochureMediaId
      ? (await mediaItems([row.brochureMediaId]))[0]
      : null;
    const primaryProductImageId = row.featuredImageId || row.thumbnailId;
    const primaryProductImage = primaryProductImageId
      ? (await mediaItems([primaryProductImageId]))[0]
      : null;
    const productGallery =
      primaryProductImage &&
      !extras.gallery.some((item) => item.id === primaryProductImage.id)
        ? [primaryProductImage, ...extras.gallery]
        : extras.gallery;
    const [parentCategory] = row.categoryId
      ? await db
          .select({
            title: productCategories.title,
            path: productCategories.path,
          })
          .from(productCategories)
          .where(eq(productCategories.id, row.categoryId))
          .limit(1)
      : [];
    return {
      kind,
      path: row.path,
      title: row.title,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      focusKeyword: row.focusKeyword,
      canonicalUrl: row.canonicalUrl,
      ogTitle: row.ogTitle,
      ogDescription: row.ogDescription,
      ogImage: await optionalMedia(row.ogImageId),
      twitterTitle: row.twitterTitle,
      twitterDescription: row.twitterDescription,
      twitterImage: await optionalMedia(row.twitterImageId),
      body: row.body,
      summary: row.summary,
      brand: row.brand,
      modelNumber: row.modelNumber,
      stock: row.stock,
      rating: row.rating,
      shippingArea: row.shippingArea,
      specs: extras.specs,
      gallery: productGallery,
      related: relatedSorted.map((item) => {
        const image = relatedImageByProduct.get(item.id);
        return {
          ...item,
          imageUrl: image?.url ?? null,
          imageAlt: image?.alt || item.title,
        };
      }),
      relatedPostIds: extras.relatedPostIds,
      brochureUrl: brochure ? mediaDeliveryUrl(brochure) : null,
      enquiryEnabled: row.enquiryEnabled,
      sections: extras.sections,
      detailBlocks: extras.detailBlocks,
      features: extras.features,
      applications: extras.applications,
      faqs: extras.faqs,
      contentTables: extras.contentTables,
      technicalTables: extras.technicalTables,
      documents: extras.documents,
      parent: parentCategory ?? null,
      robotsIndex: row.robotsIndex,
      robotsFollow: row.robotsFollow,
    };
  }

  if (kind === "location") {
    const [row] = await db
      .select()
      .from(locationPages)
      .where(eq(locationPages.id, entityId))
      .limit(1);
    if (!row || row.status !== "published") return null;
    const productImage = await relatedProductImage(db, row.productId);
    return {
      kind,
      path: row.path,
      title: row.title,
      seoTitle: row.seoTitle,
      seoDescription: normalizeSeoDescription(row.seoDescription),
      body: normalizeLocationBody(row.body, row.locationName),
      image: productImage,
      meta: {
        locationName: row.locationName,
        region: row.region ?? "",
      },
    };
  }

  if (kind === "export") {
    const [row] = await db
      .select()
      .from(exportPages)
      .where(eq(exportPages.id, entityId))
      .limit(1);
    if (!row || row.status !== "published") return null;
    const productImage = await relatedProductImage(db, row.productId);
    return {
      kind,
      path: row.path,
      title: row.title,
      seoTitle: row.seoTitle,
      seoDescription: normalizeSeoDescription(row.seoDescription),
      body: normalizeLocationBody(row.body, row.country),
      image: productImage,
      meta: {
        country: row.country,
        productLine: row.productLine ?? "",
      },
    };
  }

  return null;
}

export async function resolvePublishedContentByPath(
  path: string,
): Promise<PublishedContent | null> {
  const db = getDb();
  const target = await findPublishedTarget(db, path);
  if (!target) return null;
  return buildPublishedContent(db, target);
}
