import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { fallbackAboutContent } from "@/components/site/about-view";
import { ContentView, contentMetadata } from "@/components/site/content-view";
import { cataloguesForSite, getCataloguePdfUrl } from "@/lib/cms/queries";
import {
  findActiveRedirect,
  getSite,
  resolvePublishedContent,
} from "@/lib/cms/site";
import { noIndexRobots } from "@/lib/seo-robots";

type PageProps = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const content =
    (await resolvePublishedContent(slug)) ??
    (slug.length === 1 && slug[0] === "about-us" ? fallbackAboutContent : null);
  if (!content) return { robots: noIndexRobots };
  const site = await getSite();
  return contentMetadata(content, site.settings.companyName);
}

export default async function CmsRoutePage({
  params,
  searchParams,
}: PageProps & { searchParams: Promise<{ product?: string; productId?: string }> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const requestPath = `/${slug.join("/")}/`;
  const rule = await findActiveRedirect(requestPath);
  if (rule) {
    if (/^https?:\/\//i.test(rule.toPath)) redirect(rule.toPath);
    redirect(rule.toPath);
  }

  const content =
    (await resolvePublishedContent(slug)) ??
    (slug.length === 1 && slug[0] === "about-us" ? fallbackAboutContent : null);
  if (!content) notFound();

  const cataloguePdfUrl =
    content.kind === "page" && content.path === "catalogue"
      ? await getCataloguePdfUrl()
      : null;
  const catalogues =
    content.kind === "page" && content.path === "catalogue"
      ? await cataloguesForSite()
      : [];

  return (
    <ContentView
      content={content}
      cataloguePdfUrl={cataloguePdfUrl}
      catalogues={catalogues}
      inquiryProductId={query.productId}
      inquirySubject={query.product ?? ""}
    />
  );
}
