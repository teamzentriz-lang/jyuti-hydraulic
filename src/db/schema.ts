import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export type SpecRow = { label: string; value: string; unit?: string; group?: string };
export type WhyItem = { title: string; body: string };
export type ClientItem = { name: string; logo: string };

export const userRole = pgEnum("user_role", ["admin", "editor"]);
export const publishStatus = pgEnum("publish_status", ["draft", "published"]);
export const inquiryStatus = pgEnum("inquiry_status", [
  "new",
  "read",
  "archived",
  "contacted",
  "in_progress",
  "converted",
  "closed",
  "spam",
]);
export const inquirySource = pgEnum("inquiry_source", ["contact", "quote", "product"]);
export const navLocation = pgEnum("nav_location", ["header", "footer", "products"]);
export const storageDriver = pgEnum("storage_driver", ["local", "r2"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("editor"),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const media = pgTable(
  "media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    filename: text("filename").notNull(),
    alt: text("alt").notNull().default(""),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    width: integer("width"),
    height: integer("height"),
    storageDriver: storageDriver("storage_driver").notNull().default("local"),
    storageKey: text("storage_key").notNull().unique(),
    url: text("url").notNull(),
    legacyUrl: text("legacy_url").unique(),
    originalName: text("original_name"),
    title: text("title").notNull().default(""),
    caption: text("caption").notNull().default(""),
    description: text("description").notNull().default(""),
    folder: text("folder").notNull().default(""),
    uploadedById: uuid("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("media_filename_idx").on(t.filename), index("media_folder_idx").on(t.folder)],
);

export const siteSettings = pgTable(
  "site_settings",
  {
    id: text("id").primaryKey().default("default"),
    companyName: text("company_name").notNull().default(""),
    siteName: text("site_name").notNull().default(""),
    logoId: uuid("logo_id").references(() => media.id, { onDelete: "restrict" }),
    faviconId: uuid("favicon_id").references(() => media.id, { onDelete: "restrict" }),
    tagline: text("tagline").notNull().default(""),
    shortDescription: text("short_description").notNull().default(""),
    longDescription: text("long_description").notNull().default(""),
    phonePrimary: text("phone_primary").notNull().default(""),
    phoneSecondary: text("phone_secondary"),
    emailPrimary: text("email_primary").notNull().default(""),
    emailSecondary: text("email_secondary"),
    enquiryToEmail: text("enquiry_to_email").notNull().default(""),
    address: text("address").notNull().default(""),
    addressLine1: text("address_line1").notNull().default(""),
    addressLine2: text("address_line2").notNull().default(""),
    city: text("city").notNull().default(""),
    state: text("state").notNull().default(""),
    country: text("country").notNull().default(""),
    pincode: text("pincode").notNull().default(""),
    whatsapp: text("whatsapp"),
    youtubeUrl: text("youtube_url"),
    facebookUrl: text("facebook_url"),
    instagramUrl: text("instagram_url"),
    linkedinUrl: text("linkedin_url"),
    twitterUrl: text("twitter_url"),
    catalogueId: uuid("catalogue_id").references(() => media.id, { onDelete: "restrict" }),
    footerText: text("footer_text").notNull().default(""),
    footerDescription: text("footer_description").notNull().default(""),
    copyrightText: text("copyright_text").notNull().default(""),
    mapUrl: text("map_url"),
    mapEmbedUrl: text("map_embed_url"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    establishedYear: integer("established_year"),
    businessDescription: text("business_description").notNull().default(""),
    shippingInformation: text("shipping_information").notNull().default(""),
    serviceArea: text("service_area").notNull().default(""),
    gtranslateEnabled: boolean("gtranslate_enabled").notNull().default(false),
    quoteCtaLabel: text("quote_cta_label").notNull().default(""),
    quoteCtaHref: text("quote_cta_href").notNull().default("/contact/"),
    enquiryButtonText: text("enquiry_button_text").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [check("site_settings_singleton", sql`${t.id} = 'default'`)],
);

export const homeContent = pgTable(
  "home_content",
  {
    id: text("id").primaryKey().default("default"),
    heroEyebrow: text("hero_eyebrow").notNull().default("About us"),
    heroHeadline: text("hero_headline").notNull().default(""),
    heroSubcopy: text("hero_subcopy").notNull().default(""),
    aboutTitle: text("about_title").notNull().default("Welcome to Jyoti Hydraulic"),
    aboutBody: text("about_body").notNull().default(""),
    aboutMediaId: uuid("about_media_id").references(() => media.id, { onDelete: "restrict" }),
    aboutPillars: jsonb("about_pillars").$type<WhyItem[]>().notNull().default(sql`'[]'::jsonb`),
    showcaseCategoryPaths: jsonb("showcase_category_paths").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    whyChooseTitle: text("why_choose_title").notNull().default(""),
    whyChooseIntro: text("why_choose_intro").notNull().default(""),
    whyChooseUs: jsonb("why_choose_us").$type<WhyItem[]>().notNull().default(sql`'[]'::jsonb`),
    visionTitle: text("vision_title").notNull().default("Vision"),
    visionBody: text("vision_body").notNull().default(""),
    missionTitle: text("mission_title").notNull().default("Mission"),
    missionBody: text("mission_body").notNull().default(""),
    clientLogos: jsonb("client_logos").$type<ClientItem[]>().notNull().default(sql`'[]'::jsonb`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [check("home_content_singleton", sql`${t.id} = 'default'`)],
);

export const homeHeroImages = pgTable(
  "home_hero_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("home_hero_images_order_idx").on(t.sortOrder)],
);

export const navLinks = pgTable(
  "nav_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    location: navLocation("location").notNull(),
    label: text("label").notNull(),
    href: text("href").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => navLinks.id, { onDelete: "set null" }),
    itemSlug: text("item_slug"),
    itemType: text("item_type").notNull().default("custom_url"),
    referenceId: uuid("reference_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    openInNewTab: boolean("open_in_new_tab").notNull().default(false),
    legacyId: integer("legacy_id"),
    ...timestamps,
  },
  (t) => [index("nav_links_location_idx").on(t.location, t.sortOrder)],
);

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    path: text("path").notNull(),
    pageType: text("page_type").notNull().default("custom"),
    heroMediaId: uuid("hero_media_id").references(() => media.id, { onDelete: "restrict" }),
    featuredImageId: uuid("featured_image_id").references(() => media.id, { onDelete: "restrict" }),
    excerpt: text("excerpt").notNull().default(""),
    shortDescription: text("short_description").notNull().default(""),
    body: text("body").notNull().default(""),
    customContent: jsonb("custom_content").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    breadcrumbsEnabled: boolean("breadcrumbs_enabled").notNull().default(true),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    focusKeyword: text("focus_keyword"),
    canonicalUrl: text("canonical_url"),
    robotsIndex: boolean("robots_index").notNull().default(true),
    robotsFollow: boolean("robots_follow").notNull().default(true),
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImageId: uuid("og_image_id").references(() => media.id, { onDelete: "restrict" }),
    twitterTitle: text("twitter_title"),
    twitterDescription: text("twitter_description"),
    twitterImageId: uuid("twitter_image_id").references(() => media.id, { onDelete: "restrict" }),
    schemaType: text("schema_type"),
    status: publishStatus("status").notNull().default("draft"),
    legacyId: integer("legacy_id"),
    legacySlug: text("legacy_slug"),
    legacyUrl: text("legacy_url"),
    legacyType: text("legacy_type"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("pages_slug_unique").on(t.slug),
    uniqueIndex("pages_path_unique").on(t.path),
    uniqueIndex("pages_legacy_id_unique").on(t.legacyId),
  ],
);

export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    path: text("path").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => productCategories.id, {
      onDelete: "set null",
    }),
    summary: text("summary").notNull().default(""),
    body: text("body").notNull().default(""),
    imageId: uuid("image_id").references(() => media.id, { onDelete: "restrict" }),
    bannerImageId: uuid("banner_image_id").references(() => media.id, { onDelete: "restrict" }),
    thumbnailId: uuid("thumbnail_id").references(() => media.id, { onDelete: "restrict" }),
    iconId: uuid("icon_id").references(() => media.id, { onDelete: "restrict" }),
    isFeatured: boolean("is_featured").notNull().default(false),
    showInMenu: boolean("show_in_menu").notNull().default(true),
    showOnHomepage: boolean("show_on_homepage").notNull().default(false),
    listingConfig: jsonb("listing_config").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    breadcrumbsEnabled: boolean("breadcrumbs_enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    focusKeyword: text("focus_keyword"),
    canonicalUrl: text("canonical_url"),
    ogImageId: uuid("og_image_id").references(() => media.id, { onDelete: "restrict" }),
    robotsIndex: boolean("robots_index").notNull().default(true),
    robotsFollow: boolean("robots_follow").notNull().default(true),
    status: publishStatus("status").notNull().default("draft"),
    legacyId: integer("legacy_id"),
    legacySlug: text("legacy_slug"),
    legacyUrl: text("legacy_url"),
    legacyType: text("legacy_type"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("product_categories_path_unique").on(t.path),
    uniqueIndex("product_categories_legacy_id_unique").on(t.legacyId),
    index("product_categories_parent_idx").on(t.parentId),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    path: text("path").notNull(),
    categoryId: uuid("category_id").references(() => productCategories.id, { onDelete: "restrict" }),
    subCategoryId: uuid("sub_category_id").references(() => productCategories.id, { onDelete: "set null" }),
    sku: text("sku"),
    productCode: text("product_code"),
    brand: text("brand"),
    modelNumber: text("model_number"),
    summary: text("summary").notNull().default(""),
    body: text("body").notNull().default(""),
    richContent: text("rich_content").notNull().default(""),
    overview: text("overview").notNull().default(""),
    featuresText: text("features_text").notNull().default(""),
    benefits: text("benefits").notNull().default(""),
    advantages: text("advantages").notNull().default(""),
    applicationsText: text("applications_text").notNull().default(""),
    workingPrinciple: text("working_principle").notNull().default(""),
    construction: text("construction").notNull().default(""),
    material: text("material").notNull().default(""),
    manufacturingDetails: text("manufacturing_details").notNull().default(""),
    qualityInformation: text("quality_information").notNull().default(""),
    maintenanceInformation: text("maintenance_information").notNull().default(""),
    safetyInformation: text("safety_information").notNull().default(""),
    customizationInformation: text("customization_information").notNull().default(""),
    specs: jsonb("specs").$type<SpecRow[]>().notNull().default(sql`'[]'::jsonb`),
    featuredImageId: uuid("featured_image_id").references(() => media.id, { onDelete: "restrict" }),
    thumbnailId: uuid("thumbnail_id").references(() => media.id, { onDelete: "restrict" }),
    diagramImageId: uuid("diagram_image_id").references(() => media.id, { onDelete: "restrict" }),
    technicalDrawingId: uuid("technical_drawing_id").references(() => media.id, { onDelete: "restrict" }),
    dimensionDrawingId: uuid("dimension_drawing_id").references(() => media.id, { onDelete: "restrict" }),
    installationImageId: uuid("installation_image_id").references(() => media.id, { onDelete: "restrict" }),
    brochureMediaId: uuid("brochure_media_id").references(() => media.id, { onDelete: "restrict" }),
    price: text("price"),
    stock: text("stock"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    enquiryEnabled: boolean("enquiry_enabled").notNull().default(true),
    enquiryButtonText: text("enquiry_button_text"),
    enquiryFormId: uuid("enquiry_form_id"),
    enquiryEmail: text("enquiry_email"),
    breadcrumbsEnabled: boolean("breadcrumbs_enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    focusKeyword: text("focus_keyword"),
    canonicalUrl: text("canonical_url"),
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImageId: uuid("og_image_id").references(() => media.id, { onDelete: "restrict" }),
    twitterTitle: text("twitter_title"),
    twitterDescription: text("twitter_description"),
    twitterImageId: uuid("twitter_image_id").references(() => media.id, { onDelete: "restrict" }),
    robotsIndex: boolean("robots_index").notNull().default(true),
    robotsFollow: boolean("robots_follow").notNull().default(true),
    status: publishStatus("status").notNull().default("draft"),
    legacyId: integer("legacy_id"),
    legacySlug: text("legacy_slug"),
    legacyUrl: text("legacy_url"),
    legacyType: text("legacy_type"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("products_path_unique").on(t.path),
    uniqueIndex("products_legacy_id_unique").on(t.legacyId),
    index("products_category_idx").on(t.categoryId),
    index("products_status_idx").on(t.status),
  ],
);

export const homeFeaturedProducts = pgTable(
  "home_featured_products",
  {
    productId: uuid("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("home_featured_products_order_idx").on(t.sortOrder)],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    uniqueIndex("product_images_unique").on(t.productId, t.mediaId),
    index("product_images_order_idx").on(t.productId, t.sortOrder),
  ],
);

export const productRelations = pgTable(
  "product_relations",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    relatedProductId: uuid("related_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull().default("related"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.relatedProductId] }),
    check("product_relations_not_self", sql`${t.productId} <> ${t.relatedProductId}`),
  ],
);

export const locationPages = pgTable(
  "location_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    path: text("path").notNull(),
    locationName: text("location_name").notNull(),
    region: text("region").notNull().default(""),
    categoryId: uuid("category_id").references(() => productCategories.id, { onDelete: "set null" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    body: text("body").notNull().default(""),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    status: publishStatus("status").notNull().default("draft"),
    legacyId: integer("legacy_id"),
    legacyUrl: text("legacy_url"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("location_pages_slug_unique").on(t.slug),
    uniqueIndex("location_pages_path_unique").on(t.path),
    uniqueIndex("location_pages_legacy_id_unique").on(t.legacyId),
    index("location_pages_region_idx").on(t.region),
  ],
);

export const exportPages = pgTable(
  "export_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    path: text("path").notNull(),
    country: text("country").notNull(),
    productLine: text("product_line").notNull().default(""),
    categoryId: uuid("category_id").references(() => productCategories.id, { onDelete: "set null" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    body: text("body").notNull().default(""),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    status: publishStatus("status").notNull().default("draft"),
    legacyId: integer("legacy_id"),
    legacyUrl: text("legacy_url"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("export_pages_slug_unique").on(t.slug),
    uniqueIndex("export_pages_path_unique").on(t.path),
    uniqueIndex("export_pages_legacy_id_unique").on(t.legacyId),
    index("export_pages_country_idx").on(t.country),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    path: text("path").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    coverMediaId: uuid("cover_media_id").references(() => media.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id"),
    author: text("author").notNull().default(""),
    excerpt: text("excerpt").notNull().default(""),
    body: text("body").notNull().default(""),
    readingTime: integer("reading_time"),
    featured: boolean("featured").notNull().default(false),
    allowComments: boolean("allow_comments").notNull().default(false),
    breadcrumbsEnabled: boolean("breadcrumbs_enabled").notNull().default(true),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    focusKeyword: text("focus_keyword"),
    canonicalUrl: text("canonical_url"),
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImageId: uuid("og_image_id").references(() => media.id, { onDelete: "restrict" }),
    twitterImageId: uuid("twitter_image_id").references(() => media.id, { onDelete: "restrict" }),
    robotsIndex: boolean("robots_index").notNull().default(true),
    robotsFollow: boolean("robots_follow").notNull().default(true),
    status: publishStatus("status").notNull().default("draft"),
    legacyId: integer("legacy_id"),
    legacySlug: text("legacy_slug"),
    legacyUrl: text("legacy_url"),
    legacyType: text("legacy_type"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("posts_slug_unique").on(t.slug),
    uniqueIndex("posts_path_unique").on(t.path),
    uniqueIndex("posts_legacy_id_unique").on(t.legacyId),
    index("posts_published_idx").on(t.status, t.publishedAt),
  ],
);

export const galleryItems = pgTable(
  "gallery_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull().default(""),
    caption: text("caption").notNull().default(""),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("gallery_items_order_idx").on(t.sortOrder)],
);

export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull().default(""),
    caption: text("caption").notNull().default(""),
    certificateNumber: text("certificate_number").notNull().default(""),
    issuingAuthority: text("issuing_authority").notNull().default(""),
    certificateType: text("certificate_type").notNull().default(""),
    issueDate: timestamp("issue_date", { withTimezone: true }),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),
    description: text("description").notNull().default(""),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    documentId: uuid("document_id").references(() => media.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("published"),
    sortOrder: integer("sort_order").notNull().default(0),
    legacyId: integer("legacy_id"),
    legacyUrl: text("legacy_url"),
    ...timestamps,
  },
  (t) => [index("certificates_order_idx").on(t.sortOrder)],
);

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    company: text("company").notNull().default(""),
    subject: text("subject").notNull().default(""),
    message: text("message").notNull(),
    source: inquirySource("source").notNull().default("contact"),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    pagePath: text("page_path"),
    sourcePage: text("source_page"),
    sourceUrl: text("source_url"),
    adminNotes: text("admin_notes").notNull().default(""),
    status: inquiryStatus("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("inquiries_status_idx").on(t.status, t.createdAt)],
);

export const redirects = pgTable(
  "redirects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromPath: text("from_path").notNull(),
    toPath: text("to_path").notNull(),
    statusCode: integer("status_code").notNull().default(301),
    note: text("note").notNull().default(""),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("redirects_from_path_unique").on(t.fromPath),
    check("redirects_status_code", sql`${t.statusCode} in (301, 302)`),
  ],
);

/** One row per public path so pages and root-level posts cannot collide. */
export const routes = pgTable(
  "routes",
  {
    path: text("path").primaryKey(),
    kind: text("kind").notNull(),
    entityId: uuid("entity_id").notNull(),
    status: publishStatus("status").notNull().default("draft"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("routes_entity_idx").on(t.entityId, t.kind)],
);

export * from "./schema-cms";
