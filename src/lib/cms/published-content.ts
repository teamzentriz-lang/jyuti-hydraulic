import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  exportPages,
  locationPages,
  media,
  pages,
  posts,
  productCategories,
  productImages,
  products,
  routes,
  type SpecRow,
} from "@/db/schema";
import { loadPageSections, loadProductPayload, type PageSectionPayload } from "@/lib/cms/entity-data";
import { mediaItems, type MediaItem } from "@/lib/cms/queries";
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
  seoTitle: string | null;
  seoDescription: string | null;
  body: string;
  summary?: string;
  hero?: MediaItem | null;
  cover?: MediaItem | null;
  image?: MediaItem | null;
  specs?: SpecRow[];
  gallery?: MediaItem[];
  related?: { id: string; title: string; path: string; summary: string }[];
  childCategories?: { id: string; title: string; path: string; summary: string }[];
  categoryProducts?: { id: string; title: string; path: string; summary: string; imageUrl: string | null; imageAlt: string }[];
  meta?: Record<string, string>;
  sections?: RenderedPageSection[];
  detailBlocks?: DetailBlock[];
  features?: PublishedFeature[];
  applications?: PublishedApplication[];
  faqs?: PublishedFaq[];
  contentTables?: PublishedContentTable[];
  technicalTables?: PublishedTechnicalTable[];
  documents?: PublishedDocument[];
};

type PublishedTarget = { kind: RouteKind; entityId: string };

