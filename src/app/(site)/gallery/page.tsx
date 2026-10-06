import type { Metadata } from "next";
import { CmsMedia } from "@/components/site/cms-media";
import { CmsPageIntro } from "@/components/site/cms-page-intro";
import { contentMetadata } from "@/components/site/content-view";
import { galleryForSite, getSettings } from "@/lib/cms/queries";
import { resolvePublishedContentByPath } from "@/lib/cms/published-content";
import { getSite } from "@/lib/cms/site";

export async function generateMetadata(): Promise<Metadata> {
  const content = await resolvePublishedContentByPath("gallery");
  if (content) {
    const site = await getSite();
    return contentMetadata(content, site.settings.companyName);
  }
  const settings = await getSettings();
  return { title: `Gallery | ${settings.companyName}` };
}

export default async function GalleryPage() {
  const [items, cmsPage] = await Promise.all([galleryForSite(), resolvePublishedContentByPath("gallery")]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <CmsPageIntro content={cmsPage} />
      {!cmsPage ? (
        <>
          <h1 className="text-4xl font-semibold text-navy">Gallery</h1>
          <p className="mt-3 text-muted">Photos and videos from the shop floor and installations.</p>
        </>
      ) : null}
      {items.length ? (
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-lg border border-line bg-white">
              {item.media ? (
                <CmsMedia item={item.media} alt={item.title} className="aspect-[4/3] w-full object-cover" />
              ) : null}
              <div className="p-3">
                <p className="font-semibold text-navy">{item.title || "Gallery item"}</p>
                {item.caption ? <p className="mt-1 text-sm text-muted">{item.caption}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-sm text-muted">No gallery items yet. Add photos or videos under Gallery in the admin.</p>
      )}
    </main>
  );
}
