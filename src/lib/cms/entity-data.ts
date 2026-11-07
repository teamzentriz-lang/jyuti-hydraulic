import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { classifyDatabaseError } from "@/db/errors";
import {
  categoryRelatedCategories,
  contentFaqs,
  contentTables,
  pageSections,
  postTags,
  productApplications,
  productCategoryAssignments,
  productDocuments,
  productFeatures,
  productImages,
  productOptions,
  productPostRelations,
  productRelations,
  productSpecifications,
  productTechnicalTables,
  type ProductSpecRow,
  type TechnicalTableRow,
} from "@/db/schema";

export type { ProductSpecRow, TechnicalTableRow };

export type ProductRelationRow = { relatedProductId: string; relationType: string; sortOrder: number };
export type ProductPostRelationRow = { postId: string; sortOrder: number };

export type ProductPayload = {
  specifications: ProductSpecRow[];
  features: {
    title: string;
    description: string;
    iconMediaId: string | null;
    imageMediaId: string | null;
    sortOrder: number;
  }[];
  applications: { title: string; description: string; imageMediaId: string | null; sortOrder: number }[];
  documents: {
    title: string;
    mediaId: string | null;
    documentType: string;
    description: string;
    version: string;
    documentDate: string | null;
    sortOrder: number;
  }[];
  options: {
    optionName: string;
    optionValue: string;
    description: string;
    imageMediaId: string | null;
    sortOrder: number;
  }[];
  technicalTables: TechnicalTableRow[];
  relatedProducts: ProductRelationRow[];
  relatedPosts: ProductPostRelationRow[];
  galleryMediaIds: string[];
  applicationImageIds: string[];
  sections: PageSectionPayload[];
  faqs: FaqPayload[];
  contentTables: ContentTablePayload[];
};

async function loadProductPostRelations(productId: string) {
  const db = getDb();
  try {
    return await db
      .select()
      .from(productPostRelations)
      .where(eq(productPostRelations.productId, productId))
      .orderBy(asc(productPostRelations.sortOrder));
  } catch (error) {
    // Keep older deployments renderable until the additive relation migration
    // has been applied. The product page will continue using its legacy/latest
    // blog fallback in that case.
    if (classifyDatabaseError(error).reason === "schema") return [];
    throw error;
  }
}

export type PageSectionPayload = {
  id?: string;
  sectionType: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  description: string;
  imageId: string | null;
  backgroundImageId: string | null;
  mobileImageId: string | null;
  buttonText: string;
  buttonUrl: string;
  secondaryButtonText: string;
  secondaryButtonUrl: string;
  alignment: string;
  layout: string;
  background: string;
  customData: Record<string, unknown>;
  sortOrder: number;
  isActive: boolean;
};

export type FaqPayload = { question: string; answer: string; sortOrder: number; isActive: boolean };
export type ContentTablePayload = {
  title: string;
  headers: string[];
  rows: string[][];
  caption: string;
  responsiveMode: string;
  sortOrder: number;
};

export async function loadProductCategoryIds(productId: string) {
  const db = getDb();
  try {
    const rows = await db
      .select({ categoryId: productCategoryAssignments.categoryId })
      .from(productCategoryAssignments)
      .where(eq(productCategoryAssignments.productId, productId))
      .orderBy(asc(productCategoryAssignments.sortOrder));
    return rows.map((row) => row.categoryId);
  } catch (error) {
    // Existing deployments can keep editing products before the optional
    // category-assignment migration has been run.
    if (classifyDatabaseError(error).reason === "schema") return [];
    throw error;
  }
}

export async function saveProductCategoryAssignments(
  tx: Pick<ReturnType<typeof getDb>, "delete" | "insert" | "execute">,
  productId: string,
  categoryIds: string[],
) {
  const ids = [...new Set(categoryIds.filter(Boolean))];
  const [table] = await tx.execute<{ tableName: string | null }>(
    sql`select to_regclass('public.product_category_assignments') as "tableName"`,
  );
  if (!table?.tableName) return;

  await tx
    .delete(productCategoryAssignments)
    .where(eq(productCategoryAssignments.productId, productId));
  if (ids.length) {
    await tx.insert(productCategoryAssignments).values(
      ids.map((categoryId, sortOrder) => ({ productId, categoryId, sortOrder })),
    );
  }
}

