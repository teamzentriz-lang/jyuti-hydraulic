import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ContentView, contentMetadata } from "@/components/site/content-view";
import { getCataloguePdfUrl } from "@/lib/cms/queries";
import { findActiveRedirect, getSite, resolvePublishedContent } from "@/lib/cms/site";

type PageProps = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const content = await resolvePublishedContent(slug);
  if (!content) return {};
  const site = await getSite();
  return contentMetadata(content, site.settings.companyName);
}

export default async function CmsRoutePage({ params }: PageProps) {
  const { slug } = await params;
  const requestPath = `/${slug.join("/")}/`;
  const rule = await findActiveRedirect(requestPath);
  if (rule) {
    if (/^https?:\/\//i.test(rule.toPath)) redirect(rule.toPath);
    redirect(rule.toPath);
  }

  const content = await resolvePublishedContent(slug);
  if (!content) notFound();

  const cataloguePdfUrl =
    content.kind === "page" && content.path === "catalogue" ? await getCataloguePdfUrl() : null;

  return <ContentView content={content} cataloguePdfUrl={cataloguePdfUrl} />;
}
