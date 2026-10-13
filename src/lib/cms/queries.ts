import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  isNotNull,
  or,
  sql,
  type AnyColumn,
} from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { classifyDatabaseError, type DatabaseFailure } from "@/db/errors";
import { mediaDeliveryUrl } from "@/lib/media-url";
import {
  blogCategories,
  blogTags,
  catalogues,
  certificates,
  cmsForms,
  contactSettings,
  exportPages,
  footerSettings,
  galleryAlbums,
  galleryItems,
  headerSettings,
  homeContent,
  homeFeaturedProducts,
  homeHeroImages,
  inquiries,
  locationPages,
  media,
  navLinks,
  pages,
  posts,
  productCategories,
  productImages,
  products,
  redirects,
  siteSettings,
  users,
} from "@/db/schema";
import {
  defaultClients,
  defaultStats,
  defaultStrengths,
  defaultTestimonials,
  defaultUsps,
  homeDefaults,
} from "@/lib/brand";
import {
  loadContentFaqs,
  loadProductPayload,
  loadPageSections,
} from "@/lib/cms/entity-data";
import {
  type RelationName,
  type ResourceKey,
  resources,
} from "@/lib/cms/resources";

export const tables = {
  pages,
  "product-categories": productCategories,
  products,
  locations: locationPages,
  exports: exportPages,
  posts,
  "blog-categories": blogCategories,
  "blog-tags": blogTags,
  gallery: galleryItems,
  "gallery-albums": galleryAlbums,
  certificates,
  catalogues,
  forms: cmsForms,
  inquiries,
  redirects,
  "nav-links": navLinks,
  users,
  media,
} satisfies Record<ResourceKey, AnyPgTable>;

export async function loadDatabase<T>(
  fn: () => Promise<T>,
): Promise<{ ok: true; data: T } | { ok: false; failure: DatabaseFailure }> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return { ok: false, failure: classifyDatabaseError(error) };
  }
}

let singletonSetup: Promise<void> | null = null;

export async function ensureSingletons() {
  if (singletonSetup) return singletonSetup;

  singletonSetup = (async () => {
    const db = getDb();
    await db.execute(sql`
      ALTER TABLE home_content
        ADD COLUMN IF NOT EXISTS client_logos jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS testimonials jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS stats jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS usps jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS custom_band_title text NOT NULL DEFAULT 'Custom Hydraulic Solutions for Every Industry',
        ADD COLUMN IF NOT EXISTS custom_band_eyebrow text NOT NULL DEFAULT 'Made around your application',
        ADD COLUMN IF NOT EXISTS custom_band_body text NOT NULL DEFAULT 'From standard power packs to fully customized systems, our team designs and manufactures equipment that meets your exact requirements.',
        ADD COLUMN IF NOT EXISTS custom_band_button_text text NOT NULL DEFAULT 'Get a custom solution',
        ADD COLUMN IF NOT EXISTS custom_band_button_href text NOT NULL DEFAULT '/contact/';
    `);
    await db.execute(
      sql`ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS subtitle text NOT NULL DEFAULT 'ISO-9001:2015 Certified Company';`,
    );
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS media_blobs (
        media_id uuid PRIMARY KEY REFERENCES media(id) ON DELETE CASCADE,
        data_base64 text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await db
      .insert(siteSettings)
      .values({ id: "default" })
      .onConflictDoNothing();
    await db
      .insert(homeContent)
      .values({ id: "default", ...homeDefaults })
      .onConflictDoNothing();
    await db
      .insert(headerSettings)
      .values({ id: "default" })
      .onConflictDoNothing();
    await db
      .insert(footerSettings)
      .values({ id: "default" })
      .onConflictDoNothing();
    await db
      .insert(contactSettings)
      .values({ id: "default" })
      .onConflictDoNothing();
  })();

  try {
    await singletonSetup;
  } catch (error) {
    singletonSetup = null;
    throw error;
  }
}

export async function countUsers() {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  return row?.count ?? 0;
}

function serializeRow(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "passwordHash") continue;
    out[key] = value instanceof Date ? value.toISOString() : value;
  }
  return out;
}