export async function loadContentFaqs(
  entityKind: "product" | "category" | "page" | "post",
  entityId: string,
): Promise<FaqPayload[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(contentFaqs)
    .where(
      and(
        eq(contentFaqs.entityKind, entityKind),
        eq(contentFaqs.entityId, entityId),
      ),
    )
    .orderBy(asc(contentFaqs.sortOrder));

  return rows.map((row, sortOrder) => ({
    question: row.question,
    answer: row.answer,
    sortOrder,
    isActive: row.isActive,
  }));
}

export async function saveContentFaqs(
  tx: Pick<ReturnType<typeof getDb>, "delete" | "insert">,
  entityKind: "product" | "category" | "page" | "post",
  entityId: string,
  faqs: FaqPayload[],
) {
  await tx
    .delete(contentFaqs)
    .where(
      and(
        eq(contentFaqs.entityKind, entityKind),
        eq(contentFaqs.entityId, entityId),
      ),
    );
  const valid = faqs.filter(
    (row) => row.question.trim() || row.answer.trim(),
  );
  if (valid.length) {
    await tx.insert(contentFaqs).values(
      valid.map((row, sortOrder) => ({
        entityKind,
        entityId,
        question: row.question.trim(),
        answer: row.answer.trim(),
        sortOrder,
        isActive: row.isActive,
      })),
    );
  }
}

