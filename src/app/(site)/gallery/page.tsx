import type { Metadata } from "next";
import { AboutReveal } from "@/components/site/about-reveal";
import { contentMetadata } from "@/components/site/content-view";
import { GalleryGrid, type GalleryCard } from "@/components/site/gallery-grid";
import { galleryForSite, getSettings } from "@/lib/cms/queries";
import { resolvePublishedContentByPath } from "@/lib/cms/published-content";
import { getSite } from "@/lib/cms/site";
import { isVideoMimeType } from "@/lib/media-upload";
import { mediaDeliveryUrl } from "@/lib/media-url";
import { siteOrigin } from "@/lib/paths";

export async function generateMetadata(): Promise<Metadata> {
  const content = await resolvePublishedContentByPath("gallery");
  if (content)
    return contentMetadata(content, (await getSite()).settings.companyName);
  return {
    title: `Gallery | ${(await getSettings()).companyName}`,
    alternates: { canonical: `${siteOrigin()}/gallery/` },
    robots: { index: true, follow: true },
  };
}

export default async function GalleryPage() {
  const [items, page] = await Promise.all([
    galleryForSite(),
    resolvePublishedContentByPath("gallery"),
  ]);
  const rawSummary = page?.summary?.trim() ?? "";
  const summary =
    rawSummary.length > 40 &&
    rawSummary.length < 180 &&
    /[.!?]/.test(rawSummary)
      ? rawSummary
      : "A closer look at our manufacturing capabilities, hydraulic systems, installations and engineering work.";
  const cards: GalleryCard[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    caption: item.caption,
    src: item.media ? mediaDeliveryUrl(item.media) : null,
    kind: !item.media
      ? "empty"
      : isVideoMimeType(item.media.mimeType)
        ? "video"
        : "image",
  }));

  return (
    <main className="listing-page gallery-page motion-page">
      <AboutReveal />
      <div className="site-page-banner">
        <div className="site-container page-banner-inner">
          <p className="page-kicker about-in">Inside Jyoti Hydraulic</p>
          <h1 className="about-in" style={{ animationDelay: "80ms" }}>
            {page?.title || "Our Work in Action"}
          </h1>
          <p className="about-in" style={{ animationDelay: "160ms" }}>
            {summary}
          </p>
        </div>
      </div>
      <div className="site-container media-library">
        <div className="media-library__heading about-in">
          <div>
            <p className="section-label">Manufacturing &amp; installations</p>
            <h2>Built with Precision. Proven in Industry.</h2>
          </div>
          <p>
            Every image represents the people, processes and engineering behind
            our hydraulic solutions.
          </p>
        </div>
        {cards.length ? (
          <GalleryGrid items={cards} />
        ) : (
          <div className="cms-empty-state">
            <span>Gallery</span>
            <h2>Your project gallery is ready</h2>
            <p>
              Add images or videos from Admin → Gallery. They will automatically
              appear in this professional layout.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