export async function listRecords(
  resource: ResourceKey,
  input: { q?: string; page?: number },
) {
  const config = resources[resource];
  const db = getDb();
  const table = tables[resource];
  const columns = getTableColumns(table) as Record<
    string,
    AnyColumn | undefined
  >;
  const pageSize = 20;
  const page = Math.max(1, input.page ?? 1);
  const q = input.q?.trim().replace(/[%_]/g, "") ?? "";
  const search = q
    ? or(
        ...config.searchColumns
          .map((name) => columns[name])
          .filter((column): column is AnyColumn => Boolean(column))
          .map((column) => ilike(column, `%${q}%`)),
      )
    : undefined;

  const orderColumn = columns[config.orderBy.column];
  if (!orderColumn)
    throw new Error(`Missing sort column ${config.orderBy.column}`);
  const order =
    config.orderBy.direction === "asc" ? asc(orderColumn) : desc(orderColumn);

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(table)
      .where(search)
      .orderBy(order)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(table)
      .where(search),
  ]);

  return {
    rows: rows.map((row) => serializeRow(row as Record<string, unknown>)),
    total: countRows[0]?.count ?? 0,
    page,
    pageSize,
  };
}

export async function getRecord(resource: ResourceKey, id: string) {
  const db = getDb();
  const table = tables[resource];
  const columns = getTableColumns(table);
  const idColumn = columns.id;
  if (!idColumn) return null;
  const [row] = await db.select().from(table).where(eq(idColumn, id)).limit(1);
  if (!row) return null;
  const record = serializeRow(row as Record<string, unknown>);

  if (resource === "products") {
    record.productPayload = await loadProductPayload(id);
    record.galleryMediaIds = (
      record.productPayload as { galleryMediaIds: string[] }
    ).galleryMediaIds;
    record.relatedProductIds = (
      record.productPayload as {
        relatedProducts: { relatedProductId: string }[];
      }
    ).relatedProducts.map((item) => item.relatedProductId);
  }

  if (resource === "product-categories") {
    record.categoryFaqs = await loadContentFaqs("category", id);
  }

  if (resource === "pages") {
    record.pageSections = await loadPageSections(id);
  }

  return record;
}

export async function relationOptions(name: RelationName, excludeId?: string) {
  const db = getDb();
  if (name === "product-categories") {
    const rows = await db
      .select({
        id: productCategories.id,
        title: productCategories.title,
        path: productCategories.path,
      })
      .from(productCategories)
      .orderBy(asc(productCategories.path))
      .limit(2000);
    return rows
      .filter((row) => row.id !== excludeId)
      .map((row) => ({ value: row.id, label: `${row.title}   /${row.path}/` }));
  }
  if (name === "products") {
    const rows = await db
      .select({ id: products.id, title: products.title, path: products.path })
      .from(products)
      .orderBy(asc(products.title))
      .limit(2000);
    return rows
      .filter((row) => row.id !== excludeId)
      .map((row) => ({ value: row.id, label: `${row.title}   /${row.path}/` }));
  }
  const rows = await db
    .select({
      id: navLinks.id,
      label: navLinks.label,
      location: navLinks.location,
    })
    .from(navLinks)
    .orderBy(asc(navLinks.sortOrder))
    .limit(2000);
  return rows
    .filter((row) => row.id !== excludeId)
    .map((row) => ({ value: row.id, label: `${row.location}: ${row.label}` }));
}

export async function fieldsFor(resource: ResourceKey, currentId?: string) {
  const fields = [];
  for (const field of resources[resource].fields) {
    if (
      (field.type === "relation" || field.type === "relationMany") &&
      field.relation
    ) {
      const exclude =
        field.name === "parentId" || field.name === "relatedProductIds"
          ? currentId
          : undefined;
      fields.push({
        ...field,
        options: await relationOptions(field.relation, exclude),
      });
    } else {
      fields.push(field);
    }
  }
  return fields;
}

export type MediaItem = {
  id: string;
  url: string;
  filename: string;
  alt: string;
  mimeType: string;
};

export async function mediaItems(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [] as MediaItem[];
  const db = getDb();
  const rows = await db
    .select({
      id: media.id,
      url: media.url,
      filename: media.filename,
      alt: media.alt,
      mimeType: media.mimeType,
    })
    .from(media)
    .where(inArray(media.id, unique));
  const byId = new Map(rows.map((row) => [row.id, row]));
  return unique.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

export async function getSettings() {
  await ensureSingletons();
  const db = getDb();
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, "default"))
    .limit(1);
  if (!row) throw new Error("Site settings are missing.");
  return row;
}

