import { z } from "zod";
import { CmsError } from "@/db/errors";

const slug = z
  .string()
  .trim()
  .min(1, "Enter a slug.")
  .max(180)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.");

const pathValue = z
  .string()
  .trim()
  .min(1, "Enter a URL path.")
  .max(400)
  .regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/, "Use lowercase letters, numbers, hyphens, and slashes.");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value ? value : null));

const optionalUuid = z
  .string()
  .nullable()
  .transform((value, ctx) => {
    if (!value) return null;
    const parsed = z.uuid().safeParse(value);
    if (!parsed.success) {
      ctx.addIssue({ code: "custom", message: "Choose a valid item." });
      return z.NEVER;
    }
    return parsed.data;
  });

const richText = z.string().max(500_000);
const status = z.enum(["draft", "published"]);
const seoTitle = optionalText(300);
const seoDescription = optionalText(500);
const specs = z
  .array(z.object({ label: z.string().trim().max(200), value: z.string().trim().max(500) }))
  .max(80);
const idList = z.array(z.uuid()).max(40);

export type FieldOption = { value: string; label: string };
export type RelationName = "product-categories" | "products" | "nav-links";

export type FieldDef = {
  name: string;
  label: string;
  type:
    | "text"
    | "slug"
    | "path"
    | "textarea"
    | "richtext"
    | "number"
    | "checkbox"
    | "select"
    | "datetime"
    | "media"
    | "mediaMany"
    | "specs"
    | "relation"
    | "relationMany"
    | "password";
  required?: boolean;
  help?: string;
  wide?: boolean;
  group?: string;
  options?: FieldOption[];
  relation?: RelationName;
  defaultValue?: unknown;
};

export type ResourceKey =
  | "pages"
  | "product-categories"
  | "products"
  | "locations"
  | "exports"
  | "posts"
  | "blog-categories"
  | "blog-tags"
  | "gallery"
  | "gallery-albums"
  | "certificates"
  | "catalogues"
  | "forms"
  | "inquiries"
  | "redirects"
  | "nav-links"
  | "users"
  | "media";

export type ResourceConfig = {
  key: ResourceKey;
  label: string;
  singular: string;
  description: string;
  pathMode?: "page" | "post" | "category" | "product" | "location" | "export";
  adminOnly?: boolean;
  allowCreate?: boolean;
  searchColumns: string[];
  tableColumns: { key: string; label: string }[];
  orderBy: { column: string; direction: "asc" | "desc" };
  fields: FieldDef[];
  schema: z.ZodType<Record<string, unknown>>;
};

const publishing = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

const contentFields = {
  seoTitle: {
    name: "seoTitle",
    label: "SEO title",
    type: "text",
    group: "Search",
    help: "Shown in the browser tab and Google. Leave blank to use the page title.",
  } satisfies FieldDef,
  seoDescription: {
    name: "seoDescription",
    label: "Meta description",
    type: "textarea",
    group: "Search",
    wide: true,
  } satisfies FieldDef,
  status: {
    name: "status",
    label: "Status",
    type: "select",
    group: "Publishing",
    options: publishing,
    defaultValue: "draft",
    required: true,
  } satisfies FieldDef,
};

function recordSchema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).transform((value) => value as Record<string, unknown>);
}

