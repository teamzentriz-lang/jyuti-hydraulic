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
} from "drizzle-orm/pg-core";
import { media, pages, posts, productCategories, products } from "./schema";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export type ProductSpecRow = {
  label: string;
  value: string;
  unit?: string;
  group?: string;
};
export type TechnicalTableRow = {
  tableTitle: string;
  columns: string[];
  rows: string[][];
};
export type ListingConfig = {
  layout?: string;
  productsPerPage?: number;
  columns?: number;
  showImage?: boolean;
  showDescription?: boolean;
  showCategory?: boolean;
  showCta?: boolean;
  showPagination?: boolean;
  sortBy?: string;
  sortDirection?: string;
};
export type SectionCustomData = Record<string, unknown>;

export const pageType = pgEnum("page_type", [
  "home",
  "about",
  "contact",
  "custom",
  "landing_page",
  "product_listing",
  "blog_listing",
  "gallery",
  "certificates",
  "catalogue",
]);

export const sectionType = pgEnum("section_type", [
  "hero",
  "text",
  "rich_text",
  "image",
  "image_text",
  "text_image",
  "features",
  "feature_grid",
  "icon_grid",
  "stats",
  "product_grid",
  "product_carousel",
  "category_grid",
  "blog_grid",
  "blog_carousel",
  "gallery",
  "certificates",
  "catalogue",
  "cta",
  "contact",
  "contact_form",
  "map",
  "faq",
  "video",
  "logo_grid",
  "testimonials",
  "about",
  "product_list",
  "product_category_list",
  "why_choose_us",
  "vision",
  "mission",
  "custom",
]);

export const navItemType = pgEnum("nav_item_type", [
  "page",
  "product_category",
  "product",
  "blog",
  "blog_category",
  "gallery",
  "certificate",
  "catalogue",
  "custom_url",
]);

export const productDocumentType = pgEnum("product_document_type", [
  "datasheet",
  "brochure",
  "catalogue",
  "manual",
  "technical_drawing",
  "certificate",
  "other",
]);

export const productRelationType = pgEnum("product_relation_type", [
  "related",
  "alternative",
  "accessory",
  "compatible",
  "upsell",
]);

export const contentEntityKind = pgEnum("content_entity_kind", [
  "page",
  "product",
  "category",
  "post",
]);

export const formFieldType = pgEnum("form_field_type", [
  "text",
  "email",
  "phone",
  "number",
  "textarea",
  "select",
  "multi_select",
  "radio",
  "checkbox",
  "file",
  "date",
  "product_select",
  "category_select",
]);

