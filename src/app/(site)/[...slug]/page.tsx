import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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
  const content = await resolvePublishedContent(slug);
  if (!content) return { robots: noIndexRobots };
  const site = await getSite();
  return contentMetadata(content, site.settings.companyName);
}

export default async function CmsRoutePage({
  params,
  searchParams,
}: PageProps & { searchParams: Promise<{ product?: string }> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const requestPath = `/${slug.join("/")}/`;
  const rule = await findActiveRedirect(requestPath);
  if (rule) {
    if (/^https?:\/\//i.test(rule.toPath)) redirect(rule.toPath);
    redirect(rule.toPath);
  }

  const content = await resolvePublishedContent(slug);
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
      inquirySubject={query.product ?? ""}
    />
  );
}