export async function findPublishedTarget(db: Db, path: string): Promise<PublishedTarget | null> {
  const [route] = await db.select().from(routes).where(eq(routes.path, path)).limit(1);
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
    .where(and(eq(productCategories.path, path), eq(productCategories.status, "published")))
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
    .where(and(eq(locationPages.path, path), eq(locationPages.status, "published")))
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

async function hydratePageSections(sections: PageSectionPayload[]): Promise<RenderedPageSection[]> {
  const active = sections.filter((section) => section.isActive);
  const mediaIds = active.flatMap((section) =>
    [section.imageId, section.backgroundImageId, section.mobileImageId].filter((id): id is string => Boolean(id)),
  );
  const items = await mediaItems(mediaIds);
  const byId = new Map(items.map((item) => [item.id, item]));
  return active.map((section) => ({
    ...section,
    image: section.imageId ? (byId.get(section.imageId) ?? null) : null,
    backgroundImage: section.backgroundImageId ? (byId.get(section.backgroundImageId) ?? null) : null,
    mobileImage: section.mobileImageId ? (byId.get(section.mobileImageId) ?? null) : null,
  }));
}

function productDetailBlocks(row: typeof products.$inferSelect): DetailBlock[] {
  const pairs: { key: keyof typeof products.$inferSelect; heading: string }[] = [
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
  const productRows = await db
    .select({ id: products.id, title: products.title, path: products.path, summary: products.summary })
    .from(products)
    .where(and(eq(products.categoryId, categoryId), eq(products.status, "published")))
    .orderBy(asc(products.sortOrder), asc(products.title));

  if (!productRows.length) return [];

  const images = await db
    .select({
      productId: productImages.productId,
      url: media.url,
      alt: media.alt,
    })
    .from(productImages)
    .innerJoin(media, eq(productImages.mediaId, media.id))
    .where(inArray(productImages.productId, productRows.map((row) => row.id)))
    .orderBy(asc(productImages.sortOrder));

  const imageByProduct = new Map<string, { url: string; alt: string }>();
  for (const row of images) {
    if (!imageByProduct.has(row.productId)) {
      imageByProduct.set(row.productId, { url: row.url, alt: row.alt ?? "" });
    }
  }

  return productRows.map((row) => {
    const image = imageByProduct.get(row.id);
    return {
      ...row,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt || row.title,
    };
  });
}

async function loadProductExtras(productId: string, row: typeof products.$inferSelect) {
  const payload = await loadProductPayload(productId);
  const mediaIds = [
    ...payload.features.flatMap((item) => [item.iconMediaId, item.imageMediaId]),
    ...payload.applications.map((item) => item.imageMediaId),
    ...payload.documents.map((item) => item.mediaId),
  ].filter((id): id is string => Boolean(id));
  const items = await mediaItems(mediaIds);
  const byId = new Map(items.map((item) => [item.id, item]));

  const tableSpecs = payload.specifications
    .filter((spec) => spec.label.trim() || spec.value.trim())
    .map((spec) => ({ label: spec.label, value: spec.value }));
  const jsonSpecs = row.specs.filter((spec) => spec.label.trim() || spec.value.trim());
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
    faqs: payload.faqs.filter((item) => item.isActive && (item.question.trim() || item.answer.trim())),
    contentTables: payload.contentTables.filter((table) => table.title.trim() || table.rows.length),
    technicalTables: payload.technicalTables.filter((table) => table.tableTitle.trim() || table.rows.length),
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
  };
}

export async function buildPublishedContent(db: Db, target: PublishedTarget): Promise<PublishedContent | null> {
  const { kind, entityId } = target;

  if (kind === "page") {
    const [row] = await db.select().from(pages).where(eq(pages.id, entityId)).limit(1);
    if (!row || row.status !== "published") return null;
    const hero = row.heroMediaId ? (await mediaItems([row.heroMediaId]))[0] : null;
    const sections = await hydratePageSections(await loadPageSections(entityId));
    return {
      kind,
      path: row.path,
      title: row.title,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      body: row.body,
      summary: row.excerpt || row.shortDescription || undefined,
      hero,
      sections,
    };
  }

  if (kind === "post") {
    const [row] = await db.select().from(posts).where(eq(posts.id, entityId)).limit(1);
    if (!row || row.status !== "published") return null;
    const cover = row.coverMediaId ? (await mediaItems([row.coverMediaId]))[0] : null;
    return {
      kind,
      path: row.path,
      title: row.title,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      body: row.body,
      summary: row.excerpt,
      cover,
      meta: row.publishedAt ? { publishedAt: row.publishedAt.toISOString() } : undefined,
    };
  }

  if (kind === "category") {
    const [row] = await db.select().from(productCategories).where(eq(productCategories.id, entityId)).limit(1);
    if (!row || row.status !== "published") return null;
    const image = row.imageId ? (await mediaItems([row.imageId]))[0] : null;
    const childCategories = await db
      .select({ id: productCategories.id, title: productCategories.title, path: productCategories.path, summary: productCategories.summary })
      .from(productCategories)
      .where(and(eq(productCategories.parentId, row.id), eq(productCategories.status, "published")))
      .orderBy(asc(productCategories.sortOrder), asc(productCategories.title));
    return {
      kind,
      path: row.path,
      title: row.title,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      body: row.body,
      summary: row.summary,
      image,
      childCategories,
      categoryProducts: await categoryProductCards(db, row.id),
    };
  }

  if (kind === "product") {
    const [row] = await db.select().from(products).where(eq(products.id, entityId)).limit(1);
    if (!row || row.status !== "published") return null;
    const extras = await loadProductExtras(entityId, row);
    const relatedIds = extras.relatedProductIds.filter((item) => item.relatedProductId !== entityId);
    const relatedRows = relatedIds.length
      ? await db
          .select({ id: products.id, title: products.title, path: products.path, summary: products.summary })
          .from(products)
          .where(and(eq(products.status, "published"), inArray(products.id, relatedIds.map((r) => r.relatedProductId))))
      : [];
    const relatedOrder = new Map(relatedIds.map((item, index) => [item.relatedProductId, index]));
    const related = [...relatedRows].sort(
      (a, b) => (relatedOrder.get(a.id) ?? 0) - (relatedOrder.get(b.id) ?? 0),
    );
    return {
      kind,
      path: row.path,
      title: row.title,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      body: row.body,
      summary: row.summary,
      specs: extras.specs,
      gallery: extras.gallery,
      related,
      sections: extras.sections,
      detailBlocks: extras.detailBlocks,
      features: extras.features,
      applications: extras.applications,
      faqs: extras.faqs,
      contentTables: extras.contentTables,
      technicalTables: extras.technicalTables,
      documents: extras.documents,
    };
  }

  if (kind === "location") {
    const [row] = await db.select().from(locationPages).where(eq(locationPages.id, entityId)).limit(1);
    if (!row || row.status !== "published") return null;
    return {
      kind,
      path: row.path,
      title: row.title,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      body: row.body,
      meta: { locationName: row.locationName, region: row.region },
    };
  }

  if (kind === "export") {
    const [row] = await db.select().from(exportPages).where(eq(exportPages.id, entityId)).limit(1);
    if (!row || row.status !== "published") return null;
    return {
      kind,
      path: row.path,
      title: row.title,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      body: row.body,
      meta: { country: row.country, productLine: row.productLine },
    };
  }

  return null;
}

export async function resolvePublishedContentByPath(path: string): Promise<PublishedContent | null> {
  const db = getDb();
  const target = await findPublishedTarget(db, path);
  if (!target) return null;
  return buildPublishedContent(db, target);
}