export const headerSettings = pgTable(
  "header_settings",
  {
    id: text("id").primaryKey().default("default"),
    logoId: uuid("logo_id").references(() => media.id, {
      onDelete: "set null",
    }),
    mobileLogoId: uuid("mobile_logo_id").references(() => media.id, {
      onDelete: "set null",
    }),
    faviconId: uuid("favicon_id").references(() => media.id, {
      onDelete: "set null",
    }),
    topBarEnabled: boolean("top_bar_enabled").notNull().default(true),
    topBarText: text("top_bar_text").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    ctaText: text("cta_text").notNull().default(""),
    ctaUrl: text("cta_url").notNull().default(""),
    stickyHeader: boolean("sticky_header").notNull().default(true),
    mobileMenuJson: jsonb("mobile_menu_json")
      .$type<unknown>()
      .notNull()
      .default(sql`'null'::jsonb`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [check("header_settings_singleton", sql`${t.id} = 'default'`)],
);

export const footerSettings = pgTable(
  "footer_settings",
  {
    id: text("id").primaryKey().default("default"),
    logoId: uuid("logo_id").references(() => media.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull().default(""),
    quickLinksJson: jsonb("quick_links_json")
      .$type<{ label: string; href: string }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    productLinksJson: jsonb("product_links_json")
      .$type<{ label: string; href: string }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    contactInformationJson: jsonb("contact_information_json")
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    socialLinksJson: jsonb("social_links_json")
      .$type<{ network: string; url: string }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    newsletterEnabled: boolean("newsletter_enabled").notNull().default(false),
    newsletterTitle: text("newsletter_title").notNull().default(""),
    newsletterDescription: text("newsletter_description").notNull().default(""),
    copyrightText: text("copyright_text").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [check("footer_settings_singleton", sql`${t.id} = 'default'`)],
);

export const contactSettings = pgTable(
  "contact_settings",
  {
    id: text("id").primaryKey().default("default"),
    title: text("title").notNull().default(""),
    subtitle: text("subtitle").notNull().default(""),
    description: text("description").notNull().default(""),
    address: text("address").notNull().default(""),
    email: text("email").notNull().default(""),
    emailSecondary: text("email_secondary")
      .notNull()
      .default("jyotihydraulic@gmail.com"),
    detailsEyebrow: text("details_eyebrow").notNull().default("Reach the team"),
    detailsTitle: text("details_title")
      .notNull()
      .default("We are ready to help"),
    formTitle: text("form_title").notNull().default("Request a Quote"),
    formDescription: text("form_description")
      .notNull()
      .default(
        "Fill in the details and our team will get back to you shortly.",
      ),
    phone: text("phone").notNull().default(""),
    whatsapp: text("whatsapp").notNull().default(""),
    mapUrl: text("map_url"),
    mapEmbed: text("map_embed"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    businessHours: text("business_hours").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [check("contact_settings_singleton", sql`${t.id} = 'default'`)],
);

export const siteHtmlSettings = pgTable(
  "site_html_settings",
  {
    id: text("id").primaryKey().default("default"),
    commonHeaderHtml: text("common_header_html").notNull().default(""),
    commonFooterHtml: text("common_footer_html").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [check("site_html_settings_singleton", sql`${t.id} = 'default'`)],
);

export const siteUiSettings = pgTable(
  "site_ui_settings",
  {
    id: text("id").primaryKey().default("default"),
    labels: jsonb("labels")
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [check("site_ui_settings_singleton", sql`${t.id} = 'default'`)],
);

export const pageHtmlOverrides = pgTable(
  "page_html_overrides",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    path: text("path").notNull(),
    headerHtml: text("header_html").notNull().default(""),
    footerHtml: text("footer_html").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("page_html_overrides_path_unique").on(t.path)],
);

export const pageSections = pgTable(
  "page_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id").references(() => pages.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "cascade",
    }),
    categoryId: uuid("category_id").references(() => productCategories.id, {
      onDelete: "cascade",
    }),
    sectionType: sectionType("section_type").notNull().default("custom"),
    title: text("title").notNull().default(""),
    subtitle: text("subtitle").notNull().default(""),
    eyebrow: text("eyebrow").notNull().default(""),
    description: text("description").notNull().default(""),
    imageId: uuid("image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    backgroundImageId: uuid("background_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    mobileImageId: uuid("mobile_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    buttonText: text("button_text").notNull().default(""),
    buttonUrl: text("button_url").notNull().default(""),
    secondaryButtonText: text("secondary_button_text").notNull().default(""),
    secondaryButtonUrl: text("secondary_button_url").notNull().default(""),
    alignment: text("alignment").notNull().default(""),
    layout: text("layout").notNull().default(""),
    background: text("background").notNull().default(""),
    customData: jsonb("custom_data")
      .$type<SectionCustomData>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("page_sections_page_idx").on(t.pageId, t.sortOrder),
    index("page_sections_product_idx").on(t.productId, t.sortOrder),
    index("page_sections_category_idx").on(t.categoryId, t.sortOrder),
  ],
);

export const productSpecifications = pgTable(
  "product_specifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    label: text("label").notNull().default(""),
    value: text("value").notNull().default(""),
    unit: text("unit").notNull().default(""),
    group: text("group").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("product_specifications_product_idx").on(t.productId, t.sortOrder),
  ],
);

export const productFeatures = pgTable(
  "product_features",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    description: text("description").notNull().default(""),
    iconMediaId: uuid("icon_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    imageMediaId: uuid("image_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("product_features_product_idx").on(t.productId, t.sortOrder)],
);

export const productApplications = pgTable(
  "product_applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    description: text("description").notNull().default(""),
    imageMediaId: uuid("image_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("product_applications_product_idx").on(t.productId, t.sortOrder),
  ],
);

export const productDocuments = pgTable(
  "product_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    mediaId: uuid("media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    documentType: productDocumentType("document_type")
      .notNull()
      .default("other"),
    description: text("description").notNull().default(""),
    version: text("version").notNull().default(""),
    documentDate: timestamp("document_date", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("product_documents_product_idx").on(t.productId, t.sortOrder)],
);

export const productOptions = pgTable(
  "product_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    optionName: text("option_name").notNull().default(""),
    optionValue: text("option_value").notNull().default(""),
    description: text("description").notNull().default(""),
    imageMediaId: uuid("image_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("product_options_product_idx").on(t.productId, t.sortOrder)],
);

export const productTechnicalTables = pgTable(
  "product_technical_tables",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tableTitle: text("table_title").notNull().default(""),
    columns: jsonb("columns")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    rows: jsonb("rows")
      .$type<string[][]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("product_technical_tables_product_idx").on(t.productId, t.sortOrder),
  ],
);

export const categoryRelatedCategories = pgTable(
  "category_related_categories",
  {
    categoryId: uuid("category_id")
      .notNull()
      .references(() => productCategories.id, { onDelete: "cascade" }),
    relatedCategoryId: uuid("related_category_id")
      .notNull()
      .references(() => productCategories.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.relatedCategoryId] }),
    check(
      "category_related_not_self",
      sql`${t.categoryId} <> ${t.relatedCategoryId}`,
    ),
  ],
);

export const blogCategories = pgTable(
  "blog_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    imageId: uuid("image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    canonicalUrl: text("canonical_url"),
    ogImageId: uuid("og_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    robotsIndex: boolean("robots_index").notNull().default(true),
    robotsFollow: boolean("robots_follow").notNull().default(true),
    status: text("status").notNull().default("draft"),
    legacyId: integer("legacy_id"),
    legacySlug: text("legacy_slug"),
    legacyUrl: text("legacy_url"),
    legacyType: text("legacy_type"),
    ...timestamps,
  },
  (t) => [uniqueIndex("blog_categories_slug_unique").on(t.slug)],
);

export const blogTags = pgTable(
  "blog_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    legacyId: integer("legacy_id"),
    legacySlug: text("legacy_slug"),
    ...timestamps,
  },
  (t) => [uniqueIndex("blog_tags_slug_unique").on(t.slug)],
);

export const postTags = pgTable(
  "post_tags",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => blogTags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })],
);

