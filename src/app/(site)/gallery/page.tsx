import type { Metadata } from "next";
import { AboutReveal } from "@/components/site/about-reveal";
import { contentMetadata } from "@/components/site/content-view";
import { GalleryGrid, type GalleryCard } from "@/components/site/gallery-grid";
import {
  extractYoutubeVideos,
  youtubeEmbedUrl,
  youtubeThumbUrl,
} from "@/lib/cms/gallery-videos";
import { galleryForSite, getSettings } from "@/lib/cms/queries";
import { resolvePublishedContentByPath } from "@/lib/cms/published-content";
import { getSite } from "@/lib/cms/site";
import { isVideoMimeType } from "@/lib/media-upload";
import { mediaDeliveryUrl } from "@/lib/media-url";
import { siteOrigin } from "@/lib/paths";
import { getDb } from "@/db";
import { pages } from "@/db/schema";
import { eq } from "drizzle-orm";

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

async function galleryVideosFromCms() {
  const db = getDb();
  const [row] = await db
    .select({
      body: pages.body,
      customContent: pages.customContent,
    })
    .from(pages)
    .where(eq(pages.path, "gallery"))
    .limit(1);
  const stored = row?.customContent?.galleryVideos;
  if (Array.isArray(stored) && stored.length) {
    return stored.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as { id?: unknown; title?: unknown };
      if (typeof record.id !== "string" || !record.id) return [];
      return [
        {
          id: record.id,
          title:
            typeof record.title === "string" && record.title.trim()
              ? record.title
              : "Gallery video",
        },
      ];
    });
  }
  return extractYoutubeVideos(row?.body || "").map((item) => ({
    id: item.id,
    title: item.title,
  }));
}

export default async function GalleryPage() {
  const [items, page, videos] = await Promise.all([
    galleryForSite(),
    resolvePublishedContentByPath("gallery"),
    galleryVideosFromCms(),
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
  const hasContent = cards.length > 0 || videos.length > 0;

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
        {videos.length ? (
          <section className="gallery-videos about-in">
            <div className="media-library__heading">
              <div>
                <p className="section-label">Video</p>
                <h2>Watch our hydraulic systems in action</h2>
              </div>
            </div>
            <ul className="gallery-video-grid">
              {videos.map((video) => (
                <li key={video.id}>
                  <div className="gallery-video-card">
                    <iframe
                      src={youtubeEmbedUrl(video.id)}
                      title={video.title}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={youtubeThumbUrl(video.id)}
                      alt=""
                      className="gallery-video-card__fallback"
                      hidden
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="media-library__heading about-in">
          <div>
            <p className="section-label">Manufacturing &amp; installations</p>
            <h2>
              {videos.length ? "Images" : "Built with Precision. Proven in Industry."}
            </h2>
          </div>
          <p>
            Every image represents the people, processes and engineering behind
            our hydraulic solutions.
          </p>
        </div>
        {cards.length ? (
          <GalleryGrid items={cards} />
        ) : !hasContent ? (
          <div className="cms-empty-state">
            <span>Gallery</span>
            <h2>Your project gallery is ready</h2>
            <p>
              Add images or videos from Admin → Gallery. They will automatically
              appear in this professional layout.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