export async function loadProductPayload(productId: string): Promise<ProductPayload> {
  const db = getDb();
  const [
    specifications,
    features,
    applications,
    documents,
    options,
    technicalTables,
    related,
    relatedPosts,
    images,
    sections,
    faqs,
    tables,
  ] = await Promise.all([
    db
      .select()
      .from(productSpecifications)
      .where(eq(productSpecifications.productId, productId))
      .orderBy(asc(productSpecifications.sortOrder)),
    db.select().from(productFeatures).where(eq(productFeatures.productId, productId)).orderBy(asc(productFeatures.sortOrder)),
    db
      .select()
      .from(productApplications)
      .where(eq(productApplications.productId, productId))
      .orderBy(asc(productApplications.sortOrder)),
    db.select().from(productDocuments).where(eq(productDocuments.productId, productId)).orderBy(asc(productDocuments.sortOrder)),
    db.select().from(productOptions).where(eq(productOptions.productId, productId)).orderBy(asc(productOptions.sortOrder)),
    db
      .select()
      .from(productTechnicalTables)
      .where(eq(productTechnicalTables.productId, productId))
      .orderBy(asc(productTechnicalTables.sortOrder)),
    db.select().from(productRelations).where(eq(productRelations.productId, productId)).orderBy(asc(productRelations.sortOrder)),
    loadProductPostRelations(productId),
    db.select().from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.sortOrder)),
    db.select().from(pageSections).where(eq(pageSections.productId, productId)).orderBy(asc(pageSections.sortOrder)),
    db
      .select()
      .from(contentFaqs)
      .where(and(eq(contentFaqs.entityKind, "product"), eq(contentFaqs.entityId, productId)))
      .orderBy(asc(contentFaqs.sortOrder)),
    db
      .select()
      .from(contentTables)
      .where(and(eq(contentTables.entityKind, "product"), eq(contentTables.entityId, productId)))
      .orderBy(asc(contentTables.sortOrder)),
  ]);

  return {
    specifications: specifications.map((row) => ({
      label: row.label,
      value: row.value,
      unit: row.unit || undefined,
      group: row.group || undefined,
    })),
    features: features.map((row, sortOrder) => ({
      title: row.title,
      description: row.description,
      iconMediaId: row.iconMediaId,
      imageMediaId: row.imageMediaId,
      sortOrder,
    })),
    applications: applications.map((row, sortOrder) => ({
      title: row.title,
      description: row.description,
      imageMediaId: row.imageMediaId,
      sortOrder,
    })),
    documents: documents.map((row, sortOrder) => ({
      title: row.title,
      mediaId: row.mediaId,
      documentType: row.documentType,
      description: row.description,
      version: row.version,
      documentDate: row.documentDate ? row.documentDate.toISOString() : null,
      sortOrder,
    })),
    options: options.map((row, sortOrder) => ({
      optionName: row.optionName,
      optionValue: row.optionValue,
      description: row.description,
      imageMediaId: row.imageMediaId,
      sortOrder,
    })),
    technicalTables: technicalTables.map((row, sortOrder) => ({
      tableTitle: row.tableTitle,
      columns: row.columns ?? [],
      rows: row.rows ?? [],
      sortOrder,
    })),
    relatedProducts: related.map((row, sortOrder) => ({
      relatedProductId: row.relatedProductId,
      relationType: row.relationType,
      sortOrder,
    })),
    relatedPosts: relatedPosts.map((row, sortOrder) => ({
      postId: row.postId,
      sortOrder,
    })),
    galleryMediaIds: images.map((row) => row.mediaId),
    applicationImageIds: [],
    sections: sections.map((row, sortOrder) => ({
      id: row.id,
      sectionType: row.sectionType,
      title: row.title,
      subtitle: row.subtitle,
      eyebrow: row.eyebrow,
      description: row.description,
      imageId: row.imageId,
      backgroundImageId: row.backgroundImageId,
      mobileImageId: row.mobileImageId,
      buttonText: row.buttonText,
      buttonUrl: row.buttonUrl,
      secondaryButtonText: row.secondaryButtonText,
      secondaryButtonUrl: row.secondaryButtonUrl,
      alignment: row.alignment,
      layout: row.layout,
      background: row.background,
      customData: (row.customData as Record<string, unknown>) ?? {},
      sortOrder,
      isActive: row.isActive,
    })),
    faqs: faqs.map((row, sortOrder) => ({
      question: row.question,
      answer: row.answer,
      sortOrder,
      isActive: row.isActive,
    })),
    contentTables: tables.map((row, sortOrder) => ({
      title: row.title,
      headers: row.headers ?? [],
      rows: row.rows ?? [],
      caption: row.caption,
      responsiveMode: row.responsiveMode,
      sortOrder,
    })),
  };
}

