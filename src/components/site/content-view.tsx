import Link from "next/link";
import { AboutView } from "@/components/site/about-view";
import { CategoryListing } from "@/components/site/category-listing";
import { ContactSection } from "@/components/site/contact-section";
import { ProductDetail } from "@/components/site/product-detail";
import { StoryView } from "@/components/site/story-view";
import { CmsImage } from "@/components/site/cms-image";
import { OpenPdfInNewTab } from "@/components/site/open-pdf-tab";
import { PageSectionsView } from "@/components/site/page-sections-view";
import { ProductCard } from "@/components/site/product-card";
import { RichTextHtml } from "@/components/site/rich-text-html";
import { cleanPublicTitle } from "@/lib/cms/clean-copy";
import type { PublishedContent } from "@/lib/cms/published-content";
import { decodeHtmlEntities, decodeOptionalHtml } from "@/lib/html-entities";
import { mediaDeliveryUrl } from "@/lib/media-url";
import { publicPath, siteOrigin } from "@/lib/paths";
import type { MediaItem } from "@/lib/cms/queries";

type CatalogueCard = {
  id: string;
  title: string;
  description: string;
  version: string;
  language: string;
  cover: MediaItem | null;
  documentUrl: string | null;
};

export function ContentView({
  content,
  cataloguePdfUrl = null,
  catalogues = [],
  inquirySubject = "",
}: {
  content: PublishedContent;
  cataloguePdfUrl?: string | null;
  catalogues?: CatalogueCard[];
  inquirySubject?: string;
}) {
  if (content.kind === "product") return <ProductDetail content={content} />;
  if (content.kind === "category") return <CategoryListing content={content} />;
  if (
    content.kind === "post" ||
    content.kind === "location" ||
    content.kind === "export"
  ) {
    return <StoryView content={content} />;
  }
  if (
    content.kind === "page" &&
    (content.path === "about-us" || content.path === "about")
  ) {
    return <AboutView content={content} />;
  }
  if (content.kind === "page" && content.path === "contact") {
    return (
      <ContactSection subject={inquirySubject} pagePath={`/${content.path}/`} />
    );
  }

  const isCatalogue = content.kind === "page" && content.path === "catalogue";
  const bannerSummary = content.summary;

  return (
    <main className={`content-page content-page--${content.kind}`}>
      <div className="site-page-banner">
        <div className="site-container page-banner-inner">
          <p className="page-kicker">Jyoti Hydraulic</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {cleanPublicTitle(content.title)}
          </h1>
          {bannerSummary ? (
            <p className="mt-3 max-w-3xl text-base leading-7 text-white/85">
              {bannerSummary}
            </p>
          ) : null}
        </div>
      </div>
      <div className="site-container content-canvas">
        {content.hero ? (
          <CmsImage
            item={content.hero}
            alt={content.title}
            className="mb-8 w-full rounded-sm border border-line object-cover"
          />
        ) : null}
        {content.cover ? (
          <CmsImage
            item={content.cover}
            alt={content.title}
            className="mb-8 w-full rounded-lg border border-line object-cover"
          />
        ) : null}
        {content.image ? (
          <CmsImage
            item={content.image}
            alt={content.title}
            className="mb-8 max-h-80 w-full rounded-lg border border-line object-cover"
          />
        ) : null}

        {content.meta?.locationName ? (
          <p className="mt-2 text-sm text-muted">
            {content.meta.locationName}
            {content.meta.region ? ` · ${content.meta.region}` : ""}
          </p>
        ) : null}
        {content.meta?.country ? (
          <p className="mt-2 text-sm text-muted">
            {content.meta.country}
            {content.meta.productLine ? ` · ${content.meta.productLine}` : ""}
          </p>
        ) : null}

        {content.body.trim() ? (
          <RichTextHtml
            html={content.body}
            className="rich-text mt-8 max-w-3xl"
          />
        ) : null}

        {isCatalogue && catalogues.length ? (
          <section className="catalogue-library mt-4">
            <div className="catalogue-library__heading">
              <div>
                <p className="section-label">Download centre</p>
                <h2>Product Catalogues &amp; Documents</h2>
              </div>
              <p>
                Select a catalogue to view specifications, product ranges and
                technical information.
              </p>
            </div>
            <ul className="catalogue-library__grid">
              {catalogues.map((item) => (
                <li key={item.id} className="document-card">
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
                      {item.version ? (
                        <span>Version {item.version}</span>
                      ) : null}
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
          </section>
        ) : isCatalogue && cataloguePdfUrl ? (
          <section className="catalogue-fallback mt-8">
            <OpenPdfInNewTab url={cataloguePdfUrl} />
            <div>
              <p className="section-label">Company catalogue</p>
              <h2>Explore Our Complete Product Range</h2>
              <p>
                View hydraulic products, technical details and application
                information in our latest catalogue.
              </p>
              <a
                href={cataloguePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="site-btn-primary"
              >
                Open Catalogue <span aria-hidden>↗</span>
              </a>
            </div>
          </section>
        ) : null}

        {content.detailBlocks?.map((block) => (
          <section key={block.heading} className="mt-10 max-w-3xl">
            <h2 className="text-xl font-semibold text-navy">{block.heading}</h2>
            <RichTextHtml html={block.html} className="rich-text mt-4" />
          </section>
        ))}

        {content.features?.length ? (
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-navy">Features</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {content.features.map((item, index) => (
                <li
                  key={`${item.title}-${index}`}
                  className="rounded-lg border border-line p-4"
                >
                  {item.image ? (
                    <CmsImage
                      item={item.image}
                      alt={item.title}
                      className="mb-3 aspect-video w-full rounded-md object-cover"
                    />
                  ) : item.icon ? (
                    <CmsImage
                      item={item.icon}
                      alt=""
                      className="mb-3 h-10 w-10 object-contain"
                    />
                  ) : null}
                  {item.title ? (
                    <h3 className="font-semibold text-navy">{item.title}</h3>
                  ) : null}
                  {item.description ? (
                    <p className="mt-2 text-sm text-muted">
                      {item.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {content.applications?.length ? (
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-navy">Applications</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {content.applications.map((item, index) => (
                <li
                  key={`${item.title}-${index}`}
                  className="rounded-lg border border-line p-4"
                >
                  {item.image ? (
                    <CmsImage
                      item={item.image}
                      alt={item.title}
                      className="mb-3 aspect-video w-full rounded-md object-cover"
                    />
                  ) : null}
                  {item.title ? (
                    <h3 className="font-semibold text-navy">{item.title}</h3>
                  ) : null}
                  {item.description ? (
                    <p className="mt-2 text-sm text-muted">
                      {item.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {content.specs?.length ? (
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-navy">Specifications</h2>
            <table className="mt-4 w-full max-w-3xl border-collapse text-sm">
              <tbody>
                {content.specs.map((row) => (
                  <tr key={`${row.label}-${row.value}`}>
                    <th className="border border-line bg-paper px-3 py-2 text-left font-semibold">
                      {row.label}
                    </th>
                    <td className="border border-line px-3 py-2">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {content.gallery?.length ? (
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-navy">Gallery</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {content.gallery.map((item) => (
                <CmsImage
                  key={item.id}
                  item={item}
                  className="aspect-[4/3] w-full rounded-lg border border-line object-cover"
                />
              ))}
            </div>
          </section>
        ) : null}

        {content.technicalTables?.map((table) => (
          <section key={table.tableTitle} className="mt-12">
            <h2 className="text-xl font-semibold text-navy">
              {table.tableTitle || "Technical data"}
            </h2>
            <div className="mt-4 max-w-4xl overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                {table.columns.length ? (
                  <thead>
                    <tr>
                      {table.columns.map((column) => (
                        <th
                          key={column}
                          className="border border-line bg-paper px-3 py-2 text-left font-semibold"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                ) : null}
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="border border-line px-3 py-2"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {content.contentTables?.map((table) => (
          <section key={table.title} className="mt-12">
            <h2 className="text-xl font-semibold text-navy">
              {table.title || "Table"}
            </h2>
            {table.caption ? (
              <p className="mt-2 text-sm text-muted">{table.caption}</p>
            ) : null}
            <div className="mt-4 max-w-4xl overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                {table.headers.length ? (
                  <thead>
                    <tr>
                      {table.headers.map((header) => (
                        <th
                          key={header}
                          className="border border-line bg-paper px-3 py-2 text-left font-semibold"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                ) : null}
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="border border-line px-3 py-2"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {content.documents?.length ? (
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-navy">Downloads</h2>
            <ul className="mt-4 space-y-2">
              {content.documents.map((doc, index) => (
                <li key={`${doc.title}-${index}`}>
                  {doc.url ? (
                    <a
                      href={doc.url}
                      className="font-semibold text-navy hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {doc.title || "Download"}
                    </a>
                  ) : (
                    <span className="text-muted">{doc.title}</span>
                  )}
                  {doc.description ? (
                    <p className="text-sm text-muted">{doc.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {content.faqs?.length ? (
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-navy">FAQs</h2>
            <dl className="mt-4 max-w-3xl space-y-4">
              {content.faqs.map((item, index) => (
                <div
                  key={`${item.question}-${index}`}
                  className="rounded-lg border border-line p-4"
                >
                  <dt className="font-semibold text-navy">{item.question}</dt>
                  <dd className="rich-text mt-2 text-sm text-muted">
                    <RichTextHtml html={item.answer} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {content.sections?.length ? (
          <PageSectionsView sections={content.sections} />
        ) : null}

        {content.childCategories?.length ? (
          <section className="catalogue-section mt-12">
            <p className="section-label">Browse by category</p>
            <h2 className="text-xl font-semibold text-navy">
              Product Categories
            </h2>
            <ul className="category-card-grid mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {content.childCategories.map((item) => (
                <li key={item.id} className="category-card">
                  <Link
                    href={publicPath(item.path)}
                    className="category-card__media"
                    aria-label={item.title}
                  >
                    {item.image ? (
                      <CmsImage item={item.image} alt={item.title} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src="/placeholders/product.svg" alt="" />
                    )}
                  </Link>
                  <div className="category-card__body">
                    <h3>
                      <Link href={publicPath(item.path)}>{item.title}</Link>
                    </h3>
                    {item.summary ? (
                      <p>{item.summary}</p>
                    ) : (
                      <p>
                        Explore product options, specifications and industrial
                        applications.
                      </p>
                    )}
                    <Link
                      href={publicPath(item.path)}
                      className="category-card__button"
                    >
                      Read More <span aria-hidden>→</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {content.categoryProducts?.length ? (
          <section className="catalogue-section mt-16">
            <p className="section-label">Engineered solutions</p>
            <h2 className="text-xl font-semibold text-navy">
              Explore Our Products
            </h2>
            <ul className="catalogue-product-grid mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {content.categoryProducts.map((item) => (
                <li key={item.id}>
                  <ProductCard
                    title={item.title}
                    path={item.path}
                    summary={item.summary}
                    imageUrl={item.imageUrl}
                    imageAlt={item.imageAlt}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function absoluteUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteOrigin()}${url.startsWith("/") ? url : `/${url}`}`;
}

export function contentMetadata(
  content: PublishedContent,
  companyName: string,
) {
  const title = decodeHtmlEntities(content.seoTitle || content.title);
  const description =
    decodeOptionalHtml(content.seoDescription) ||
    decodeOptionalHtml(content.summary) ||
    undefined;
  const defaultUrl = `${siteOrigin()}${publicPath(content.path)}`;
  const url = content.canonicalUrl?.trim() || defaultUrl;
  const visual =
    content.ogImage ??
    content.gallery?.[0] ??
    content.image ??
    content.cover ??
    content.hero ??
    null;
  const image = visual ? absoluteUrl(mediaDeliveryUrl(visual)) : undefined;
  const twitterImage = content.twitterImage
    ? absoluteUrl(mediaDeliveryUrl(content.twitterImage))
    : image;
  const keywords = content.focusKeyword
    ?.split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const ogTitle = decodeOptionalHtml(content.ogTitle) || title;
  const ogDescription =
    decodeOptionalHtml(content.ogDescription) || description;
  const twitterTitle =
    decodeOptionalHtml(content.twitterTitle) || ogTitle;
  const twitterDescription =
    decodeOptionalHtml(content.twitterDescription) || ogDescription;
  return {
    // Absolute titles keep live WordPress SEO strings intact (no " · Brand").
    title: { absolute: title },
    description,
    keywords: keywords?.length ? keywords : [companyName, content.title],
    alternates: { canonical: url },
    authors: [{ name: companyName, url: siteOrigin() }],
    robots: {
      index: content.robotsIndex ?? true,
      follow: content.robotsFollow ?? true,
    },
    openGraph: {
      // Next.js Metadata only accepts its OG union (website/article/…).
      // "product" throws at runtime and blanks the whole product page.
      type: content.kind === "post" ? ("article" as const) : ("website" as const),
      title: ogTitle,
      description: ogDescription,
      siteName: companyName,
      url,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: twitterImage ? "summary_large_image" : "summary",
      title: twitterTitle,
      description: twitterDescription,
      images: twitterImage ? [twitterImage] : undefined,
    },
  };
}
