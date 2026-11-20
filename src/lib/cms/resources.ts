import { z } from "zod";
import { CmsError } from "@/db/errors";
import { removeLegacyBlogEmbed } from "@/lib/cms/legacy-blog-embed";

const slug = z
  .string()
  .trim()
  .min(1, "Enter a slug.")
  .max(180)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and hyphens.",
  );

const pathValue = z
  .string()
  .trim()
  .min(1, "Enter a URL path.")
  .max(400)
  .regex(
    /^[a-z0-9]+(?:[/-][a-z0-9]+)*$/,
    "Use lowercase letters, numbers, hyphens, and slashes.",
  );

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
const focusKeyword = optionalText(500);
const canonicalUrl = optionalText(500);
const specs = z
  .array(
    z.object({
      label: z.string().trim().max(200),
      value: z.string().trim().max(500),
    }),
  )
  .max(80);
const idList = z.array(z.uuid()).max(40);

export type FieldOption = { value: string; label: string };
export type RelationName =
  | "product-categories"
  | "products"
  | "nav-links"
  | "users"
  | "teams"
  | "companies"
  | "contacts"
  | "inquiries"
  | "leads";

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
    | "permissionList"
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
  | "companies"
  | "contacts"
  | "leads"
  | "lead-activities"
  | "follow-ups"
  | "redirects"
  | "nav-links"
  | "users"
  | "teams"
  | "page-html"
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
  focusKeyword: {
    name: "focusKeyword",
    label: "Meta keywords",
    type: "text",
    group: "Search",
    help: "Comma-separated keywords, for example: hydraulic press, baling machine, Faridabad.",
  } satisfies FieldDef,
  canonicalUrl: {
    name: "canonicalUrl",
    label: "Canonical URL",
    type: "text",
    group: "Search",
    wide: true,
  } satisfies FieldDef,
  ogTitle: {
    name: "ogTitle",
    label: "Open Graph title",
    type: "text",
    group: "Social sharing",
  } satisfies FieldDef,
  ogDescription: {
    name: "ogDescription",
    label: "Open Graph description",
    type: "textarea",
    wide: true,
    group: "Social sharing",
  } satisfies FieldDef,
  ogImageId: {
    name: "ogImageId",
    label: "Open Graph image",
    type: "media",
    group: "Social sharing",
  } satisfies FieldDef,
  twitterTitle: {
    name: "twitterTitle",
    label: "X/Twitter title",
    type: "text",
    group: "Social sharing",
  } satisfies FieldDef,
  twitterDescription: {
    name: "twitterDescription",
    label: "X/Twitter description",
    type: "textarea",
    wide: true,
    group: "Social sharing",
  } satisfies FieldDef,
  twitterImageId: {
    name: "twitterImageId",
    label: "X/Twitter image",
    type: "media",
    group: "Social sharing",
  } satisfies FieldDef,
  robotsIndex: {
    name: "robotsIndex",
    label: "Allow search indexing",
    type: "checkbox",
    group: "Search",
    defaultValue: true,
  } satisfies FieldDef,
  robotsFollow: {
    name: "robotsFollow",
    label: "Allow search following",
    type: "checkbox",
    group: "Search",
    defaultValue: true,
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
  "page-html": {
    key: "page-html",
    label: "Page HTML",
    singular: "Page HTML override",
    description: "Optional header and footer HTML for any exact public URL.",
    searchColumns: ["path"],
    tableColumns: [
      { key: "path", label: "Public URL" },
      { key: "isActive", label: "Active" },
      { key: "updatedAt", label: "Updated" },
    ],
    orderBy: { column: "path", direction: "asc" },
    fields: [
      {
        name: "path",
        label: "Exact public URL",
        type: "text",
        required: true,
        help: "Examples: /, /contact/, /blogs/, /products/hydraulic-jacks/",
      },
      {
        name: "headerHtml",
        label: "Page header HTML",
        type: "richtext",
        wide: true,
        help: "Displayed below the common site header on this URL.",
      },
      {
        name: "footerHtml",
        label: "Page footer HTML",
        type: "richtext",
        wide: true,
        help: "Displayed above the common site footer on this URL.",
      },
      {
        name: "isActive",
        label: "Active",
        type: "checkbox",
        defaultValue: true,
      },
    ],
    schema: recordSchema({
      path: z
        .string()
        .trim()
        .min(1)
        .max(500)
        .regex(
          /^\/(?:[^?#]*)$/,
          "Enter a path beginning with / without query parameters.",
        ),
      headerHtml: richText,
      footerHtml: richText,
      isActive: z.boolean(),
    }),
  },
  pages: {
    key: "pages",
    label: "Pages",
    singular: "Page",
    description:
      "About, contact, career, gallery intro, certificates, return policy, and thank-you.",
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
      {
        name: "title",
        label: "Title",
        type: "text",
        required: true,
        group: "Content",
      },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        group: "Content",
      },
      {
        name: "path",
        label: "URL path",
        type: "path",
        required: true,
        group: "Content",
        help: "about-us, contact, gallery, certificates, career, return-policy, thank-you, blogs",
      },
      {
        name: "heroMediaId",
        label: "Hero image",
        type: "media",
        group: "Content",
      },
      {
        name: "body",
        label: "Body",
        type: "richtext",
        wide: true,
        group: "Content",
      },
      contentFields.seoTitle,
      contentFields.seoDescription,
      contentFields.focusKeyword,
      contentFields.canonicalUrl,
      contentFields.ogTitle,
      contentFields.ogDescription,
      contentFields.ogImageId,
      contentFields.twitterTitle,
      contentFields.twitterDescription,
      contentFields.twitterImageId,
      contentFields.robotsIndex,
      contentFields.robotsFollow,
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
      focusKeyword,
      canonicalUrl,
      ogTitle: optionalText(300),
      ogDescription: optionalText(500),
      ogImageId: optionalUuid,
      twitterTitle: optionalText(300),
      twitterDescription: optionalText(500),
      twitterImageId: optionalUuid,
      robotsIndex: z.boolean(),
      robotsFollow: z.boolean(),
      status,
    }),
  },
  "product-categories": {
    key: "product-categories",
    label: "Product categories",
    singular: "Category",
    description:
      "Catalogue structure and category pages. Top-level categories can fill the Products menu when no menu links exist.",
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
      {
        name: "title",
        label: "Title (H1 in banner)",
        type: "text",
        required: true,
        group: "Content",
      },
      {
        name: "subtitle",
        label: "Banner Tagline / Subtitle",
        type: "text",
        group: "Content",
        defaultValue: "ISO-9001:2015 Certified Company",
        help: "Appears directly underneath the H1 in the top banner strip (e.g. ISO-9001:2015 Certified Company).",
      },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        group: "Content",
      },
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
      {
        name: "summary",
        label: "Summary",
        type: "textarea",
        wide: true,
        group: "Content",
      },
      {
        name: "body",
        label: "Body",
        type: "richtext",
        wide: true,
        group: "Content",
      },
      { name: "imageId", label: "Image", type: "media", group: "Content" },
      {
        name: "sortOrder",
        label: "Sort order",
        type: "number",
        group: "Publishing",
        defaultValue: 0,
      },
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
      summary: z.string().trim().max(100_000),
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
    description:
      "Catalogue detail pages: summary, specifications, gallery, and brochure.",
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
      {
        name: "title",
        label: "Title",
        type: "text",
        required: true,
        group: "Content",
      },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        group: "Content",
      },
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
      {
        name: "summary",
        label: "Card summary",
        type: "textarea",
        wide: true,
        group: "Content",
      },
      {
        name: "body",
        label: "Body",
        type: "richtext",
        wide: true,
        group: "Content",
      },
      {
        name: "specs",
        label: "Specifications",
        type: "specs",
        wide: true,
        group: "Details",
        defaultValue: [],
      },
      {
        name: "galleryMediaIds",
        label: "Gallery",
        type: "mediaMany",
        wide: true,
        group: "Media",
        defaultValue: [],
      },
      {
        name: "brochureMediaId",
        label: "Brochure PDF",
        type: "media",
        group: "Media",
      },
      {
        name: "relatedProductIds",
        label: "Related products",
        type: "relationMany",
        relation: "products",
        wide: true,
        group: "Details",
        defaultValue: [],
      },
      {
        name: "sortOrder",
        label: "Sort order",
        type: "number",
        group: "Publishing",
        defaultValue: 0,
      },
      contentFields.seoTitle,
      contentFields.seoDescription,
      contentFields.ogTitle,
      contentFields.ogDescription,
      contentFields.ogImageId,
      contentFields.twitterTitle,
      contentFields.twitterDescription,
      contentFields.twitterImageId,
      contentFields.robotsIndex,
      contentFields.robotsFollow,
      contentFields.status,
    ],
    schema: recordSchema({
      title: z.string().trim().min(1).max(300),
      slug,
      path: pathValue,
      categoryId: optionalUuid,
      summary: z.string().trim().max(100_000),
      body: richText,
      specs,
      galleryMediaIds: idList,
      brochureMediaId: optionalUuid,
      relatedProductIds: idList,
      sortOrder: z.number().int().min(0).max(100000),
      seoTitle,
      seoDescription,
      ogTitle: optionalText(300),
      ogDescription: optionalText(500),
      ogImageId: optionalUuid,
      twitterTitle: optionalText(300),
      twitterDescription: optionalText(500),
      twitterImageId: optionalUuid,
      robotsIndex: z.boolean(),
      robotsFollow: z.boolean(),
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
      {
        name: "title",
        label: "Title",
        type: "text",
        required: true,
        wide: true,
        group: "Content",
      },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        group: "Content",
        help: "Published at /city/{slug}/.",
      },
      {
        name: "locationName",
        label: "Location name",
        type: "text",
        required: true,
        group: "Content",
      },
      {
        name: "region",
        label: "Region or state",
        type: "text",
        group: "Content",
      },
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
      {
        name: "body",
        label: "Body",
        type: "richtext",
        wide: true,
        group: "Content",
      },
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
      {
        name: "title",
        label: "Title",
        type: "text",
        required: true,
        wide: true,
        group: "Content",
      },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        group: "Content",
        help: "Published at /exports/{slug}/.",
      },
      {
        name: "country",
        label: "Country",
        type: "text",
        required: true,
        group: "Content",
      },
      {
        name: "productLine",
        label: "Product line",
        type: "text",
        group: "Content",
      },
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
      {
        name: "body",
        label: "Body",
        type: "richtext",
        wide: true,
        group: "Content",
      },
      contentFields.seoTitle,
      contentFields.seoDescription,
      contentFields.focusKeyword,
      contentFields.canonicalUrl,
      contentFields.ogTitle,
      contentFields.ogDescription,
      contentFields.ogImageId,
      contentFields.twitterTitle,
      contentFields.twitterDescription,
      contentFields.twitterImageId,
      contentFields.robotsIndex,
      contentFields.robotsFollow,
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
      focusKeyword,
      canonicalUrl,
      ogTitle: optionalText(300),
      ogDescription: optionalText(500),
      ogImageId: optionalUuid,
      twitterTitle: optionalText(300),
      twitterDescription: optionalText(500),
      twitterImageId: optionalUuid,
      robotsIndex: z.boolean(),
      robotsFollow: z.boolean(),
      status,
    }),
  },
  posts: {
    key: "posts",
    label: "Posts",
    singular: "Post",
    description:
      "Blog articles. They stay at the site root, not under /blogs/.",
    pathMode: "post",
    searchColumns: ["title", "slug", "excerpt"],
    tableColumns: [
      { key: "title", label: "Title" },
      { key: "path", label: "Path" },
      { key: "status", label: "Status" },
      { key: "updatedAt", label: "Updated" },
    ],
    orderBy: { column: "publishedAt", direction: "desc" },
    fields: [
      {
        name: "title",
        label: "Title",
        type: "text",
        required: true,
        group: "Content",
      },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        group: "Content",
        help: "Published at /{slug}/. /blogs/ is only the listing page.",
      },
      {
        name: "publishedAt",
        label: "Publish date",
        type: "datetime",
        group: "Publishing",
      },
      {
        name: "updatedDateText",
        label: "Updated date",
        type: "text",
        group: "Publishing",
        help: "e.g. Oct 14, 2026. If left empty, system updated date is used.",
      },
      {
        name: "verifiedByName",
        label: "Verified by (Name)",
        type: "text",
        group: "Author & Verifier",
        help: "e.g. Pooja Dhameja",
      },
      {
        name: "verifiedByUrl",
        label: "Verified by (Link / URL)",
        type: "text",
        group: "Author & Verifier",
        help: "e.g. https://linkedin.com/in/... or /about-us/",
      },
      {
        name: "verifiedByRole",
        label: "Verified by (Role / Title)",
        type: "text",
        group: "Author & Verifier",
        help: "e.g. Technical Manager",
      },
      {
        name: "author",
        label: "Written by (Author name)",
        type: "text",
        group: "Author & Verifier",
        help: "e.g. Rohit Mishra",
      },
      {
        name: "authorRole",
        label: "Written by (Role / Title)",
        type: "text",
        group: "Author & Verifier",
        help: "e.g. Testing Expert",
      },
      {
        name: "authorUrl",
        label: "Written by (Link / URL)",
        type: "text",
        group: "Author & Verifier",
      },
      {
        name: "reviewedByName",
        label: "Reviewed by (Name)",
        type: "text",
        group: "Author & Verifier",
        help: "e.g. Mr Vikas",
      },
      {
        name: "reviewedByRole",
        label: "Reviewed by (Role / Title)",
        type: "text",
        group: "Author & Verifier",
        help: "e.g. Sr Technical Consultant",
      },
      {
        name: "reviewedByUrl",
        label: "Reviewed by (Link / URL)",
        type: "text",
        group: "Author & Verifier",
      },
      {
        name: "coverMediaId",
        label: "Cover image",
        type: "media",
        group: "Content",
      },
      {
        name: "excerpt",
        label: "Excerpt",
        type: "textarea",
        wide: true,
        group: "Content",
      },
      {
        name: "body",
        label: "Body",
        type: "richtext",
        wide: true,
        group: "Content",
      },
      contentFields.seoTitle,
      contentFields.seoDescription,
      contentFields.status,
    ],
    schema: recordSchema({
      title: z.string().trim().min(1).max(300),
      slug,
      publishedAt: z.string().datetime().nullable(),
      updatedDateText: optionalText(100),
      verifiedByName: optionalText(200),
      verifiedByUrl: optionalText(500),
      verifiedByRole: optionalText(200),
      author: optionalText(200),
      authorRole: optionalText(200),
      authorUrl: optionalText(500),
      reviewedByName: optionalText(200),
      reviewedByRole: optionalText(200),
      reviewedByUrl: optionalText(500),
      coverMediaId: optionalUuid,
      excerpt: z.string().trim().max(100_000),
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
    description:
      "Photos and videos for the gallery grid, in the order they should appear.",
    searchColumns: ["title", "caption"],
    tableColumns: [
      { key: "title", label: "Title" },
      { key: "caption", label: "Caption" },
      { key: "sortOrder", label: "Order" },
    ],
    orderBy: { column: "sortOrder", direction: "asc" },
    fields: [
      { name: "title", label: "Title", type: "text", group: "Content" },
      {
        name: "caption",
        label: "Caption",
        type: "textarea",
        wide: true,
        group: "Content",
      },
      {
        name: "mediaId",
        label: "Image or video",
        type: "media",
        required: true,
        group: "Content",
      },
      {
        name: "sortOrder",
        label: "Sort order",
        type: "number",
        group: "Content",
        defaultValue: 0,
      },
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
      {
        name: "caption",
        label: "Caption",
        type: "textarea",
        wide: true,
        group: "Content",
      },
      {
        name: "mediaId",
        label: "Image",
        type: "media",
        required: true,
        group: "Content",
      },
      {
        name: "sortOrder",
        label: "Sort order",
        type: "number",
        group: "Content",
        defaultValue: 0,
      },
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
    description:
      "Quote requests and newsletter signups. A subject of Newsletter is a signup, not a product quote.",
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
      {
        name: "name",
        label: "Name",
        type: "text",
        required: true,
        group: "Enquiry",
      },
      {
        name: "email",
        label: "Email",
        type: "text",
        required: true,
        group: "Enquiry",
      },
      { name: "phone", label: "Phone", type: "text", group: "Enquiry" },
      { name: "company", label: "Company", type: "text", group: "Enquiry" },
      { name: "subject", label: "Subject", type: "text", group: "Enquiry" },
      {
        name: "message",
        label: "Message",
        type: "textarea",
        required: true,
        wide: true,
        group: "Enquiry",
      },
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
      {
        name: "productId",
        label: "Product",
        type: "relation",
        relation: "products",
        group: "Enquiry",
      },
      { name: "pagePath", label: "Page path", type: "text", group: "Enquiry" },
      {
        name: "sourcePage",
        label: "Source page",
        type: "text",
        group: "Enquiry",
      },
      {
        name: "sourceUrl",
        label: "Source URL",
        type: "text",
        wide: true,
        group: "Enquiry",
      },
      {
        name: "adminNotes",
        label: "Admin notes",
        type: "textarea",
        wide: true,
        group: "Enquiry",
      },
      {
        name: "assignedToId",
        label: "Assigned to",
        type: "relation",
        relation: "users",
        group: "Assignment",
      },
      {
        name: "teamId",
        label: "Team",
        type: "relation",
        relation: "teams",
        group: "Assignment",
      },
      {
        name: "priority",
        label: "Priority",
        type: "select",
        group: "Assignment",
        defaultValue: "normal",
        options: [
          { value: "low", label: "Low" },
          { value: "normal", label: "Normal" },
          { value: "high", label: "High" },
          { value: "urgent", label: "Urgent" },
        ],
      },
      {
        name: "nextFollowUpAt",
        label: "Next follow-up",
        type: "datetime",
        group: "Assignment",
      },
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
      assignedToId: optionalUuid,
      teamId: optionalUuid,
      priority: z.enum(["low", "normal", "high", "urgent"]),
      nextFollowUpAt: z.string().datetime().nullable(),
      status: z.enum([
        "new",
        "read",
        "archived",
        "contacted",
        "in_progress",
        "converted",
        "closed",
        "spam",
      ]),
    }),
  },
  companies: {
    key: "companies",
    label: "Companies",
    singular: "Company",
    description: "Customer organisations and their ownership.",
    searchColumns: ["name", "email", "phone", "industry"],
    tableColumns: [
      { key: "name", label: "Company" },
      { key: "industry", label: "Industry" },
      { key: "email", label: "Email" },
      { key: "updatedAt", label: "Updated" },
    ],
    orderBy: { column: "updatedAt", direction: "desc" },
    fields: [
      {
        name: "name",
        label: "Company name",
        type: "text",
        required: true,
        group: "Company",
      },
      { name: "industry", label: "Industry", type: "text", group: "Company" },
      { name: "website", label: "Website", type: "text", group: "Company" },
      { name: "email", label: "Email", type: "text", group: "Company" },
      { name: "phone", label: "Phone", type: "text", group: "Company" },
      {
        name: "address",
        label: "Address",
        type: "textarea",
        wide: true,
        group: "Company",
      },
      {
        name: "notes",
        label: "Internal notes",
        type: "textarea",
        wide: true,
        group: "Company",
      },
      {
        name: "ownerId",
        label: "Owner",
        type: "relation",
        relation: "users",
        group: "Assignment",
      },
      {
        name: "teamId",
        label: "Team",
        type: "relation",
        relation: "teams",
        group: "Assignment",
      },
      {
        name: "isActive",
        label: "Active",
        type: "checkbox",
        defaultValue: true,
        group: "Company",
      },
    ],
    schema: recordSchema({
      name: z.string().trim().min(1).max(200),
      industry: z.string().trim().max(160),
      website: optionalText(500),
      email: z.union([z.email(), z.literal("")]),
      phone: z.string().trim().max(50),
      address: z.string().trim().max(2000),
      notes: z.string().trim().max(5000),
      ownerId: optionalUuid,
      teamId: optionalUuid,
      isActive: z.boolean(),
    }),
  },
  contacts: {
    key: "contacts",
    label: "Customers",
    singular: "Customer",
    description: "Customer contacts linked with companies and sales owners.",
    searchColumns: ["name", "email", "phone", "designation"],
    tableColumns: [
      { key: "name", label: "Customer" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "updatedAt", label: "Updated" },
    ],
    orderBy: { column: "updatedAt", direction: "desc" },
    fields: [
      {
        name: "companyId",
        label: "Company",
        type: "relation",
        relation: "companies",
        group: "Customer",
      },
      {
        name: "name",
        label: "Name",
        type: "text",
        required: true,
        group: "Customer",
      },
      { name: "email", label: "Email", type: "text", group: "Customer" },
      { name: "phone", label: "Phone", type: "text", group: "Customer" },
      {
        name: "designation",
        label: "Designation",
        type: "text",
        group: "Customer",
      },
      {
        name: "notes",
        label: "Internal notes",
        type: "textarea",
        wide: true,
        group: "Customer",
      },
      {
        name: "ownerId",
        label: "Owner",
        type: "relation",
        relation: "users",
        group: "Assignment",
      },
      {
        name: "teamId",
        label: "Team",
        type: "relation",
        relation: "teams",
        group: "Assignment",
      },
      {
        name: "isActive",
        label: "Active",
        type: "checkbox",
        defaultValue: true,
        group: "Customer",
      },
    ],
    schema: recordSchema({
      companyId: optionalUuid,
      name: z.string().trim().min(1).max(200),
      email: z.union([z.email(), z.literal("")]),
      phone: z.string().trim().max(50),
      designation: z.string().trim().max(160),
      notes: z.string().trim().max(5000),
      ownerId: optionalUuid,
      teamId: optionalUuid,
      isActive: z.boolean(),
    }),
  },
  leads: {
    key: "leads",
    label: "Sales leads",
    singular: "Lead",
    description: "Qualified opportunities from enquiry through final outcome.",
    searchColumns: ["title", "description", "lostReason"],
    tableColumns: [
      { key: "title", label: "Opportunity" },
      { key: "stage", label: "Stage" },
      { key: "priority", label: "Priority" },
      { key: "nextFollowUpAt", label: "Next follow-up" },
    ],
    orderBy: { column: "updatedAt", direction: "desc" },
    fields: [
      {
        name: "title",
        label: "Opportunity title",
        type: "text",
        required: true,
        wide: true,
        group: "Lead",
      },
      {
        name: "description",
        label: "Requirement",
        type: "textarea",
        wide: true,
        group: "Lead",
      },
      {
        name: "inquiryId",
        label: "Source enquiry",
        type: "relation",
        relation: "inquiries",
        group: "Links",
      },
      {
        name: "companyId",
        label: "Company",
        type: "relation",
        relation: "companies",
        group: "Links",
      },
      {
        name: "contactId",
        label: "Customer",
        type: "relation",
        relation: "contacts",
        group: "Links",
      },
      {
        name: "stage",
        label: "Stage",
        type: "select",
        required: true,
        group: "Pipeline",
        defaultValue: "new",
        options: [
          "new",
          "assigned",
          "contacted",
          "qualified",
          "follow_up",
          "proposal",
          "negotiation",
          "won",
          "lost",
          "closed",
        ].map((value) => ({ value, label: value.replace("_", " ") })),
      },
      {
        name: "priority",
        label: "Priority",
        type: "select",
        required: true,
        group: "Pipeline",
        defaultValue: "normal",
        options: ["low", "normal", "high", "urgent"].map((value) => ({
          value,
          label: value,
        })),
      },
      {
        name: "estimatedValue",
        label: "Expected value (INR)",
        type: "number",
        group: "Pipeline",
      },
      {
        name: "nextFollowUpAt",
        label: "Next follow-up",
        type: "datetime",
        group: "Pipeline",
      },
      {
        name: "lostReason",
        label: "Lost/closed reason",
        type: "textarea",
        wide: true,
        group: "Pipeline",
      },
      {
        name: "ownerId",
        label: "Owner",
        type: "relation",
        relation: "users",
        group: "Assignment",
      },
      {
        name: "teamId",
        label: "Team",
        type: "relation",
        relation: "teams",
        group: "Assignment",
      },
    ],
    schema: recordSchema({
      title: z.string().trim().min(1).max(300),
      description: z.string().trim().max(10000),
      inquiryId: optionalUuid,
      companyId: optionalUuid,
      contactId: optionalUuid,
      stage: z.enum([
        "new",
        "assigned",
        "contacted",
        "qualified",
        "follow_up",
        "proposal",
        "negotiation",
        "won",
        "lost",
        "closed",
      ]),
      priority: z.enum(["low", "normal", "high", "urgent"]),
      estimatedValue: z.number().int().min(0).nullable(),
      nextFollowUpAt: z.string().datetime().nullable(),
      lostReason: z.string().trim().max(5000),
      ownerId: optionalUuid,
      teamId: optionalUuid,
    }),
  },
  "lead-activities": {
    key: "lead-activities",
    label: "Lead activities",
    singular: "Activity",
    description: "Calls, emails, meetings and internal notes.",
    searchColumns: ["subject", "details"],
    tableColumns: [
      { key: "subject", label: "Activity" },
      { key: "type", label: "Type" },
      { key: "occurredAt", label: "Occurred" },
    ],
    orderBy: { column: "occurredAt", direction: "desc" },
    fields: [
      {
        name: "leadId",
        label: "Lead",
        type: "relation",
        relation: "leads",
        required: true,
        group: "Activity",
      },
      {
        name: "type",
        label: "Type",
        type: "select",
        required: true,
        defaultValue: "note",
        options: [
          "call",
          "email",
          "meeting",
          "note",
          "status_change",
          "assignment",
        ].map((value) => ({ value, label: value.replace("_", " ") })),
        group: "Activity",
      },
      { name: "subject", label: "Subject", type: "text", group: "Activity" },
      {
        name: "details",
        label: "Details",
        type: "textarea",
        wide: true,
        group: "Activity",
      },
      {
        name: "occurredAt",
        label: "Date and time",
        type: "datetime",
        required: true,
        group: "Activity",
        defaultValue: new Date().toISOString(),
      },
      {
        name: "nextActionAt",
        label: "Next action",
        type: "datetime",
        group: "Activity",
      },
    ],
    schema: recordSchema({
      leadId: z.uuid(),
      type: z.enum([
        "call",
        "email",
        "meeting",
        "note",
        "status_change",
        "assignment",
      ]),
      subject: z.string().trim().max(300),
      details: z.string().trim().max(10000),
      occurredAt: z.string().datetime(),
      nextActionAt: z.string().datetime().nullable(),
    }),
  },
  "follow-ups": {
    key: "follow-ups",
    label: "Follow-ups",
    singular: "Follow-up",
    description: "Assigned next actions and overdue work.",
    searchColumns: ["title", "description"],
    tableColumns: [
      { key: "title", label: "Task" },
      { key: "status", label: "Status" },
      { key: "priority", label: "Priority" },
      { key: "dueAt", label: "Due" },
    ],
    orderBy: { column: "dueAt", direction: "asc" },
    fields: [
      {
        name: "leadId",
        label: "Lead",
        type: "relation",
        relation: "leads",
        required: true,
        group: "Follow-up",
      },
      {
        name: "title",
        label: "Task",
        type: "text",
        required: true,
        group: "Follow-up",
      },
      {
        name: "description",
        label: "Details",
        type: "textarea",
        wide: true,
        group: "Follow-up",
      },
      {
        name: "dueAt",
        label: "Due date",
        type: "datetime",
        required: true,
        group: "Follow-up",
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        defaultValue: "pending",
        options: [
          { value: "pending", label: "Pending" },
          { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
        ],
        group: "Follow-up",
      },
      {
        name: "priority",
        label: "Priority",
        type: "select",
        required: true,
        defaultValue: "normal",
        options: ["low", "normal", "high", "urgent"].map((value) => ({
          value,
          label: value,
        })),
        group: "Follow-up",
      },
      {
        name: "assignedToId",
        label: "Assigned to",
        type: "relation",
        relation: "users",
        group: "Assignment",
      },
      {
        name: "teamId",
        label: "Team",
        type: "relation",
        relation: "teams",
        group: "Assignment",
      },
    ],
    schema: recordSchema({
      leadId: z.uuid(),
      title: z.string().trim().min(1).max(300),
      description: z.string().trim().max(10000),
      dueAt: z.string().datetime(),
      status: z.enum(["pending", "completed", "cancelled"]),
      priority: z.enum(["low", "normal", "high", "urgent"]),
      assignedToId: optionalUuid,
      teamId: optionalUuid,
    }),
  },
  "blog-categories": {
    key: "blog-categories",
    label: "Blog categories",
    singular: "Blog category",
    description:
      "Saved for organisation. The public blog lists every published post and does not filter by these categories yet.",
    searchColumns: ["name", "slug"],
    tableColumns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "status", label: "Status" },
    ],
    orderBy: { column: "name", direction: "asc" },
    fields: [
      {
        name: "name",
        label: "Name",
        type: "text",
        required: true,
        group: "Content",
      },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        group: "Content",
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        wide: true,
        group: "Content",
      },
      { name: "imageId", label: "Image", type: "media", group: "Content" },
      { name: "metaTitle", label: "Meta title", type: "text", group: "SEO" },
      {
        name: "metaDescription",
        label: "Meta description",
        type: "textarea",
        wide: true,
        group: "SEO",
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        group: "Publishing",
        defaultValue: "draft",
        options: publishing,
      },
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
    description:
      "Saved with posts. The public blog does not filter by tags yet.",
    searchColumns: ["name", "slug"],
    tableColumns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
    ],
    orderBy: { column: "name", direction: "asc" },
    fields: [
      {
        name: "name",
        label: "Name",
        type: "text",
        required: true,
        group: "Content",
      },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        group: "Content",
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        wide: true,
        group: "Content",
      },
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
    description:
      "Not shown on the public gallery. Photos on /gallery/ come from Gallery photos.",
    searchColumns: ["title", "slug"],
    tableColumns: [
      { key: "title", label: "Title" },
      { key: "slug", label: "Slug" },
      { key: "status", label: "Status" },
      { key: "sortOrder", label: "Order" },
    ],
    orderBy: { column: "sortOrder", direction: "asc" },
    fields: [
      {
        name: "title",
        label: "Title",
        type: "text",
        required: true,
        group: "Content",
      },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        group: "Content",
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        wide: true,
        group: "Content",
      },
      {
        name: "coverImageId",
        label: "Cover image",
        type: "media",
        group: "Content",
      },
      {
        name: "sortOrder",
        label: "Sort order",
        type: "number",
        group: "Content",
        defaultValue: 0,
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        group: "Publishing",
        defaultValue: "draft",
        options: publishing,
      },
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
      {
        name: "title",
        label: "Title",
        type: "text",
        required: true,
        group: "Content",
      },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        group: "Content",
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        wide: true,
        group: "Content",
      },
      {
        name: "coverImageId",
        label: "Cover image",
        type: "media",
        group: "Content",
      },
      {
        name: "documentId",
        label: "Document",
        type: "media",
        group: "Content",
      },
      { name: "version", label: "Version", type: "text", group: "Content" },
      { name: "language", label: "Language", type: "text", group: "Content" },
      {
        name: "sortOrder",
        label: "Sort order",
        type: "number",
        group: "Content",
        defaultValue: 0,
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        group: "Publishing",
        defaultValue: "draft",
        options: publishing,
      },
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
    description:
      "Stored form definitions. The public contact form is built into the site and saves each submission under Inquiries.",
    searchColumns: ["name", "slug"],
    tableColumns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "isActive", label: "Active" },
    ],
    orderBy: { column: "name", direction: "asc" },
    fields: [
      {
        name: "name",
        label: "Name",
        type: "text",
        required: true,
        group: "Form",
      },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        group: "Form",
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        wide: true,
        group: "Form",
      },
      {
        name: "submitLabel",
        label: "Submit label",
        type: "text",
        group: "Form",
        defaultValue: "Submit",
      },
      {
        name: "successMessage",
        label: "Success message",
        type: "textarea",
        wide: true,
        group: "Form",
      },
      {
        name: "notificationEmail",
        label: "Notification email",
        type: "text",
        group: "Form",
      },
      {
        name: "isActive",
        label: "Active",
        type: "checkbox",
        group: "Form",
        defaultValue: true,
      },
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
      {
        name: "toPath",
        label: "To",
        type: "text",
        required: true,
        group: "Redirect",
      },
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
      {
        name: "note",
        label: "Note",
        type: "text",
        wide: true,
        group: "Redirect",
      },
      {
        name: "active",
        label: "Active",
        type: "checkbox",
        group: "Redirect",
        defaultValue: true,
      },
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
    description:
      "Header and footer links. For the Products hover list, use Site → Products menu.",
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
      {
        name: "label",
        label: "Label",
        type: "text",
        required: true,
        group: "Link",
      },
      { name: "itemSlug", label: "Slug", type: "slug", group: "Link" },
      {
        name: "href",
        label: "URL",
        type: "text",
        required: true,
        group: "Link",
        help: "/products/ or a full https URL.",
      },
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
      {
        name: "referenceId",
        label: "Reference ID",
        type: "text",
        group: "Link",
        help: "Target entity UUID when type is not custom URL.",
      },
      {
        name: "parentId",
        label: "Parent link",
        type: "relation",
        relation: "nav-links",
        group: "Link",
      },
      {
        name: "sortOrder",
        label: "Sort order",
        type: "number",
        group: "Link",
        defaultValue: 0,
      },
      {
        name: "isActive",
        label: "Active",
        type: "checkbox",
        group: "Link",
        defaultValue: true,
      },
      {
        name: "openInNewTab",
        label: "Open in a new tab",
        type: "checkbox",
        group: "Link",
        defaultValue: false,
      },
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
    description:
      "Super Admins manage account access, role level, and granular permissions.",
    searchColumns: ["name", "email"],
    tableColumns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "systemRole", label: "Role" },
      { key: "status", label: "Status" },
      { key: "updatedAt", label: "Updated" },
    ],
    orderBy: { column: "name", direction: "asc" },
    fields: [
      {
        name: "name",
        label: "Name",
        type: "text",
        required: true,
        group: "Account",
      },
      {
        name: "email",
        label: "Email",
        type: "text",
        required: true,
        group: "Account",
      },
      {
        name: "systemRole",
        label: "Authority level",
        type: "select",
        required: true,
        group: "Account",
        defaultValue: "staff",
        options: [
          { value: "super_admin", label: "Super Admin" },
          { value: "admin", label: "Admin" },
          { value: "staff", label: "Staff" },
        ],
      },
      {
        name: "status",
        label: "Account status",
        type: "select",
        required: true,
        group: "Account",
        defaultValue: "active",
        options: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive (sign-in blocked)" },
        ],
      },
      {
        name: "permissionOverrides",
        label: "Allowed areas",
        type: "permissionList",
        wide: true,
        group: "Permissions",
        help: "Super Admins always have complete access. For Admin and Staff, select only the areas required for their work.",
        options: [
          { value: "cms.pages.manage", label: "Pages and location pages" },
          { value: "cms.catalogue.manage", label: "Products and categories" },
          {
            value: "cms.content.manage",
            label: "Posts, galleries, certificates, catalogues and forms",
          },
          { value: "cms.navigation.manage", label: "Navigation and redirects" },
          {
            value: "cms.settings.manage",
            label: "Site, header, footer, contact and home settings",
          },
          { value: "media.manage", label: "Media library and uploads" },
          { value: "inquiries.view", label: "View enquiries" },
          { value: "inquiries.manage", label: "Manage enquiries" },
          {
            value: "crm.customers.view",
            label: "View customers and companies",
          },
          {
            value: "crm.customers.manage",
            label: "Manage customers and companies",
          },
          { value: "crm.leads.view", label: "View sales leads" },
          { value: "crm.leads.manage", label: "Manage sales leads" },
          { value: "crm.activities.manage", label: "Manage lead activities" },
          { value: "crm.tasks.manage", label: "Manage follow-up tasks" },
          { value: "crm.assign", label: "Assign CRM records" },
          { value: "crm.reports.view", label: "View CRM reports" },
          { value: "quotations.view", label: "View quotations" },
          { value: "quotations.create", label: "Create quotations" },
          {
            value: "quotations.edit",
            label: "Edit quotation drafts and revisions",
          },
          {
            value: "quotations.submit",
            label: "Submit quotations for approval",
          },
          {
            value: "quotations.approve",
            label: "Approve or reject quotations",
          },
          { value: "quotations.send", label: "Send approved quotations" },
          { value: "users.manage", label: "Manage users" },
          { value: "teams.manage", label: "Manage teams" },
          { value: "audit.view", label: "View activity history" },
        ],
      },
      {
        name: "crmVisibility",
        label: "CRM record visibility",
        type: "select",
        required: true,
        group: "Permissions",
        defaultValue: "assigned",
        options: [
          { value: "own", label: "Own records" },
          { value: "assigned", label: "Assigned records" },
          { value: "team", label: "Team records" },
          { value: "all", label: "All CRM records" },
        ],
        help: "Super Admin controls how much CRM data this user can see.",
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
      systemRole: z.enum(["super_admin", "admin", "staff"]),
      status: z.enum(["active", "inactive"]),
      permissionOverrides: z
        .array(
          z.enum([
            "cms.pages.manage",
            "cms.catalogue.manage",
            "cms.content.manage",
            "cms.navigation.manage",
            "cms.settings.manage",
            "media.manage",
            "inquiries.view",
            "inquiries.manage",
            "crm.customers.view",
            "crm.customers.manage",
            "crm.leads.view",
            "crm.leads.manage",
            "crm.activities.manage",
            "crm.tasks.manage",
            "crm.assign",
            "crm.reports.view",
            "quotations.view",
            "quotations.create",
            "quotations.edit",
            "quotations.submit",
            "quotations.approve",
            "quotations.send",
            "users.manage",
            "teams.manage",
            "audit.view",
          ]),
        )
        .max(30),
      crmVisibility: z.enum(["own", "assigned", "team", "all"]),
      password: z.string().max(200),
    }),
  },
  teams: {
    key: "teams",
    label: "Teams",
    singular: "Team",
    description:
      "Department groups used for responsibility and future sales/content workflow ownership.",
    searchColumns: ["name", "description"],
    tableColumns: [
      { key: "name", label: "Team" },
      { key: "description", label: "Description" },
      { key: "isActive", label: "Active" },
    ],
    orderBy: { column: "name", direction: "asc" },
    fields: [
      {
        name: "name",
        label: "Team name",
        type: "text",
        required: true,
        group: "Team",
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        wide: true,
        group: "Team",
      },
      {
        name: "isActive",
        label: "Active",
        type: "checkbox",
        group: "Team",
        defaultValue: true,
      },
      {
        name: "memberIds",
        label: "Members",
        type: "relationMany",
        relation: "users",
        wide: true,
        group: "Members",
      },
    ],
    schema: recordSchema({
      name: z.string().trim().min(1).max(120),
      description: z.string().trim().max(2000),
      isActive: z.boolean(),
      memberIds: z.array(z.uuid()).max(100),
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
    fields: [
      {
        name: "alt",
        label: "Alt text",
        type: "text",
        wide: true,
        group: "File",
      },
    ],
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
    else if (
      field.type === "mediaMany" ||
      field.type === "relationMany" ||
      field.type === "specs"
    )
      values[field.name] = [];
    else if (field.type === "number") values[field.name] = 0;
    else values[field.name] = "";
  }
  return values;
}

const jsonFields = new Set(["mediaMany", "relationMany", "specs"]);

export function readFormData(resource: ResourceKey, formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const field of resources[resource].fields) {
    if (field.type === "permissionList") {
      raw[field.name] = formData.getAll(field.name).map(String);
      continue;
    }
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

export function parseResource(
  resource: ResourceKey,
  raw: Record<string, unknown>,
) {
  const parsed = resources[resource].schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.[0];
    const label = resources[resource].fields.find(
      (item) => item.name === field,
    )?.label;
    throw new CmsError(
      label
        ? `${label}: ${issue?.message ?? "Invalid value."}`
        : (issue?.message ?? "Check the form."),
    );
  }
  const data = parsed.data as Record<string, unknown>;
  // City pages imported related-blog cards into the body. Strip them on save
  // so the CMS never reintroduces legacy embeds.
  if (resource === "locations" && typeof data.body === "string") {
    data.body = removeLegacyBlogEmbed(data.body);
  }
  return data;
}