export async function getHome() {
  await ensureSingletons();
  const db = getDb();
  const [row] = await db
    .select()
    .from(homeContent)
    .where(eq(homeContent.id, "default"))
    .limit(1);
  if (!row) throw new Error("Home content is missing.");
  const heroes = await db
    .select()
    .from(homeHeroImages)
    .orderBy(asc(homeHeroImages.sortOrder));
  const featured = await db
    .select()
    .from(homeFeaturedProducts)
    .orderBy(asc(homeFeaturedProducts.sortOrder));
  const clientLogos =
    row.clientLogos && row.clientLogos.length > 0
      ? row.clientLogos
      : defaultClients;
  const testimonials =
    row.testimonials && row.testimonials.length > 0
      ? row.testimonials
      : defaultTestimonials;
  const strengths =
    row.strengths && row.strengths.length > 0
      ? row.strengths
      : defaultStrengths;
  const stats =
    row.stats && row.stats.length > 0 ? row.stats : defaultStats;
  const usps =
    row.usps && row.usps.length > 0 ? row.usps : defaultUsps;
  return {
    ...row,
    clientLogos,
    testimonials,
    strengths,
    stats,
    usps,
    customBandTitle: row.customBandTitle || homeDefaults.customBandTitle,
    customBandEyebrow: row.customBandEyebrow || homeDefaults.customBandEyebrow,
    customBandBody: row.customBandBody || homeDefaults.customBandBody,
    customBandButtonText: row.customBandButtonText || homeDefaults.customBandButtonText,
    customBandButtonHref: row.customBandButtonHref || homeDefaults.customBandButtonHref,
    heroMediaIds: heroes.map((item) => item.mediaId),
    featuredProductIds: featured.map((item) => item.productId),
  };
}

export type FeaturedProductCard = {
  id: string;
  title: string;
  path: string;
  summary: string;
  imageUrl: string | null;
  imageAlt: string;
};

export async function publishedPosts(
  limit = 6,
  wpImportedOnly = false,
  query = "",
) {
  const db = getDb();
  const conditions = [eq(posts.status, "published")];
  if (wpImportedOnly) conditions.push(isNotNull(posts.legacyId));
  const search = query.trim();
  if (search) {
    const pattern = `%${search}%`;
    const match = or(ilike(posts.title, pattern), ilike(posts.excerpt, pattern));
    if (match) conditions.push(match);
  }
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      path: posts.path,
      excerpt: posts.excerpt,
      publishedAt: posts.publishedAt,
      author: posts.author,
      readingTime: posts.readingTime,
      featured: posts.featured,
      coverMediaId: posts.coverMediaId,
      coverAlt: media.alt,
    })
    .from(posts)
    .leftJoin(media, eq(posts.coverMediaId, media.id))
    .where(and(...conditions))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
  return rows.map((row) => ({
    ...row,
    coverUrl: row.coverMediaId ? `/api/media/${row.coverMediaId}` : null,
  }));
}

export async function getHeaderSettings() {
  await ensureSingletons();
  const db = getDb();
  const [row] = await db
    .select()
    .from(headerSettings)
    .where(eq(headerSettings.id, "default"))
    .limit(1);
  if (!row) throw new Error("Header settings are missing.");
  return row;
}

export async function getFooterSettings() {
  await ensureSingletons();
  const db = getDb();
  const [row] = await db
    .select()
    .from(footerSettings)
    .where(eq(footerSettings.id, "default"))
    .limit(1);
  if (!row) throw new Error("Footer settings are missing.");
  return row;
}

export async function getContactSettings() {
  await ensureSingletons();
  const db = getDb();
  const [row] = await db
    .select()
    .from(contactSettings)
    .where(eq(contactSettings.id, "default"))
    .limit(1);
  if (!row) throw new Error("Contact settings are missing.");
  return row;
}

/** Published catalogue PDF URL (Catalogues admin), or Site settings catalogue file as fallback. */
export async function getCataloguePdfUrl(): Promise<string | null> {
  try {
    const db = getDb();
    const [row] = await db
      .select({ documentId: catalogues.documentId })
      .from(catalogues)
      .where(
        and(eq(catalogues.status, "published"), isNotNull(catalogues.documentId)),
      )
      .orderBy(asc(catalogues.sortOrder), asc(catalogues.title))
      .limit(1);
    if (row?.documentId) {
      const items = await mediaItems([row.documentId]);
      const file = items[0];
      if (file?.mimeType === "application/pdf") return mediaDeliveryUrl(file);
    }

    const settings = await getSettings();
    if (settings.catalogueId) {
      const items = await mediaItems([settings.catalogueId]);
      const file = items[0];
      if (file?.mimeType === "application/pdf") return mediaDeliveryUrl(file);
    }
    return null;
  } catch {
    return null;
  }
}