export async function saveProductPayload(
  tx: Pick<ReturnType<typeof getDb>, "delete" | "insert" | "execute">,
  productId: string,
  payload: ProductPayload,
) {
  await tx.delete(productSpecifications).where(eq(productSpecifications.productId, productId));
  const specs = payload.specifications.filter((row) => row.label.trim() || row.value.trim());
  if (specs.length) {
    await tx.insert(productSpecifications).values(
      specs.map((row, sortOrder) => ({
        productId,
        label: row.label,
        value: row.value,
        unit: row.unit ?? "",
        group: row.group ?? "",
        sortOrder,
      })),
    );
  }

  await tx.delete(productFeatures).where(eq(productFeatures.productId, productId));
  if (payload.features.length) {
    await tx.insert(productFeatures).values(
      payload.features.map((row, sortOrder) => ({
        productId,
        title: row.title,
        description: row.description,
        iconMediaId: row.iconMediaId,
        imageMediaId: row.imageMediaId,
        sortOrder,
      })),
    );
  }

  await tx.delete(productApplications).where(eq(productApplications.productId, productId));
  if (payload.applications.length) {
    await tx.insert(productApplications).values(
      payload.applications.map((row, sortOrder) => ({
        productId,
        title: row.title,
        description: row.description,
        imageMediaId: row.imageMediaId,
        sortOrder,
      })),
    );
  }

  await tx.delete(productDocuments).where(eq(productDocuments.productId, productId));
  if (payload.documents.length) {
    await tx.insert(productDocuments).values(
      payload.documents.map((row, sortOrder) => ({
        productId,
        title: row.title,
        mediaId: row.mediaId,
        documentType: row.documentType as "datasheet" | "brochure" | "catalogue" | "manual" | "technical_drawing" | "certificate" | "other",
        description: row.description,
        version: row.version,
        documentDate: row.documentDate ? new Date(row.documentDate) : null,
        sortOrder,
      })),
    );
  }

  await tx.delete(productOptions).where(eq(productOptions.productId, productId));
  if (payload.options.length) {
    await tx.insert(productOptions).values(
      payload.options.map((row, sortOrder) => ({
        productId,
        optionName: row.optionName,
        optionValue: row.optionValue,
        description: row.description,
        imageMediaId: row.imageMediaId,
        sortOrder,
      })),
    );
  }

  await tx.delete(productTechnicalTables).where(eq(productTechnicalTables.productId, productId));
  if (payload.technicalTables.length) {
    await tx.insert(productTechnicalTables).values(
      payload.technicalTables.map((row, sortOrder) => ({
        productId,
        tableTitle: row.tableTitle,
        columns: row.columns,
        rows: row.rows,
        sortOrder,
      })),
    );
  }

  await tx.delete(productRelations).where(eq(productRelations.productId, productId));
  const related = payload.relatedProducts.filter((row) => row.relatedProductId && row.relatedProductId !== productId);
  if (related.length) {
    await tx.insert(productRelations).values(
      related.map((row, sortOrder) => ({
        productId,
        relatedProductId: row.relatedProductId,
        relationType: row.relationType || "related",
        sortOrder,
      })),
    );
  }

  const [postRelationTable] = await tx.execute<{ tableName: string | null }>(
    sql`select to_regclass('public.product_post_relations') as "tableName"`,
  );
  if (postRelationTable?.tableName) {
    await tx
      .delete(productPostRelations)
      .where(eq(productPostRelations.productId, productId));
    const relatedPosts = [
      ...new Set(payload.relatedPosts.map((row) => row.postId).filter(Boolean)),
    ];
    if (relatedPosts.length) {
      await tx.insert(productPostRelations).values(
        relatedPosts.map((postId, sortOrder) => ({ productId, postId, sortOrder })),
      );
    }
  }

  const gallery = [...new Set(payload.galleryMediaIds.filter(Boolean))];
  await tx.delete(productImages).where(eq(productImages.productId, productId));
  if (gallery.length) {
    await tx.insert(productImages).values(gallery.map((mediaId, sortOrder) => ({ productId, mediaId, sortOrder })));
  }

  await tx.delete(pageSections).where(eq(pageSections.productId, productId));
  if (payload.sections.length) {
    await tx.insert(pageSections).values(
      payload.sections.map((row, sortOrder) => ({
        productId,
        sectionType: row.sectionType as typeof pageSections.$inferInsert.sectionType,
        title: row.title,
        subtitle: row.subtitle,
        eyebrow: row.eyebrow,
        description: row.description,
        imageId: row.imageId,
        backgroundImageId: row.backgroundImageId,
        mobileImageId: row.mobileImageId,
        buttonText: row.buttonText,
        buttonUrl: row.buttonUrl,
        secondaryButtonText: row.secondaryButtonText,
        secondaryButtonUrl: row.secondaryButtonUrl,
        alignment: row.alignment,
        layout: row.layout,
        background: row.background,
        customData: row.customData,
        sortOrder,
        isActive: row.isActive,
      })),
    );
  }

  await tx.delete(contentFaqs).where(and(eq(contentFaqs.entityKind, "product"), eq(contentFaqs.entityId, productId)));
  if (payload.faqs.length) {
    await tx.insert(contentFaqs).values(
      payload.faqs.map((row, sortOrder) => ({
        entityKind: "product" as const,
        entityId: productId,
        question: row.question,
        answer: row.answer,
        sortOrder,
        isActive: row.isActive,
      })),
    );
  }

  await tx.delete(contentTables).where(and(eq(contentTables.entityKind, "product"), eq(contentTables.entityId, productId)));
  if (payload.contentTables.length) {
    await tx.insert(contentTables).values(
      payload.contentTables.map((row, sortOrder) => ({
        entityKind: "product" as const,
        entityId: productId,
        title: row.title,
        headers: row.headers,
        rows: row.rows,
        caption: row.caption,
        responsiveMode: row.responsiveMode,
        sortOrder,
      })),
    );
  }
}