export const resources: Record<ResourceKey, ResourceConfig> = {
  pages: {
    key: "pages",
    label: "Pages",
    singular: "Page",
    description: "About, contact, career, gallery intro, certificates, return policy, and thank-you.",
    pathMode: "page",
    searchColumns: ["title", "path", "slug"],
    tableColumns: [
      { key: "title", label: "Title" },
      { key: "path", label: "Path" },
      { key: "status", label: "Status" },
      { key: "updatedAt", label: "Updated" },
    ],
    orderBy: { column: "updatedAt", direction: "desc" },
    fields: [
      { name: "title", label: "Title", type: "text", required: true, group: "Content" },
      { name: "slug", label: "Slug", type: "slug", required: true, group: "Content" },
      {
        name: "path",
        label: "URL path",
        type: "path",
        required: true,
        group: "Content",
        help: "about-us, contact, gallery, certificates, career, return-policy, thank-you, blogs",
      },
      { name: "heroMediaId", label: "Hero image", type: "media", group: "Content" },
      { name: "body", label: "Body", type: "richtext", wide: true, group: "Content" },
      contentFields.seoTitle,
      contentFields.seoDescription,
      contentFields.status,
    ],
    schema: recordSchema({
      title: z.string().trim().min(1).max(300),
      slug,
      path: pathValue,
      heroMediaId: optionalUuid,
      body: richText,
      seoTitle,
      seoDescription,
      status,
    }),
  },
  "product-categories": {
    key: "product-categories",
    label: "Product categories",
    singular: "Category",
    description: "Catalogue structure and category pages. Top-level categories can fill the Products menu when no menu links exist.",
    pathMode: "category",
    searchColumns: ["title", "path", "slug"],
    tableColumns: [
      { key: "title", label: "Title" },
      { key: "path", label: "Path" },
      { key: "status", label: "Status" },
      { key: "sortOrder", label: "Order" },
    ],
    orderBy: { column: "title", direction: "asc" },
    fields: [
      { name: "title", label: "Title (H1 in banner)", type: "text", required: true, group: "Content" },
      {
        name: "subtitle",
        label: "Banner Tagline / Subtitle",
        type: "text",
        group: "Content",
        defaultValue: "ISO-9001:2015 Certified Company",
        help: "Appears directly underneath the H1 in the top banner strip (e.g. ISO-9001:2015 Certified Company).",
      },
      { name: "slug", label: "Slug", type: "slug", required: true, group: "Content" },
      {
        name: "path",
        label: "URL path",
        type: "path",
        required: true,
        wide: true,
        group: "Content",
        help: "products/hydraulic-power-pack or baling-machines. Also used for /hydraulic-pump/, /hydraulic-jacks/, /leveling-jacks/, and /scrap-baling-machines/.",
      },
      {
        name: "parentId",
        label: "Parent category",
        type: "relation",
        relation: "product-categories",
        group: "Content",
      },
      { name: "summary", label: "Summary", type: "textarea", wide: true, group: "Content" },
      { name: "body", label: "Body", type: "richtext", wide: true, group: "Content" },
      { name: "imageId", label: "Image", type: "media", group: "Content" },
      { name: "sortOrder", label: "Sort order", type: "number", group: "Publishing", defaultValue: 0 },
      {
        name: "showInMenu",
        label: "Show in Products menu fallback",
        type: "checkbox",
        group: "Publishing",
        defaultValue: true,
        help: "Used when no Products menu links exist in admin. Controls catalogue fallback.",
      },
      contentFields.seoTitle,
      contentFields.seoDescription,
      contentFields.status,
    ],
    schema: recordSchema({
      title: z.string().trim().min(1).max(300),
      slug,
      path: pathValue,
      parentId: optionalUuid,
      summary: z.string().trim().max(2000),
      body: richText,
      imageId: optionalUuid,
      sortOrder: z.number().int().min(0).max(100000),
      showInMenu: z.boolean(),
      seoTitle,
      seoDescription,
      status,
    }),
  },
  products: {
    key: "products",
    label: "Products",
    singular: "Product",
    description: "Catalogue detail pages: summary, specifications, gallery, and brochure.",
    pathMode: "product",
    searchColumns: ["title", "path", "slug"],
    tableColumns: [
      { key: "title", label: "Title" },
      { key: "path", label: "Path" },
      { key: "status", label: "Status" },
      { key: "updatedAt", label: "Updated" },
    ],
    orderBy: { column: "updatedAt", direction: "desc" },
    fields: [
      { name: "title", label: "Title", type: "text", required: true, group: "Content" },
      { name: "slug", label: "Slug", type: "slug", required: true, group: "Content" },
      {
        name: "path",
        label: "URL path",
        type: "path",
        required: true,
        wide: true,
        group: "Content",
        help: "products/hydraulic-power-pack/mini-hydraulic-power-pack",
      },
      {
        name: "categoryId",
        label: "Category",
        type: "relation",
        relation: "product-categories",
        group: "Content",
      },
      { name: "summary", label: "Card summary", type: "textarea", wide: true, group: "Content" },
      { name: "body", label: "Body", type: "richtext", wide: true, group: "Content" },
      { name: "specs", label: "Specifications", type: "specs", wide: true, group: "Details", defaultValue: [] },
      { name: "galleryMediaIds", label: "Gallery", type: "mediaMany", wide: true, group: "Media", defaultValue: [] },
      { name: "brochureMediaId", label: "Brochure PDF", type: "media", group: "Media" },
      {
        name: "relatedProductIds",
        label: "Related products",
        type: "relationMany",
        relation: "products",
        wide: true,
        group: "Details",
        defaultValue: [],
      },
      { name: "sortOrder", label: "Sort order", type: "number", group: "Publishing", defaultValue: 0 },
      contentFields.seoTitle,
      contentFields.seoDescription,
      contentFields.status,
    ],
    schema: recordSchema({
      title: z.string().trim().min(1).max(300),
      slug,
      path: pathValue,
      categoryId: optionalUuid,
      summary: z.string().trim().max(2000),
      body: richText,
      specs,
      galleryMediaIds: idList,
      brochureMediaId: optionalUuid,
      relatedProductIds: idList,
      sortOrder: z.number().int().min(0).max(100000),
      seoTitle,
      seoDescription,
      status,
    }),
  },
  locations: {
    key: "locations",
    label: "Location pages",
    singular: "Location page",
    description: "The /city/ pages. One template, one record per city URL.",
    pathMode: "location",
    searchColumns: ["title", "locationName", "region", "slug"],
    tableColumns: [
      { key: "title", label: "Title" },
      { key: "locationName", label: "Location" },
      { key: "region", label: "Region" },
      { key: "status", label: "Status" },
    ],
    orderBy: { column: "title", direction: "asc" },
    fields: [
      { name: "title", label: "Title", type: "text", required: true, wide: true, group: "Content" },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        group: "Content",
        help: "Published at /city/{slug}/.",
      },
      { name: "locationName", label: "Location name", type: "text", required: true, group: "Content" },
      { name: "region", label: "Region or state", type: "text", group: "Content" },
      {
        name: "categoryId",
        label: "Related category",
        type: "relation",
        relation: "product-categories",
        group: "Content",
      },
      {
        name: "productId",
        label: "Related product",
        type: "relation",
        relation: "products",
        group: "Content",
      },
      { name: "body", label: "Body", type: "richtext", wide: true, group: "Content" },
      contentFields.seoTitle,
      contentFields.seoDescription,
      contentFields.status,
    ],
    schema: recordSchema({
      title: z.string().trim().min(1).max(300),
      slug,
      locationName: z.string().trim().min(1).max(200),
      region: z.string().trim().max(200),
      categoryId: optionalUuid,
      productId: optionalUuid,
      body: richText,
      seoTitle,
      seoDescription,
      status,
    }),
  },
  exports: {
    key: "exports",
    label: "Export pages",
    singular: "Export page",
    description: "Country and product-line pages under /exports/.",
    pathMode: "export",
    searchColumns: ["title", "country", "productLine", "slug"],
    tableColumns: [
      { key: "title", label: "Title" },
      { key: "country", label: "Country" },
      { key: "productLine", label: "Product line" },
      { key: "status", label: "Status" },
    ],
    orderBy: { column: "title", direction: "asc" },
    fields: [
      { name: "title", label: "Title", type: "text", required: true, wide: true, group: "Content" },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        group: "Content",
        help: "Published at /exports/{slug}/.",
      },
      { name: "country", label: "Country", type: "text", required: true, group: "Content" },
      { name: "productLine", label: "Product line", type: "text", group: "Content" },
      {
        name: "categoryId",
        label: "Related category",
        type: "relation",
        relation: "product-categories",
        group: "Content",
      },
      {
        name: "productId",
        label: "Related product",
        type: "relation",
        relation: "products",
        group: "Content",
      },
      { name: "body", label: "Body", type: "richtext", wide: true, group: "Content" },
      contentFields.seoTitle,
      contentFields.seoDescription,
      contentFields.status,
    ],
    schema: recordSchema({
      title: z.string().trim().min(1).max(300),
      slug,
      country: z.string().trim().min(1).max(120),
      productLine: z.string().trim().max(200),
      categoryId: optionalUuid,
      productId: optionalUuid,
      body: richText,
      seoTitle,
      seoDescription,
      status,
    }),
  },
  posts: {
    key: "posts",
    label: "Posts",
    singular: "Post",
    description: "Blog articles. They stay at the site root, not under /blogs/.",
    pathMode: "post",
    searchColumns: ["title", "slug", "excerpt"],
    tableColumns: [
      { key: "title", label: "Title" },
      { key: "path", label: "Path" },
      { key: "status", label: "Status" },
      { key: "publishedAt", label: "Date" },
    ],
    orderBy: { column: "publishedAt", direction: "desc" },
    fields: [
      { name: "title", label: "Title", type: "text", required: true, group: "Content" },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        group: "Content",
        help: "Published at /{slug}/. /blogs/ is only the listing page.",
      },
      { name: "publishedAt", label: "Publish date", type: "datetime", group: "Publishing" },
      { name: "coverMediaId", label: "Cover image", type: "media", group: "Content" },
      { name: "excerpt", label: "Excerpt", type: "textarea", wide: true, group: "Content" },
      { name: "body", label: "Body", type: "richtext", wide: true, group: "Content" },
      contentFields.seoTitle,
      contentFields.seoDescription,
      contentFields.status,
    ],
    schema: recordSchema({
      title: z.string().trim().min(1).max(300),
      slug,
      publishedAt: z.string().datetime().nullable(),
      coverMediaId: optionalUuid,
      excerpt: z.string().trim().max(2000),
      body: richText,
      seoTitle,
      seoDescription,
      status,
    }),
  },
  gallery: {
    key: "gallery",
    label: "Gallery",
    singular: "Gallery item",
    description: "Photos and videos for the gallery grid, in the order they should appear.",
    searchColumns: ["title", "caption"],
    tableColumns: [
      { key: "title", label: "Title" },
      { key: "caption", label: "Caption" },
      { key: "sortOrder", label: "Order" },
    ],
    orderBy: { column: "sortOrder", direction: "asc" },
    fields: [
      { name: "title", label: "Title", type: "text", group: "Content" },
      { name: "caption", label: "Caption", type: "textarea", wide: true, group: "Content" },
      { name: "mediaId", label: "Image or video", type: "media", required: true, group: "Content" },
      { name: "sortOrder", label: "Sort order", type: "number", group: "Content", defaultValue: 0 },
    ],
    schema: recordSchema({
      title: z.string().trim().max(200),
      caption: z.string().trim().max(1000),
      mediaId: z.uuid("Choose an image or video."),
      sortOrder: z.number().int().min(0).max(100000),
    }),
  },
  certificates: {
    key: "certificates",
    label: "Certificates",
    singular: "Certificate",
    description: "Certificate images, in display order.",
    searchColumns: ["title", "caption"],
    tableColumns: [
      { key: "title", label: "Title" },
      { key: "caption", label: "Caption" },
      { key: "sortOrder", label: "Order" },
    ],
    orderBy: { column: "sortOrder", direction: "asc" },
    fields: [
      { name: "title", label: "Title", type: "text", group: "Content" },
      { name: "caption", label: "Caption", type: "textarea", wide: true, group: "Content" },
      { name: "mediaId", label: "Image", type: "media", required: true, group: "Content" },
      { name: "sortOrder", label: "Sort order", type: "number", group: "Content", defaultValue: 0 },
    ],
    schema: recordSchema({
      title: z.string().trim().max(200),
      caption: z.string().trim().max(1000),
      mediaId: z.uuid("Choose an image."),
      sortOrder: z.number().int().min(0).max(100000),
    }),
  },
  inquiries: {
    key: "inquiries",
    label: "Inquiries",
    singular: "Inquiry",
    description: "Quote requests and newsletter signups. A subject of Newsletter is a signup, not a product quote.",
    searchColumns: ["name", "email", "phone", "message", "subject"],
    tableColumns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "subject", label: "Subject" },
      { key: "source", label: "Source" },
      { key: "status", label: "Status" },
      { key: "createdAt", label: "Received" },
    ],
    orderBy: { column: "createdAt", direction: "desc" },
    fields: [
      { name: "name", label: "Name", type: "text", required: true, group: "Enquiry" },
      { name: "email", label: "Email", type: "text", required: true, group: "Enquiry" },
      { name: "phone", label: "Phone", type: "text", group: "Enquiry" },
      { name: "company", label: "Company", type: "text", group: "Enquiry" },
      { name: "subject", label: "Subject", type: "text", group: "Enquiry" },
      { name: "message", label: "Message", type: "textarea", required: true, wide: true, group: "Enquiry" },
      {
        name: "source",
        label: "Source",
        type: "select",
        required: true,
        group: "Enquiry",
        defaultValue: "contact",
        options: [
          { value: "contact", label: "Contact" },
          { value: "quote", label: "Quote" },
          { value: "product", label: "Product" },
        ],
      },
      { name: "productId", label: "Product", type: "relation", relation: "products", group: "Enquiry" },
      { name: "pagePath", label: "Page path", type: "text", group: "Enquiry" },
      { name: "sourcePage", label: "Source page", type: "text", group: "Enquiry" },
      { name: "sourceUrl", label: "Source URL", type: "text", wide: true, group: "Enquiry" },
      { name: "adminNotes", label: "Admin notes", type: "textarea", wide: true, group: "Enquiry" },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        group: "Enquiry",
        defaultValue: "new",
        options: [
          { value: "new", label: "New" },
          { value: "contacted", label: "Contacted" },
          { value: "in_progress", label: "In progress" },
          { value: "converted", label: "Converted" },
          { value: "closed", label: "Closed" },
          { value: "spam", label: "Spam" },
          { value: "read", label: "Read (legacy)" },
          { value: "archived", label: "Archived (legacy)" },
        ],
      },
    ],
    schema: recordSchema({
      name: z.string().trim().min(1).max(200),
      email: z.email("Enter a valid email."),
      phone: z.string().trim().max(40),
      company: z.string().trim().max(200),
      subject: z.string().trim().max(300),
      message: z.string().trim().min(1).max(10000),
      source: z.enum(["contact", "quote", "product"]),
      productId: optionalUuid,
      pagePath: optionalText(400),
      sourcePage: optionalText(400),
      sourceUrl: optionalText(500),
      adminNotes: z.string().trim().max(5000),
      status: z.enum(["new", "read", "archived", "contacted", "in_progress", "converted", "closed", "spam"]),
    }),
  },
  "blog-categories": {
    key: "blog-categories",
    label: "Blog categories",
    singular: "Blog category",
    description: "Saved for organisation. The public blog lists every published post and does not filter by these categories yet.",
    searchColumns: ["name", "slug"],
    tableColumns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "status", label: "Status" },
    ],
    orderBy: { column: "name", direction: "asc" },
    fields: [
      { name: "name", label: "Name", type: "text", required: true, group: "Content" },
      { name: "slug", label: "Slug", type: "slug", required: true, group: "Content" },
      { name: "description", label: "Description", type: "textarea", wide: true, group: "Content" },
      { name: "imageId", label: "Image", type: "media", group: "Content" },
      { name: "metaTitle", label: "Meta title", type: "text", group: "SEO" },
      { name: "metaDescription", label: "Meta description", type: "textarea", wide: true, group: "SEO" },
      { name: "status", label: "Status", type: "select", group: "Publishing", defaultValue: "draft", options: publishing },
    ],
    schema: recordSchema({
      name: z.string().trim().min(1).max(200),
      slug,
      description: z.string().trim().max(5000),
      imageId: optionalUuid,
      metaTitle: optionalText(300),
      metaDescription: optionalText(500),
      status: z.enum(["draft", "published"]),
    }),
  },
  "blog-tags": {
    key: "blog-tags",
    label: "Blog tags",
    singular: "Blog tag",
    description: "Saved with posts. The public blog does not filter by tags yet.",
    searchColumns: ["name", "slug"],
    tableColumns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
    ],
    orderBy: { column: "name", direction: "asc" },
    fields: [
      { name: "name", label: "Name", type: "text", required: true, group: "Content" },
      { name: "slug", label: "Slug", type: "slug", required: true, group: "Content" },
      { name: "description", label: "Description", type: "textarea", wide: true, group: "Content" },
    ],
    schema: recordSchema({
      name: z.string().trim().min(1).max(200),
      slug,
      description: z.string().trim().max(2000),
    }),
  },
  "gallery-albums": {
    key: "gallery-albums",
    label: "Gallery albums",
    singular: "Album",
    description: "Not shown on the public gallery. Photos on /gallery/ come from Gallery photos.",
    searchColumns: ["title", "slug"],
    tableColumns: [
      { key: "title", label: "Title" },
      { key: "slug", label: "Slug" },
      { key: "status", label: "Status" },
      { key: "sortOrder", label: "Order" },
    ],
    orderBy: { column: "sortOrder", direction: "asc" },
    fields: [
      { name: "title", label: "Title", type: "text", required: true, group: "Content" },
      { name: "slug", label: "Slug", type: "slug", required: true, group: "Content" },
      { name: "description", label: "Description", type: "textarea", wide: true, group: "Content" },
      { name: "coverImageId", label: "Cover image", type: "media", group: "Content" },
      { name: "sortOrder", label: "Sort order", type: "number", group: "Content", defaultValue: 0 },
      { name: "status", label: "Status", type: "select", group: "Publishing", defaultValue: "draft", options: publishing },
    ],
    schema: recordSchema({
      title: z.string().trim().min(1).max(300),
      slug,
      description: z.string().trim().max(5000),
      coverImageId: optionalUuid,
      sortOrder: z.number().int().min(0).max(100000),
      status: z.enum(["draft", "published"]),
    }),
  },
  catalogues: {
    key: "catalogues",
    label: "Catalogues",
    singular: "Catalogue",
    description: "Downloadable catalogue and document records.",
    searchColumns: ["title", "slug"],
    tableColumns: [
      { key: "title", label: "Title" },
      { key: "slug", label: "Slug" },
      { key: "status", label: "Status" },
      { key: "version", label: "Version" },
    ],
    orderBy: { column: "title", direction: "asc" },
    fields: [
      { name: "title", label: "Title", type: "text", required: true, group: "Content" },
      { name: "slug", label: "Slug", type: "slug", required: true, group: "Content" },
      { name: "description", label: "Description", type: "textarea", wide: true, group: "Content" },
      { name: "coverImageId", label: "Cover image", type: "media", group: "Content" },
      { name: "documentId", label: "Document", type: "media", group: "Content" },
      { name: "version", label: "Version", type: "text", group: "Content" },
      { name: "language", label: "Language", type: "text", group: "Content" },
      { name: "sortOrder", label: "Sort order", type: "number", group: "Content", defaultValue: 0 },
      { name: "status", label: "Status", type: "select", group: "Publishing", defaultValue: "draft", options: publishing },
    ],
    schema: recordSchema({
      title: z.string().trim().min(1).max(300),
      slug,
      description: z.string().trim().max(5000),
      coverImageId: optionalUuid,
      documentId: optionalUuid,
      version: z.string().trim().max(80),
      language: z.string().trim().max(40),
      sortOrder: z.number().int().min(0).max(100000),
      status: z.enum(["draft", "published"]),
    }),
  },
  forms: {
    key: "forms",
    label: "Forms",
    singular: "Form",
    description: "Stored form definitions. The public contact form is built into the site and saves each submission under Inquiries.",
    searchColumns: ["name", "slug"],
    tableColumns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "isActive", label: "Active" },
    ],
    orderBy: { column: "name", direction: "asc" },
    fields: [
      { name: "name", label: "Name", type: "text", required: true, group: "Form" },
      { name: "slug", label: "Slug", type: "slug", required: true, group: "Form" },
      { name: "description", label: "Description", type: "textarea", wide: true, group: "Form" },
      { name: "submitLabel", label: "Submit label", type: "text", group: "Form", defaultValue: "Submit" },
      { name: "successMessage", label: "Success message", type: "textarea", wide: true, group: "Form" },
      { name: "notificationEmail", label: "Notification email", type: "text", group: "Form" },
      { name: "isActive", label: "Active", type: "checkbox", group: "Form", defaultValue: true },
    ],
    schema: recordSchema({
      name: z.string().trim().min(1).max(200),
      slug,
      description: z.string().trim().max(5000),
      submitLabel: z.string().trim().max(120),
      successMessage: z.string().trim().max(2000),
      notificationEmail: z.union([z.email(), z.literal("")]).nullable(),
      isActive: z.boolean(),
    }),
  },
  redirects: {
    key: "redirects",
    label: "Redirects",
    singular: "Redirect",
    description: "Only for URLs that cannot keep their WordPress path.",
    searchColumns: ["fromPath", "toPath", "note"],
    tableColumns: [
      { key: "fromPath", label: "From" },
      { key: "toPath", label: "To" },
      { key: "statusCode", label: "Code" },
      { key: "active", label: "Active" },
    ],
    orderBy: { column: "fromPath", direction: "asc" },
    fields: [
      {
        name: "fromPath",
        label: "From",
        type: "text",
        required: true,
        group: "Redirect",
        help: "Old public path, such as /old-page/.",
      },
      { name: "toPath", label: "To", type: "text", required: true, group: "Redirect" },
      {
        name: "statusCode",
        label: "Status",
        type: "select",
        required: true,
        group: "Redirect",
        defaultValue: "301",
        options: [
          { value: "301", label: "301 permanent" },
          { value: "302", label: "302 temporary" },
        ],
      },
      { name: "note", label: "Note", type: "text", wide: true, group: "Redirect" },
      { name: "active", label: "Active", type: "checkbox", group: "Redirect", defaultValue: true },
    ],
    schema: recordSchema({
      fromPath: z.string().trim().min(1).max(500),
      toPath: z.string().trim().min(1).max(500),
      statusCode: z.union([z.literal(301), z.literal(302)]),
      note: z.string().trim().max(500),
      active: z.boolean(),
    }),
  },
  "nav-links": {
    key: "nav-links",
    label: "Navigation",
    singular: "Link",
    description: "Header and footer links. For the Products hover list, use Site → Products menu.",
    searchColumns: ["label", "href"],
    tableColumns: [
      { key: "label", label: "Label" },
      { key: "location", label: "Menu" },
      { key: "href", label: "URL" },
      { key: "sortOrder", label: "Order" },
    ],
    orderBy: { column: "sortOrder", direction: "asc" },
    fields: [
      {
        name: "location",
        label: "Menu",
        type: "select",
        required: true,
        group: "Link",
        defaultValue: "header",
        options: [
          { value: "header", label: "Header" },
          { value: "products", label: "Products menu (hover dropdown)" },
          { value: "footer", label: "Footer" },
        ],
      },
      { name: "label", label: "Label", type: "text", required: true, group: "Link" },
      { name: "itemSlug", label: "Slug", type: "slug", group: "Link" },
      { name: "href", label: "URL", type: "text", required: true, group: "Link", help: "/products/ or a full https URL." },
      {
        name: "itemType",
        label: "Type",
        type: "select",
        group: "Link",
        defaultValue: "custom_url",
        options: [
          { value: "page", label: "Page" },
          { value: "product_category", label: "Product category" },
          { value: "product", label: "Product" },
          { value: "blog", label: "Blog post" },
          { value: "blog_category", label: "Blog category" },
          { value: "gallery", label: "Gallery" },
          { value: "certificate", label: "Certificate" },
          { value: "catalogue", label: "Catalogue" },
          { value: "custom_url", label: "Custom URL" },
        ],
      },
      { name: "referenceId", label: "Reference ID", type: "text", group: "Link", help: "Target entity UUID when type is not custom URL." },
      { name: "parentId", label: "Parent link", type: "relation", relation: "nav-links", group: "Link" },
      { name: "sortOrder", label: "Sort order", type: "number", group: "Link", defaultValue: 0 },
      { name: "isActive", label: "Active", type: "checkbox", group: "Link", defaultValue: true },
      { name: "openInNewTab", label: "Open in a new tab", type: "checkbox", group: "Link", defaultValue: false },
    ],
    schema: recordSchema({
      location: z.enum(["header", "footer", "products"]),
      label: z.string().trim().min(1).max(160),
      itemSlug: optionalText(180),
      href: z.string().trim().min(1).max(500),
      itemType: z.string().trim().max(40),
      referenceId: optionalUuid,
      parentId: optionalUuid,
      sortOrder: z.number().int().min(0).max(100000),
      isActive: z.boolean(),
      openInNewTab: z.boolean(),
    }),
  },
  users: {
    key: "users",
    label: "Users",
    singular: "User",
    description: "Admins manage accounts. Editors can change content, not accounts.",
    adminOnly: true,
    searchColumns: ["name", "email"],
    tableColumns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "updatedAt", label: "Updated" },
    ],
    orderBy: { column: "name", direction: "asc" },
    fields: [
      { name: "name", label: "Name", type: "text", required: true, group: "Account" },
      { name: "email", label: "Email", type: "text", required: true, group: "Account" },
      {
        name: "role",
        label: "Role",
        type: "select",
        required: true,
        group: "Account",
        defaultValue: "editor",
        options: [
          { value: "admin", label: "Admin" },
          { value: "editor", label: "Editor" },
        ],
      },
      {
        name: "password",
        label: "Password",
        type: "password",
        group: "Account",
        help: "At least 8 characters. Leave blank when editing to keep the current password.",
      },
    ],
    schema: recordSchema({
      name: z.string().trim().min(1).max(160),
      email: z.email("Enter a valid email."),
      role: z.enum(["admin", "editor"]),
      password: z.string().max(200),
    }),
  },
  media: {
    key: "media",
    label: "Media",
    singular: "File",
    description: "Images, videos, and catalogue PDFs.",
    allowCreate: false,
    searchColumns: ["filename", "alt"],
    tableColumns: [
      { key: "filename", label: "File" },
      { key: "alt", label: "Alt text" },
      { key: "mimeType", label: "Type" },
      { key: "size", label: "Size" },
    ],
    orderBy: { column: "createdAt", direction: "desc" },
    fields: [{ name: "alt", label: "Alt text", type: "text", wide: true, group: "File" }],
    schema: recordSchema({
      alt: z.string().trim().max(300),
    }),
  },
};

