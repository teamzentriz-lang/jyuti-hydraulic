import type { Metadata } from "next";
import { CmsImage } from "@/components/site/cms-image";
import { CmsPageIntro } from "@/components/site/cms-page-intro";
import { contentMetadata } from "@/components/site/content-view";
import { certificatesForSite, getSettings } from "@/lib/cms/queries";
import { resolvePublishedContentByPath } from "@/lib/cms/published-content";
import { getSite } from "@/lib/cms/site";

export async function generateMetadata(): Promise<Metadata> {
  const content = await resolvePublishedContentByPath("certificates");
  if (content) {
    const site = await getSite();
    return contentMetadata(content, site.settings.companyName);
  }
  const settings = await getSettings();
  return { title: `Certificates | ${settings.companyName}` };
}

export default async function CertificatesPage() {
  const [items, cmsPage] = await Promise.all([certificatesForSite(), resolvePublishedContentByPath("certificates")]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <CmsPageIntro content={cmsPage} />
      {!cmsPage ? (
        <>
          <h1 className="text-4xl font-semibold text-navy">Certificates</h1>
          <p className="mt-3 text-muted">Quality and compliance documents.</p>
        </>
      ) : null}
      {items.length ? (
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-line bg-white p-3 text-center">
              {item.media ? (
                <CmsImage item={item.media} alt={item.title} className="mx-auto aspect-[3/4] w-full max-w-[180px] object-contain" />
              ) : null}
              <p className="mt-3 text-sm font-semibold text-navy">{item.title}</p>
              {item.caption ? <p className="mt-1 text-xs text-muted">{item.caption}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-sm text-muted">No certificates yet. Add them under Certificates in the admin.</p>
      )}
    </main>
  );
}