export async function cataloguesForSite(limit = 24) {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: catalogues.id,
        title: catalogues.title,
        description: catalogues.description,
        coverImageId: catalogues.coverImageId,
        documentId: catalogues.documentId,
        version: catalogues.version,
        language: catalogues.language,
      })
      .from(catalogues)
      .where(eq(catalogues.status, "published"))
      .orderBy(asc(catalogues.sortOrder), asc(catalogues.title))
      .limit(limit);
    const mediaRows = await mediaItems(
      rows.flatMap((row) =>
        [row.coverImageId, row.documentId].filter((id): id is string =>
          Boolean(id),
        ),
      ),
    );
    const mediaById = new Map(mediaRows.map((item) => [item.id, item]));
    return rows.map((row) => ({
      ...row,
      cover: row.coverImageId ? (mediaById.get(row.coverImageId) ?? null) : null,
      documentUrl: row.documentId
        ? (() => {
            const file = mediaById.get(row.documentId);
            return file ? mediaDeliveryUrl(file) : null;
          })()
        : null,
    }));
  } catch {
    return [];
  }
}

export async function galleryForSite(limit = 48) {
  const db = getDb();
  const rows = await db
    .select({
      id: galleryItems.id,
      title: galleryItems.title,
      caption: galleryItems.caption,
      mediaId: galleryItems.mediaId,
    })
    .from(galleryItems)
    .orderBy(asc(galleryItems.sortOrder))
    .limit(limit);
  const items = await mediaItems(rows.map((row) => row.mediaId));
  const mediaById = new Map(items.map((item) => [item.id, item]));
  return rows.map((row) => ({
    ...row,
    media: mediaById.get(row.mediaId) ?? null,
  }));
}

export async function certificatesForSite(limit = 24) {
  const db = getDb();
  const rows = await db
    .select({
      id: certificates.id,
      title: certificates.title,
      caption: certificates.caption,
      mediaId: certificates.mediaId,
    })
    .from(certificates)
    .orderBy(asc(certificates.sortOrder))
    .limit(limit);
  const items = await mediaItems(rows.map((row) => row.mediaId));
  const mediaById = new Map(items.map((item) => [item.id, item]));
  return rows.map((row) => ({
    ...row,
    media: mediaById.get(row.mediaId) ?? null,
  }));
}

export type CategoryShowcase = {
  id: string;
  title: string;
  path: string;
  products: FeaturedProductCard[];
};