export async function loadPageSections(pageId: string) {
  const db = getDb();
  const rows = await db.select().from(pageSections).where(eq(pageSections.pageId, pageId)).orderBy(asc(pageSections.sortOrder));
  return rows.map((row, sortOrder) => ({
    id: row.id,
    sectionType: row.sectionType,
    title: row.title,
    subtitle: row.subtitle,
    eyebrow: row.eyebrow,
    description: row.description,
    imageId: row.imageId,
    backgroundImageId: row.backgroundImageId,
    mobileImageId: row.mobileImageId,
    buttonText: row.buttonText,
    buttonUrl: row.buttonUrl,
    secondaryButtonText: row.secondaryButtonText,
    secondaryButtonUrl: row.secondaryButtonUrl,
    alignment: row.alignment,
    layout: row.layout,
    background: row.background,
    customData: (row.customData as Record<string, unknown>) ?? {},
    sortOrder,
    isActive: row.isActive,
  })) satisfies PageSectionPayload[];
}

export async function savePageSections(
  tx: Pick<ReturnType<typeof getDb>, "delete" | "insert">,
  pageId: string,
  sections: PageSectionPayload[],
) {
  await tx.delete(pageSections).where(eq(pageSections.pageId, pageId));
  if (!sections.length) return;
  await tx.insert(pageSections).values(
    sections.map((row, sortOrder) => ({
      pageId,
      sectionType: row.sectionType as typeof pageSections.$inferInsert.sectionType,
      title: row.title,
      subtitle: row.subtitle,
      eyebrow: row.eyebrow,
      description: row.description,
      imageId: row.imageId,
      backgroundImageId: row.backgroundImageId,
      mobileImageId: row.mobileImageId,
      buttonText: row.buttonText,
      buttonUrl: row.buttonUrl,
      secondaryButtonText: row.secondaryButtonText,
      secondaryButtonUrl: row.secondaryButtonUrl,
      alignment: row.alignment,
      layout: row.layout,
      background: row.background,
      customData: row.customData,
      sortOrder,
      isActive: row.isActive,
    })),
  );
}

export async function loadCategoryRelated(categoryId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(categoryRelatedCategories)
    .where(eq(categoryRelatedCategories.categoryId, categoryId))
    .orderBy(asc(categoryRelatedCategories.sortOrder));
  return rows.map((row) => row.relatedCategoryId);
}

export async function saveCategoryRelated(
  tx: Pick<ReturnType<typeof getDb>, "delete" | "insert">,
  categoryId: string,
  relatedCategoryIds: string[],
) {
  await tx.delete(categoryRelatedCategories).where(eq(categoryRelatedCategories.categoryId, categoryId));
  const ids = [...new Set(relatedCategoryIds.filter((id) => id && id !== categoryId))];
  if (!ids.length) return;
  await tx.insert(categoryRelatedCategories).values(ids.map((relatedCategoryId, sortOrder) => ({ categoryId, relatedCategoryId, sortOrder })));
}

export async function loadPostTagIds(postId: string) {
  const db = getDb();
  const rows = await db.select().from(postTags).where(eq(postTags.postId, postId));
  return rows.map((row) => row.tagId);
}

export async function savePostTags(tx: Pick<ReturnType<typeof getDb>, "delete" | "insert">, postId: string, tagIds: string[]) {
  await tx.delete(postTags).where(eq(postTags.postId, postId));
  const ids = [...new Set(tagIds.filter(Boolean))];
  if (!ids.length) return;
  await tx.insert(postTags).values(ids.map((tagId) => ({ postId, tagId })));
}
