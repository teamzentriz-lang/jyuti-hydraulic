import { z } from "zod";
import { CmsError } from "@/db/errors";

const slug = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const pathValue = z
  .string()
  .trim()
  .min(1)
  .max(400)
  .regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/);

const optionalUuid = z
  .string()
  .nullable()
  .transform((value, ctx) => {
    if (!value) return null;
    const parsed = z.uuid().safeParse(value);
    if (!parsed.success) {
      ctx.addIssue({ code: "custom", message: "Choose a valid file." });
      return z.NEVER;
    }
    return parsed.data;
  });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value ? value : null));

const richText = z.string().max(500_000);

export const productScalarsSchema = z.object({
  title: z.string().trim().min(1).max(300),
  slug,
  path: pathValue,
  categoryId: optionalUuid,
  subCategoryId: optionalUuid,
  sku: optionalText(120),
  productCode: optionalText(120),
  brand: optionalText(160),
  modelNumber: optionalText(160),
  summary: z.string().trim().max(2000),
  body: richText,
  richContent: richText,
  overview: richText,
  featuresText: richText,
  benefits: richText,
  advantages: richText,
  applicationsText: richText,
  workingPrinciple: richText,
  construction: richText,
  material: richText,
  manufacturingDetails: richText,
  qualityInformation: richText,
  maintenanceInformation: richText,
  safetyInformation: richText,
  customizationInformation: richText,
  featuredImageId: optionalUuid,
  thumbnailId: optionalUuid,
  diagramImageId: optionalUuid,
  technicalDrawingId: optionalUuid,
  dimensionDrawingId: optionalUuid,
  installationImageId: optionalUuid,
  brochureMediaId: optionalUuid,
  price: optionalText(80),
  stock: optionalText(80),
  sortOrder: z.coerce.number().int().min(0).max(100000),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  enquiryEnabled: z.boolean(),
  enquiryButtonText: optionalText(120),
  enquiryEmail: z.union([z.email(), z.literal("")]).nullable(),
  seoTitle: optionalText(300),
  seoDescription: optionalText(500),
  focusKeyword: optionalText(200),
  canonicalUrl: optionalText(500),
  robotsIndex: z.boolean(),
  robotsFollow: z.boolean(),
  ogTitle: optionalText(300),
  ogDescription: optionalText(500),
  ogImageId: optionalUuid,
  status: z.enum(["draft", "published"]),
});

export function readProductScalars(formData: FormData) {
  const text = (name: string) => String(formData.get(name) ?? "");
  const raw = {
    title: text("title"),
    slug: text("slug"),
    path: text("path"),
    categoryId: text("categoryId") || null,
    subCategoryId: text("subCategoryId") || null,
    sku: text("sku") || null,
    productCode: text("productCode") || null,
    brand: text("brand") || null,
    modelNumber: text("modelNumber") || null,
    summary: text("summary"),
    body: text("body"),
    richContent: text("richContent"),
    overview: text("overview"),
    featuresText: text("featuresText"),
    benefits: text("benefits"),
    advantages: text("advantages"),
    applicationsText: text("applicationsText"),
    workingPrinciple: text("workingPrinciple"),
    construction: text("construction"),
    material: text("material"),
    manufacturingDetails: text("manufacturingDetails"),
    qualityInformation: text("qualityInformation"),
    maintenanceInformation: text("maintenanceInformation"),
    safetyInformation: text("safetyInformation"),
    customizationInformation: text("customizationInformation"),
    featuredImageId: text("featuredImageId") || null,
    thumbnailId: text("thumbnailId") || null,
    diagramImageId: text("diagramImageId") || null,
    technicalDrawingId: text("technicalDrawingId") || null,
    dimensionDrawingId: text("dimensionDrawingId") || null,
    installationImageId: text("installationImageId") || null,
    brochureMediaId: text("brochureMediaId") || null,
    price: text("price") || null,
    stock: text("stock") || null,
    sortOrder: text("sortOrder") || "0",
    isFeatured: formData.get("isFeatured") === "on",
    isActive: formData.get("isActive") === "on",
    enquiryEnabled: formData.get("enquiryEnabled") === "on",
    enquiryButtonText: text("enquiryButtonText") || null,
    enquiryEmail: text("enquiryEmail") || null,
    seoTitle: text("seoTitle") || null,
    seoDescription: text("seoDescription") || null,
    focusKeyword: text("focusKeyword") || null,
    canonicalUrl: text("canonicalUrl") || null,
    robotsIndex: formData.get("robotsIndex") === "on",
    robotsFollow: formData.get("robotsFollow") === "on",
    ogTitle: text("ogTitle") || null,
    ogDescription: text("ogDescription") || null,
    ogImageId: text("ogImageId") || null,
    status: text("status") || "draft",
  };
  const parsed = productScalarsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CmsError(parsed.error.issues[0]?.message ?? "Check the product form.");
  }
  const data = parsed.data;
  return {
    ...data,
    enquiryEmail: data.enquiryEmail || null,
  };
}
