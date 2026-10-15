import type { Metadata } from "next";
import { AboutReveal } from "@/components/site/about-reveal";
import { CmsImage } from "@/components/site/cms-image";
import {
  cataloguesForSite,
  getCataloguePdfUrl,
  getSettings,
  getSiteLabels,
} from "@/lib/cms/queries";
import { siteOrigin } from "@/lib/paths";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, labels] = await Promise.all([
    getSettings(),
    getSiteLabels(),
  ]);
  return {
    title: labels.catalogueTitle,
    description: labels.catalogueDescription,
    alternates: { canonical: `${siteOrigin()}/catalogue/` },
    robots: { index: true, follow: true },
  };
}

export default async function CataloguePage() {
  const [catalogues, pdfUrl, labels] = await Promise.all([
    cataloguesForSite(),
    getCataloguePdfUrl(),
    getSiteLabels(),
  ]);
  return (
    <main className="listing-page catalogue-library-page motion-page">
      <AboutReveal />
      <div className="site-page-banner">
        <div className="site-container page-banner-inner">
          <p className="page-kicker about-in">{labels.catalogueEyebrow}</p>
          <h1 className="about-in" style={{ animationDelay: "80ms" }}>
            {labels.catalogueTitle}
          </h1>
          <p className="about-in" style={{ animationDelay: "160ms" }}>
            {labels.catalogueDescription}
          </p>
        </div>
      </div>
      <div className="site-container catalogue-page__content">
        <div className="catalogue-library__heading about-in">
          <div>
            <p className="section-label">{labels.catalogueSectionEyebrow}</p>
            <h2>{labels.catalogueSectionTitle}</h2>
          </div>
          <p>{labels.catalogueSectionDescription}</p>
        </div>
        {catalogues.length ? (
          <ul className="catalogue-library__grid">
            {catalogues.map((item, index) => (
              <li
                key={item.id}
                className="document-card doc-item"
                style={{ animationDelay: `${(index % 6) * 80}ms` }}
              >
                <div className="document-card__cover">
                  {item.cover ? (
                    <CmsImage item={item.cover} alt={item.title} />
                  ) : (
                    <div className="document-card__placeholder">
                      <span>JYOTI</span>
                      <strong>
                        Product
                        <br />
                        Catalogue
                      </strong>
                      <small>Hydraulic Engineering</small>
                    </div>
                  )}
                  <span className="document-card__format">PDF</span>
                </div>
                <div className="document-card__body">
                  <div className="document-card__meta">
                    {item.language ? <span>{item.language}</span> : null}
                    {item.version ? <span>Version {item.version}</span> : null}
                  </div>
                  <h3>{item.title}</h3>
                  <p>
                    {item.description ||
                      "Product details, specifications and technical information."}
                  </p>
                  {item.documentUrl ? (
                    <a
                      href={item.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Catalogue <span aria-hidden>↗</span>
                    </a>
                  ) : (
                    <span className="document-card__pending">
                      Document will be available soon
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : pdfUrl ? (
          <article className="catalogue-stage">
            <a
              className="catalogue-book"
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open the Jyoti Hydraulic product catalogue"
            >
              <span className="catalogue-book__sheet" aria-hidden />
              <span className="catalogue-book__cover">
                <span>JYOTI</span>
                <strong>
                  Product
                  <br />
                  Catalogue
                </strong>
                <small>Hydraulic Engineering</small>
                <em>PDF</em>
              </span>
            </a>
            <div
              className="catalogue-stage__copy about-in"
              style={{ animationDelay: "120ms" }}
            >
              <p className="section-label">Company catalogue</p>
              <h2>Explore Our Complete Product Range</h2>
              <p>
                View hydraulic products, technical details and application
                information in the latest Jyoti Hydraulic catalogue.
              </p>
              <ul>
                <li>Product ranges and configurations</li>
                <li>Technical specifications</li>
                <li>Application notes for industrial use</li>
              </ul>
              <a
                className="site-btn-primary"
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Catalogue <span aria-hidden>↗</span>
              </a>
            </div>
          </article>
        ) : (
          <div className="cms-empty-state">
            <span>Catalogue library</span>
            <h2>Your download centre is ready</h2>
            <p>
              Create a published record under Admin → Catalogues, then add a
              cover image and PDF. It will appear here automatically.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