export function isResourceKey(value: string): value is ResourceKey {
  return value in resources;
}

export function emptyValues(resource: ResourceKey) {
  const values: Record<string, unknown> = {};
  for (const field of resources[resource].fields) {
    if (field.defaultValue !== undefined) {
      values[field.name] = field.defaultValue;
      continue;
    }
    if (field.type === "checkbox") values[field.name] = false;
    else if (field.type === "mediaMany" || field.type === "relationMany" || field.type === "specs") values[field.name] = [];
    else if (field.type === "number") values[field.name] = 0;
    else values[field.name] = "";
  }
  return values;
}

const jsonFields = new Set(["mediaMany", "relationMany", "specs"]);

export function readFormData(resource: ResourceKey, formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const field of resources[resource].fields) {
    if (field.type === "checkbox") {
      raw[field.name] = formData.get(field.name) === "on";
      continue;
    }
    const text = String(formData.get(field.name) ?? "");
    if (jsonFields.has(field.type)) {
      try {
        raw[field.name] = text ? JSON.parse(text) : [];
      } catch {
        throw new CmsError(`Could not read ${field.label}.`);
      }
      continue;
    }
    if (field.type === "number" || field.name === "statusCode") {
      raw[field.name] = text.trim() === "" ? null : Number(text);
      continue;
    }
    if (
      field.type === "media" ||
      field.type === "relation" ||
      field.type === "datetime" ||
      field.name === "pagePath" ||
      field.name === "seoTitle" ||
      field.name === "seoDescription"
    ) {
      raw[field.name] = text.trim() ? text.trim() : null;
      continue;
    }
    raw[field.name] = text;
  }
  return raw;
}

export function parseResource(resource: ResourceKey, raw: Record<string, unknown>) {
  const parsed = resources[resource].schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.[0];
    const label = resources[resource].fields.find((item) => item.name === field)?.label;
    throw new CmsError(label ? `${label}: ${issue?.message ?? "Invalid value."}` : (issue?.message ?? "Check the form."));
  }
  return parsed.data;
}