export async function homeCategoryShowcases(
  categoryPaths: readonly string[],
  productsPerCategory = 6,
) {
  const db = getDb();
  if (!categoryPaths.length) return [] as CategoryShowcase[];
  const categories = await db
    .select({
      id: productCategories.id,
      title: productCategories.title,
      path: productCategories.path,
    })
    .from(productCategories)
    .where(
      and(
        eq(productCategories.status, "published"),
        inArray(productCategories.path, [...categoryPaths]),
      ),
    );

  const order = new Map(categoryPaths.map((path, index) => [path, index]));
  const sortedCategories = [...categories].sort(
    (a, b) => (order.get(a.path) ?? 0) - (order.get(b.path) ?? 0),
  );

  const showcases: CategoryShowcase[] = [];
  for (const category of sortedCategories) {
    const productRows = await db
      .select({
        id: products.id,
        title: products.title,
        path: products.path,
        summary: products.summary,
      })
      .from(products)
      .where(
        and(
          eq(products.categoryId, category.id),
          eq(products.status, "published"),
        ),
      )
      .orderBy(asc(products.sortOrder), asc(products.title))
      .limit(productsPerCategory);

    const images = await db
      .select({
        productId: productImages.productId,
        url: media.url,
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
    for (const row of images) {
      if (!imageByProduct.has(row.productId)) {
        imageByProduct.set(row.productId, { url: row.url, alt: row.alt ?? "" });
      }
    }

    showcases.push({
      ...category,
      products: productRows.map((row) => {
        const image = imageByProduct.get(row.id);
        return {
          ...row,
          imageUrl: image?.url ?? null,
          imageAlt: image?.alt || row.title,
        };
      }),
    });
  }
  return showcases;
}

/** Home product grids: WordPress-imported categories first, then CMS paths, then site skeleton defaults. */
export async function homePageCategoryShowcases(
  configuredPaths: readonly string[],
  productsPerCategory = 6,
  categoryLimit = 3,
) {
  const migrated = await migratedCategoryShowcases(
    productsPerCategory,
    categoryLimit,
  );
  if (migrated.length) return migrated;

  const paths = configuredPaths.filter(Boolean);
  if (paths.length) {
    const fromCms = await homeCategoryShowcases(paths, productsPerCategory);
    if (fromCms.length) return fromCms;
  }

  const { homeShowcasePaths } = await import("@/lib/site-skeleton");
  return homeCategoryShowcases(homeShowcasePaths, productsPerCategory);
}

/** Product grids on the home page — only categories imported from WordPress (legacy_id set). */
export async function migratedCategoryShowcases(
  productsPerCategory = 5,
  categoryLimit = 3,
) {
  const db = getDb();
  const categories = await db
    .select({
      id: productCategories.id,
      title: productCategories.title,
      path: productCategories.path,
    })
    .from(productCategories)
    .where(
      and(
        eq(productCategories.status, "published"),
        isNotNull(productCategories.legacyId),
      ),
    )
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.title))
    .limit(categoryLimit);

  const showcases: CategoryShowcase[] = [];
  for (const category of categories) {
    const productRows = await db
      .select({
        id: products.id,
        title: products.title,
        path: products.path,
        summary: products.summary,
      })
      .from(products)
      .where(
        and(
          eq(products.categoryId, category.id),
          eq(products.status, "published"),
          isNotNull(products.legacyId),
        ),
      )
      .orderBy(asc(products.sortOrder), asc(products.title))
      .limit(productsPerCategory);

    const images = await db
      .select({
        productId: productImages.productId,
        mediaId: media.id,
        url: media.url,
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
    for (const row of images) {
      if (!imageByProduct.has(row.productId)) {
        imageByProduct.set(row.productId, {
          url: `/api/media/${row.mediaId}`,
          alt: row.alt ?? "",
        });
      }
    }

    showcases.push({
      ...category,
      products: productRows.map((row) => {
        const image = imageByProduct.get(row.id);
        return {
          ...row,
          imageUrl: image?.url ?? null,
          imageAlt: image?.alt || row.title,
        };
      }),
    });
  }
  return showcases;
}

export async function featuredProductsForHome(productIds: string[]) {
  const ordered = [...new Set(productIds.filter(Boolean))];
  if (!ordered.length) return [] as FeaturedProductCard[];
  const db = getDb();
  const rows = await db
    .select({
      id: products.id,
      title: products.title,
      path: products.path,
      summary: products.summary,
    })
    .from(products)
    .where(and(inArray(products.id, ordered), isNotNull(products.legacyId)));

  const images = await db
    .select({
      productId: productImages.productId,
      mediaId: media.id,
      url: media.url,
      alt: media.alt,
    })
    .from(productImages)
    .innerJoin(media, eq(productImages.mediaId, media.id))
    .where(inArray(productImages.productId, ordered))
    .orderBy(asc(productImages.sortOrder));

  const imageByProduct = new Map<string, { url: string; alt: string }>();
  for (const row of images) {
    if (!imageByProduct.has(row.productId)) {
      imageByProduct.set(row.productId, {
        url: `/api/media/${row.mediaId}`,
        alt: row.alt ?? "",
      });
    }
  }

  const byId = new Map(rows.map((row) => [row.id, row]));
  return ordered.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    const image = imageByProduct.get(id);
    return [
      {
        ...row,
        imageUrl: image?.url ?? null,
        imageAlt: image?.alt || row.title,
      },
    ];
  });
}

export type CatalogueGroup = {
  id: string;
  title: string;
  path: string;
  summary: string;
  imageUrl: string | null;
  imageAlt: string;
};

export type CatalogueItem = CatalogueGroup & {
  groupId: string;
  kind: "category" | "product";
};