export const galleryAlbums = pgTable(
  "gallery_albums",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    coverImageId: uuid("cover_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    legacyId: integer("legacy_id"),
    legacySlug: text("legacy_slug"),
    legacyUrl: text("legacy_url"),
    ...timestamps,
  },
  (t) => [uniqueIndex("gallery_albums_slug_unique").on(t.slug)],
);

export const galleryImages = pgTable(
  "gallery_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    albumId: uuid("album_id")
      .notNull()
      .references(() => galleryAlbums.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    title: text("title").notNull().default(""),
    caption: text("caption").notNull().default(""),
    altText: text("alt_text").notNull().default(""),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("gallery_images_album_idx").on(t.albumId, t.sortOrder)],
);

export const catalogues = pgTable(
  "catalogues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    coverImageId: uuid("cover_image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    documentId: uuid("document_id").references(() => media.id, {
      onDelete: "set null",
    }),
    version: text("version").notNull().default(""),
    publishedDate: timestamp("published_date", { withTimezone: true }),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),
    language: text("language").notNull().default(""),
    fileSize: integer("file_size"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("draft"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    canonicalUrl: text("canonical_url"),
    legacyId: integer("legacy_id"),
    legacySlug: text("legacy_slug"),
    legacyUrl: text("legacy_url"),
    ...timestamps,
  },
  (t) => [uniqueIndex("catalogues_slug_unique").on(t.slug)],
);

export const cmsForms = pgTable(
  "cms_forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    submitLabel: text("submit_label").notNull().default("Submit"),
    successMessage: text("success_message").notNull().default(""),
    notificationEmail: text("notification_email"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("cms_forms_slug_unique").on(t.slug)],
);

export const cmsFormFields = pgTable(
  "cms_form_fields",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => cmsForms.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    name: text("name").notNull(),
    fieldType: formFieldType("field_type").notNull().default("text"),
    placeholder: text("placeholder").notNull().default(""),
    required: boolean("required").notNull().default(false),
    optionsJson: jsonb("options_json")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    validationJson: jsonb("validation_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [index("cms_form_fields_form_idx").on(t.formId, t.sortOrder)],
);

export const contentFaqs = pgTable(
  "content_faqs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityKind: contentEntityKind("entity_kind").notNull(),
    entityId: uuid("entity_id").notNull(),
    question: text("question").notNull().default(""),
    answer: text("answer").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [
    index("content_faqs_entity_idx").on(t.entityKind, t.entityId, t.sortOrder),
  ],
);

export const contentTables = pgTable(
  "content_tables",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityKind: contentEntityKind("entity_kind").notNull(),
    entityId: uuid("entity_id").notNull(),
    title: text("title").notNull().default(""),
    headers: jsonb("headers")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    rows: jsonb("rows")
      .$type<string[][]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    caption: text("caption").notNull().default(""),
    responsiveMode: text("responsive_mode").notNull().default("scroll"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("content_tables_entity_idx").on(
      t.entityKind,
      t.entityId,
      t.sortOrder,
    ),
  ],
);

export const testimonials = pgTable(
  "testimonials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().default(""),
    company: text("company").notNull().default(""),
    designation: text("designation").notNull().default(""),
    content: text("content").notNull().default(""),
    imageId: uuid("image_id").references(() => media.id, {
      onDelete: "set null",
    }),
    rating: integer("rating"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("testimonials_order_idx").on(t.sortOrder)],
);

export const statCounters = pgTable(
  "stat_counters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sectionId: uuid("section_id").references(() => pageSections.id, {
      onDelete: "cascade",
    }),
    number: text("number").notNull().default(""),
    suffix: text("suffix").notNull().default(""),
    label: text("label").notNull().default(""),
    description: text("description").notNull().default(""),
    icon: text("icon").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("stat_counters_section_idx").on(t.sectionId, t.sortOrder)],
);
