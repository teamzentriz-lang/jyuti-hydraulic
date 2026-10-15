import type { FieldDef } from "@/lib/cms/resources";

export const seoFieldGroup = "SEO";

export const seoFields: FieldDef[] = [
  { name: "seoTitle", label: "Meta title", type: "text", group: seoFieldGroup },
  {
    name: "seoDescription",
    label: "Meta description",
    type: "textarea",
    wide: true,
    group: seoFieldGroup,
  },
  {
    name: "focusKeyword",
    label: "Meta keywords",
    type: "text",
    group: seoFieldGroup,
    help: "Comma-separated keywords, for example: hydraulic press, baling machine, Faridabad",
  },
  {
    name: "canonicalUrl",
    label: "Canonical URL",
    type: "text",
    wide: true,
    group: seoFieldGroup,
  },
  {
    name: "robotsIndex",
    label: "Allow indexing",
    type: "checkbox",
    group: seoFieldGroup,
    defaultValue: true,
  },
  {
    name: "robotsFollow",
    label: "Allow following links",
    type: "checkbox",
    group: seoFieldGroup,
    defaultValue: true,
  },
  {
    name: "ogTitle",
    label: "Open Graph title",
    type: "text",
    group: seoFieldGroup,
  },
  {
    name: "ogDescription",
    label: "Open Graph description",
    type: "textarea",
    wide: true,
    group: seoFieldGroup,
  },
  {
    name: "ogImageId",
    label: "Open Graph image",
    type: "media",
    group: seoFieldGroup,
  },
  {
    name: "twitterTitle",
    label: "Twitter title",
    type: "text",
    group: seoFieldGroup,
  },
  {
    name: "twitterDescription",
    label: "Twitter description",
    type: "textarea",
    wide: true,
    group: seoFieldGroup,
  },
  {
    name: "twitterImageId",
    label: "Twitter image",
    type: "media",
    group: seoFieldGroup,
  },
  {
    name: "schemaType",
    label: "Schema.org type",
    type: "text",
    group: seoFieldGroup,
  },
];

export const seoSchemaShape = {
  seoTitle: true,
  seoDescription: true,
  focusKeyword: true,
  canonicalUrl: true,
  robotsIndex: true,
  robotsFollow: true,
  ogTitle: true,
  ogDescription: true,
  ogImageId: true,
  twitterTitle: true,
  twitterDescription: true,
  twitterImageId: true,
  schemaType: true,
} as const;