export async function catalogueListing() {
  const db = getDb();
  const categoryRows = await db
    .select({
      id: productCategories.id,
      title: productCategories.title,
      path: productCategories.path,
      summary: productCategories.summary,
      parentId: productCategories.parentId,
      imageId: productCategories.imageId,
      thumbnailId: productCategories.thumbnailId,
    })
    .from(productCategories)
    .where(eq(productCategories.status, "published"))
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.title));

  const categoryMedia = await mediaItems(
    categoryRows.flatMap((row) =>
      [row.thumbnailId, row.imageId].filter((id): id is string => Boolean(id)),
    ),
  );
  const categoryMediaById = new Map(categoryMedia.map((item) => [item.id, item]));
  const categoryImage = (row: (typeof categoryRows)[number]) => {
    const item =
      (row.thumbnailId ? categoryMediaById.get(row.thumbnailId) : undefined) ??
      (row.imageId ? categoryMediaById.get(row.imageId) : undefined);
    return item
      ? { url: mediaDeliveryUrl(item), alt: item.alt || row.title }
      : { url: null, alt: row.title };
  };

  const parentOf = new Map(categoryRows.map((row) => [row.id, row.parentId]));
  const rootOf = (id: string | null) => {
    let current = id;
    const seen = new Set<string>();
    while (current && parentOf.get(current) && !seen.has(current)) {
      seen.add(current);
      current = parentOf.get(current) ?? null;
    }
    return current ?? "";
  };

  const topLevel = categoryRows.filter((row) => !row.parentId);
  const groups = (topLevel.length ? topLevel : categoryRows).map((row) => {
    const image = categoryImage(row);
    return {
      id: row.id,
      title: row.title,
      path: row.path,
      summary: row.summary,
      imageUrl: image.url,
      imageAlt: image.alt,
    };
  });

  const productRows = await db
    .select({
      id: products.id,
      title: products.title,
      path: products.path,
      summary: products.summary,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(eq(products.status, "published"))
    .orderBy(asc(products.sortOrder), asc(products.title));

  const productImageRows = productRows.length
    ? await db
        .select({
          productId: productImages.productId,
          mediaId: media.id,
          url: media.url,
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
        .orderBy(asc(productImages.sortOrder))
    : [];
  const productImageById = new Map<string, { url: string; alt: string }>();
  for (const row of productImageRows) {
    if (!productImageById.has(row.productId)) {
      productImageById.set(row.productId, {
        url: mediaDeliveryUrl({ id: row.mediaId, url: row.url }),
        alt: row.alt ?? "",
      });
    }
  }

  const childCategories: CatalogueItem[] = categoryRows
    .filter((row) => row.parentId)
    .map((row) => {
      const image = categoryImage(row);
      return {
        id: row.id,
        title: row.title,
        path: row.path,
        summary: row.summary,
        imageUrl: image.url,
        imageAlt: image.alt,
        groupId: rootOf(row.id),
        kind: "category" as const,
      };
    });

  const productItems: CatalogueItem[] = productRows.map((row) => {
    const image = productImageById.get(row.id);
    return {
      id: row.id,
      title: row.title,
      path: row.path,
      summary: row.summary,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt || row.title,
      groupId: rootOf(row.categoryId),
      kind: "product" as const,
    };
  });

  return { groups, items: [...childCategories, ...productItems] };
}

export async function dashboardSummary() {
  const db = getDb();
  const pairs = [
    ["pages", pages],
    ["product-categories", productCategories],
    ["products", products],
    ["locations", locationPages],
    ["exports", exportPages],
    ["posts", posts],
    ["blog-categories", blogCategories],
    ["blog-tags", blogTags],
    ["gallery", galleryItems],
    ["gallery-albums", galleryAlbums],
    ["certificates", certificates],
    ["catalogues", catalogues],
    ["forms", cmsForms],
    ["media", media],
    ["inquiries", inquiries],
    ["redirects", redirects],
    ["nav-links", navLinks],
    ["users", users],
  ] as const;

  const counts = Object.fromEntries(
    await Promise.all(
      pairs.map(async ([key, table]) => {
        const [row] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(table);
        return [key, row?.count ?? 0] as const;
      }),
    ),
  ) as Record<(typeof pairs)[number][0], number>;

  const recent = await db
    .select()
    .from(inquiries)
    .orderBy(desc(inquiries.createdAt))
    .limit(5);
  return { counts, recent };
}
