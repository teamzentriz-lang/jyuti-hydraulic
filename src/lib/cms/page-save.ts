import { z } from "zod";
import { CmsError } from "@/db/errors";

const slug = z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const pathValue = z.string().trim().min(1).max(400).regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/);
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

export function readPageScalars(formData: FormData) {
  const text = (name: string) => String(formData.get(name) ?? "");
  const schema = z.object({
    title: z.string().trim().min(1).max(300),
    slug,
    path: pathValue,
    pageType: z.string().trim().max(80),
    excerpt: z.string().trim().max(100_000),
    shortDescription: z.string().trim().max(100_000),
    body: z.string().max(500_000),
    heroMediaId: optionalUuid,
    featuredImageId: optionalUuid,
    seoTitle: optionalText(300),
    seoDescription: optionalText(500),
    ogTitle: optionalText(300),
    ogDescription: optionalText(500),
    ogImageId: optionalUuid,
    twitterTitle: optionalText(300),
    twitterDescription: optionalText(500),
    twitterImageId: optionalUuid,
    breadcrumbsEnabled: z.boolean(),
    status: z.enum(["draft", "published"]),
  });
  const parsed = schema.safeParse({
    title: text("title"),
    slug: text("slug"),
    path: text("path"),
    pageType: text("pageType") || "custom",
    excerpt: text("excerpt"),
    shortDescription: text("shortDescription"),
    body: text("body"),
    heroMediaId: text("heroMediaId") || null,
    featuredImageId: text("featuredImageId") || null,
    seoTitle: text("seoTitle") || null,
    seoDescription: text("seoDescription") || null,
    ogTitle: text("ogTitle") || null,
    ogDescription: text("ogDescription") || null,
    ogImageId: text("ogImageId") || null,
    twitterTitle: text("twitterTitle") || null,
    twitterDescription: text("twitterDescription") || null,
    twitterImageId: text("twitterImageId") || null,
    breadcrumbsEnabled: formData.get("breadcrumbsEnabled") === "on",
    status: text("status") || "draft",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0] ? String(issue.path[0]) : "Page";
    const labels: Record<string, string> = {
      title: "Title",
      slug: "Slug",
      path: "URL path",
      excerpt: "Excerpt",
      shortDescription: "Short description",
      body: "Body",
    };
    throw new CmsError(
      `${labels[field] ?? field}: ${issue?.message ?? "check this field."}`,
    );
  }
  return parsed.data;
}
