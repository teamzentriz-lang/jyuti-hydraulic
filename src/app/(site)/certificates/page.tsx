import type { Metadata } from "next";
import { AboutReveal } from "@/components/site/about-reveal";
import {
  CertificateBoard,
  type CertificateCard,
} from "@/components/site/certificate-board";
import { contentMetadata } from "@/components/site/content-view";
import { certificatesForSite, getSettings } from "@/lib/cms/queries";
import { resolvePublishedContentByPath } from "@/lib/cms/published-content";
import { getSite } from "@/lib/cms/site";
import { mediaDeliveryUrl } from "@/lib/media-url";
import { siteOrigin } from "@/lib/paths";

export async function generateMetadata(): Promise<Metadata> {
  const content = await resolvePublishedContentByPath("certificates");
  if (content)
    return contentMetadata(content, (await getSite()).settings.companyName);
  return {
    title: `Certificates | ${(await getSettings()).companyName}`,
    alternates: { canonical: `${siteOrigin()}/certificates/` },
    robots: { index: true, follow: true },
  };
}

export default async function CertificatesPage() {
  const [items, page] = await Promise.all([
    certificatesForSite(),
    resolvePublishedContentByPath("certificates"),
  ]);
  const rawSummary = page?.summary?.trim() ?? "";
  const summary =
    rawSummary.length > 40 &&
    rawSummary.length < 180 &&
    /[.!?]/.test(rawSummary)
      ? rawSummary
      : "Quality systems, compliance standards and certifications that support dependable hydraulic manufacturing.";
  const cards: CertificateCard[] = items
    .filter(
      (item) => !/(?:&#8211;|&ndash;|–|—)\s*Jyoti Hydraulic/i.test(item.title),
    )
    .map((item) => ({
      id: item.id,
      title: item.title,
      caption: item.caption,
      src: item.media ? mediaDeliveryUrl(item.media) : null,
    }));
  return (
    <main className="listing-page certificates-page motion-page">
      <AboutReveal />
      <div className="site-page-banner">
        <div className="site-container page-banner-inner">
          <p className="page-kicker about-in">Quality assurance</p>
          <h1 className="about-in" style={{ animationDelay: "80ms" }}>
            {page?.title || "Certifications & Compliance"}
          </h1>
          <p className="about-in" style={{ animationDelay: "160ms" }}>
            {summary}
          </p>
        </div>
      </div>
      <div className="site-container certificate-library">
        <div className="certificate-intro about-in">
          <span className="certificate-intro__mark">✓</span>
          <div>
            <p className="section-label">Verified quality</p>
            <h2>Standards You Can Trust</h2>
            <p>
              Our certificates reflect a continued commitment to quality,
              consistency and responsible manufacturing.
            </p>
          </div>
        </div>
        {cards.length ? (
          <CertificateBoard items={cards} />
        ) : (
          <div className="cms-empty-state">
            <span>Certificates</span>
            <h2>Certificate showcase is ready</h2>
            <p>
              Upload certificate images from Admin → Certificates and they will
              populate this layout automatically.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
