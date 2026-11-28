import Link from "next/link";
import { Award, FileText, Mail, Star } from "lucide-react";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { ProductCard } from "@/components/site/product-card";
import { ProductGallery } from "@/components/site/product-gallery";
import { ProductTabs } from "@/components/site/product-tabs";
import { QuoteForm } from "@/components/site/quote-form";
import { RichTextHtml } from "@/components/site/rich-text-html";
import { cleanPublicExcerpt, cleanPublicTitle } from "@/lib/cms/clean-copy";
import {
  getHome,
  getSettings,
  getSiteLabels,
  productInsightPosts,
} from "@/lib/cms/queries";
import type { PublishedContent } from "@/lib/cms/published-content";
import { mediaDeliveryUrl } from "@/lib/media-url";
import { publicPath, siteOrigin } from "@/lib/paths";
import { normalizeProductEditorHtml, removeLeadingSummaryHtml, readableProductArticle } from "@/lib/cms/product-article";
import { sanitizeRichText } from "@/lib/sanitize";

function withoutTables(html: string) {
  return html.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, "");
}

function promoteLegacyHeadings(html: string) {
  return html.replace(
    /<p\b[^>]*>\s*(?:<strong>)?([^<]{3,110})(?:<\/strong>)?\s*<\/p>/gi,
    (match, text) => {
      const candidate = textOf(text).replace(/&amp;/gi, "&").trim();
      const looksLikeHeading =
        candidate.length <= 90 &&
        !/[.!?;:]/.test(candidate) &&
        /(?:principle|features?|benefits?|specifications?|details?|selection|applications?|maintenance|safety|installation|materials?|construction|configuration|capacity|speed|ratio|selection|holding|load|quote|contact|overview)$/i.test(
          candidate,
        );
      return looksLikeHeading ? `<h2>${text}</h2>` : match;
    },
  );
}

function absoluteUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteOrigin()}${url.startsWith("/") ? url : `/${url}`}`;
}

function textOf(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sameHeading(title: string, pageTitle: string) {
  const norm = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const a = norm(title);
  const b = norm(pageTitle);
  if (!a || !b) return false;
  return a.includes(b.slice(0, 24)) || b.includes(a.slice(0, 24));
}

function removeDuplicatePageTitle(html: string, pageTitle: string) {
  return html.replace(
    /^\s*<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/i,
    (match, _level, heading) =>
      sameHeading(textOf(heading), pageTitle) ? "" : match,
  );
}

function youtubeEmbedUrl(raw: unknown) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let videoId = "";
    if (host === "youtu.be")
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
    else if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      videoId =
        url.pathname === "/watch"
          ? (url.searchParams.get("v") ?? "")
          : (url.pathname.split("/").filter(Boolean).pop() ?? "");
    }
    return /^[a-zA-Z0-9_-]{6,}$/.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}`
      : null;
  } catch {
    return null;
  }
}

function YouTubeIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8Z"
      />
      <path fill="#fff" d="m9.6 15.8 6.2-3.8-6.2-3.8v7.6Z" />
    </svg>
  );
}

function WhatsAppIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20.2 11.3A8.2 8.2 0 0 1 8.1 18.5L3.8 20l1.4-4.1A8.2 8.2 0 1 1 20.2 11.3Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.1 7.7c.2-.3.5-.4.8-.2l1 .6c.3.2.4.5.3.8l-.2 1c0 .2-.2.4-.4.5l-.5.2c.5 1.1 1.4 2 2.5 2.5l.2-.5c.1-.2.3-.4.5-.4l1-.2c.3 0 .6.1.8.3l.6 1c.2.3.1.6-.2.8l-.7.7c-.2.2-.5.3-.8.2-3.5-.7-6.3-3.5-7-7-.1-.3 0-.6.2-.8l.7-.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function articleSections(html: string) {
  const chunks = html.split(/<h2[^>]*>/i);
  const sections: { title: string; html: string }[] = [];
  const push = (title: string, body: string) => {
    const cleaned = body
      .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, "")
      .replace(/<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/gi, "")
      .replace(/<img\b[^>]*>/gi, "")
      .replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/gi, "")
      .trim();
    if (!textOf(cleaned)) return;
    sections.push({ title, html: cleaned });
  };
  if (chunks[0]) push("", chunks[0]);
  for (const chunk of chunks.slice(1)) {
    const match = chunk.match(/^([\s\S]*?)<\/h2>([\s\S]*)$/i);
    if (!match) continue;
    push(textOf(match[1]), match[2]);
  }
  return sections;
}

function ArticleBlocks({
  html,
  pageTitle,
}: {
  html: string;
  pageTitle: string;
}) {
  const sections = articleSections(removeDuplicatePageTitle(html, pageTitle));
  const renderSection = (
    sectionHtml: string,
    index: number,
    heading?: string,
  ) => {
    const text = sectionHtml
      .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, "")
      .replace(/<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/gi, "")
      .replace(/<img\b[^>]*>/gi, "")
      .replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/gi, "")
      .trim();
    if (!textOf(text)) return null;
    return (
      <section
        key={`${heading ?? "overview"}-${index}`}
        className="product-article__block"
      >
        {heading ? <h2>{heading}</h2> : null}
        <RichTextHtml html={text} className="product-prose" />
      </section>
    );
  };
  if (!sections.length) {
    const fallback = renderSection(html, 0);
    return fallback ? <div className="product-article">{fallback}</div> : null;
  }
  return (
    <div className="product-article">
      {sections.map((section, index) => {
        const showTitle =
          Boolean(section.title) &&
          !sameHeading(section.title, "Overview") &&
          !(index === 0 && sameHeading(section.title, pageTitle));
        return renderSection(
          section.html,
          index,
          showTitle ? section.title : undefined,
        );
      })}
    </div>
  );
}

export async function ProductDetail({
  content,
}: {
  content: PublishedContent;
}) {
  const sourceOverviewHtml = content.detailBlocks?.find(
    (block) => block.heading === "Overview",
  )?.html;
  const detailsHtml = content.detailBlocks?.find((block) => block.heading === "Details")?.html;
  const [settings, home, labels, posts] = await Promise.all([
    getSettings(),
    getHome(),
    getSiteLabels(),
    productInsightPosts(content.relatedPostIds ?? [], sourceOverviewHtml, content.body, detailsHtml),
  ]);
  const image = content.gallery?.[0];
  const pills = (content.features ?? [])
    .map((item) => item.title.trim())
    .filter(Boolean)
    .slice(0, 4);
  const legacyArticleHtml = content.body || detailsHtml || "";
  // Overview is the editable product description. Do not merge the legacy
  // body back into it, otherwise an old imported article wins over a saved edit.
  const cleanedArticleHtml = sourceOverviewHtml
    ? sanitizeRichText(normalizeProductEditorHtml(sourceOverviewHtml))
    : readableProductArticle(promoteLegacyHeadings(withoutTables(legacyArticleHtml)));
  const title = content.title;
  const introductionLead = cleanPublicExcerpt(textOf(cleanedArticleHtml), 360);
  const summaryLead = content.summary
    ? cleanPublicExcerpt(content.summary, 360)
    : "";
  const lead = summaryLead || introductionLead;
  const overviewHtml = sourceOverviewHtml
    ? cleanedArticleHtml
    : removeLeadingSummaryHtml(cleanedArticleHtml, summaryLead);
  const imageUrl = image ? absoluteUrl(mediaDeliveryUrl(image)) : undefined;
  const galleryImages = (content.gallery ?? []).map((item) => ({
    id: item.id,
    src: mediaDeliveryUrl(item),
    alt: item.alt || title,
  }));
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description: lead || undefined,
    image: imageUrl,
    url: `${siteOrigin()}${publicPath(content.path)}`,
    brand: { "@type": "Brand", name: settings.companyName },
    manufacturer: {
      "@type": "Organization",
      name: settings.companyName,
      url: siteOrigin(),
    },
  };
  const hasSpecifications = Boolean(
    content.specs?.length ||
    content.technicalTables?.length ||
    content.contentTables?.length,
  );
  const videoSections = (content.sections ?? []).filter(
    (section) =>
      section.sectionType === "video" &&
      section.isActive &&
      youtubeEmbedUrl(section.customData.videoUrl),
  );
  const reviewSections = (content.sections ?? []).filter(
    (section) =>
      section.sectionType === "testimonials" &&
      section.isActive &&
      (section.title.trim() || section.description.trim()),
  );
  const faqs = (content.faqs ?? []).filter(
    (item) => item.question.trim() || item.answer.trim(),
  );
  const documents = (content.documents ?? []).filter(
    (doc): doc is typeof doc & { url: string } => Boolean(doc.url),
  );
  const certificates = documents.filter((doc) => doc.documentType === "certificate");
  const iso = certificates.find((doc) => /\bISO[\s-]*9001\b/i.test(doc.title));
  const ce = certificates.find((doc) => /\bCE\b/i.test(doc.title));
  const youtubeHref =
    videoSections.length > 0
      ? "#product-tab-video"
      : settings.youtubeUrl || null;
  const whatsappNumber = settings.whatsapp?.replace(/\D/g, "") ?? "";
  const productInfo = [
    content.shippingArea
      ? { label: "Shipping area", value: content.shippingArea }
      : null,
    content.modelNumber ? { label: "Model", value: content.modelNumber } : null,
    content.brand ? { label: "Brand", value: content.brand } : null,
    content.stock ? { label: "Availability", value: content.stock } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  const comingSoon = (
    <div className="product-tabs__empty">
      <h3>Coming soon</h3>
      <p>We’re preparing this product information. Please check back soon.</p>
    </div>
  );
  const tabs = [
    {
      visible: Boolean(overviewHtml),
      id: "overview",
      label: labels.productOverviewLabel,
      icon: "overview",
      content: overviewHtml ? (
        sourceOverviewHtml ? (
          <section className="product-article__block">
            <RichTextHtml html={overviewHtml} className="product-prose rich-text" />
          </section>
        ) : <ArticleBlocks html={overviewHtml} pageTitle={content.title} />
      ) : (
        comingSoon
      ),
    },
    {
      visible: hasSpecifications,
      id: "specifications",
      label: labels.productSpecificationsLabel,
      icon: "specifications",
      content: (
        <>
          {content.specs?.length ? (
            <table className="spec-table">
              <tbody>
                {content.specs.map((row) => (
                  <tr key={`${row.label}-${row.value}`}>
                    <th>{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {content.technicalTables?.map((table) => (
            <div key={table.tableTitle} className="spec-extra">
              {table.tableTitle ? <h3>{table.tableTitle}</h3> : null}
              <div className="spec-scroll">
                <table className="spec-table">
                  {table.columns.length ? (
                    <thead>
                      <tr>
                        {table.columns.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                  ) : null}
                  <tbody>
                    {table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {content.contentTables?.map((table) => (
            <div key={table.title} className="spec-extra">
              {table.title ? <h3>{table.title}</h3> : null}
              {table.caption ? <p>{table.caption}</p> : null}
              <div className="spec-scroll">
                <table className="spec-table">
                  {table.headers.length ? (
                    <thead>
                      <tr>
                        {table.headers.map((header) => (
                          <th key={header}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                  ) : null}
                  <tbody>
                    {table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      ),
    },
    ...[
      { id: "features", label: labels.productFeaturesLabel, items: content.features },
      { id: "applications", label: "Applications", items: content.applications },
      { id: "options", label: "Options", items: content.options },
    ].map(({ id, label, items }) => ({
      visible: Boolean(items?.length), id, label, icon: id,
      content: (
        <ul className="product-feature-list">
          {items?.map((item, index) => (
            <li key={index}>
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaDeliveryUrl(item.image)} alt={item.image.alt || title} />
              )}
              <div>
                {item.title && <h3>{item.title}</h3>}
                {item.description && <p>{item.description}</p>}
              </div>
            </li>
          ))}
        </ul>
      ),
    })),
    {
      visible: documents.length > 0, id: "downloads", label: "Documents", icon: "downloads",
      content: <ul className="product-feature-list">
        {documents.map((doc, index) => (
          <li key={index}>
            <div>
              <a className="article-link" href={doc.url} target="_blank" rel="noopener noreferrer">
                {doc.title || "View document"}
              </a>
              {doc.description && <p>{doc.description}</p>}
            </div>
          </li>
        ))}
      </ul>,
    },
    {
      visible: videoSections.length > 0,
      id: "video",
      label: labels.productVideoLabel,
      icon: "video",
      content: videoSections.length ? (
        <div className="product-video-list">
          {videoSections.map((section, index) => {
            const embedUrl = youtubeEmbedUrl(section.customData.videoUrl);
            if (!embedUrl) return null;
            return (
              <section key={section.id ?? `video-${index}`}>
                {section.title ? <h3>{section.title}</h3> : null}
                {section.description ? <p>{section.description}</p> : null}
                <div className="product-video-list__frame">
                  <iframe
                    src={embedUrl}
                    title={section.title || `${title} video ${index + 1}`}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        comingSoon
      ),
    },
    {
      visible: reviewSections.length > 0,
      id: "reviews",
      label: labels.productReviewsLabel,
      icon: "reviews",
      content: reviewSections.length ? (
        <ul className="product-review-list">
          {reviewSections.map((review, index) => (
            <li key={review.id ?? `review-${index}`}>
              <span aria-hidden="true">★★★★★</span>
              {review.description ? (
                <blockquote>{review.description}</blockquote>
              ) : null}
              {review.title ? <p>{review.title}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        comingSoon
      ),
    },
    {
      visible: faqs.length > 0,
      id: "faq",
      label: "FAQ",
      icon: "faq",
      content: (
        <div className="product-faq-list">
          {faqs.map((faq, index) => (
            <details key={`${faq.question}-${index}`}>
              <summary>{faq.question || `Question ${index + 1}`}</summary>
              {faq.answer ? <p>{faq.answer}</p> : null}
            </details>
          ))}
        </div>
      ),
    },
  ]
    .filter((tab) => tab.visible)
    .map(({ id, label, icon, content }) => ({ id, label, icon, content }));

  const enquiryParams = new URLSearchParams({ product: title });
  if (content.productId) enquiryParams.set("productId", content.productId);
  const enquireHref = `/contact/?${enquiryParams.toString()}`;

  return (
    <main className="product-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <section className="product-title-band">
        <div className="site-container">
          <Breadcrumbs
            items={[
              { href: "/", label: "Home" },
              { href: "/products/", label: "Products" },
              ...(content.parent
                ? [
                    {
                      href: publicPath(content.parent.path),
                      label: cleanPublicTitle(content.parent.title),
                    },
                  ]
                : []),
              { label: title, preserveLabel: true },
            ]}
          />
          <h1>{title}</h1>
          <p>
            {content.subtitle ||
              settings.tagline ||
              "ISO-9001:2015 Certified Company"}
          </p>
        </div>
      </section>

      <div className="site-container product-page__hero">
        <div className="product-visual">
          {galleryImages.length ? (
            <ProductGallery images={galleryImages} />
          ) : (
            <div className="product-gallery__stage">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/placeholders/product.svg" alt={title} />
            </div>
          )}
        </div>
        <div className="product-summary">
          <p className="eyebrow dark">{labels.productOverviewEyebrow}</p>
          {lead ? <p className="product-summary__lead">{lead}</p> : null}
          {content.rating ? (
            <div
              className="product-summary__rating"
              aria-label={`${content.rating} out of 5 stars`}
            >
              <span>Rating:</span>
              <span aria-hidden="true">
                {Array.from({ length: content.rating }, (_, index) => (
                  <Star
                    key={index}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </span>
              <strong>{content.rating} of 5</strong>
            </div>
          ) : null}
          {productInfo.length ? (
            <ul className="product-summary__facts">
              {productInfo.map((item) => (
                <li key={item.label}>
                  <span aria-hidden="true">✓</span>
                  <strong>{item.label}:</strong> {item.value}
                </li>
              ))}
            </ul>
          ) : null}
          {pills.length ? (
            <ul className="feature-pills">
              {pills.map((pill) => (
                <li key={pill}>{pill}</li>
              ))}
            </ul>
          ) : null}
          <nav
            className="product-summary__resource-strip"
            aria-label="Product resources"
          >
            {youtubeHref ? (
              <a
                className="resource-icon resource-icon--youtube"
                href={youtubeHref}
                {...(youtubeHref.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                title="Watch product video"
                aria-label="Watch product video"
              >
                <YouTubeIcon />
              </a>
            ) : null}
            {[
              { doc: iso, image: "/brand/iso-9001-certified.png", type: "iso" },
              { doc: ce, image: "/brand/quality-ce-certified.svg", type: "ce" },
            ].map(({ doc, image, type }) => doc?.url && (
              <a key={type} className={`resource-icon resource-icon--badge resource-icon--${type}`}
                href={doc.url} target="_blank" rel="noopener noreferrer" title={doc.title}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt={doc.title} width={48} height={48} className="resource-badge-img" />
              </a>
            ))}
            <span className="resource-strip__divider" aria-hidden="true" />
            <a
              className="resource-icon resource-icon--email"
              href={`mailto:${settings.emailPrimary}`}
              title="Email us"
              aria-label="Email us"
            >
              <Mail aria-hidden="true" />
            </a>
            {whatsappNumber ? (
              <a
                className="resource-icon resource-icon--whatsapp"
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello, I am interested in ${title}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Enquire on WhatsApp"
                aria-label="Enquire on WhatsApp"
              >
                <WhatsAppIcon />
              </a>
            ) : null}
          </nav>
          <div className="product-summary__actions product-summary__actions--detailed">
            {certificates.length > 0 && (
              <a href={certificates.length === 1 ? certificates[0].url : "#product-tab-downloads"} className="site-btn-outline">
                <Award className="h-4 w-4" aria-hidden="true" /> View Certificates
              </a>
            )}
            {content.brochureUrl ? (
              <a
                href={content.brochureUrl}
                className="site-btn-outline product-summary__pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span>View PDF</span>
              </a>
            ) : null}
            {content.enquiryEnabled !== false ? (
              <Link href={enquireHref} className="site-btn-primary">
                <Mail className="h-4 w-4" aria-hidden="true" />
                Get a Quote
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      {tabs.length ? (
        <div className="site-container product-content-grid">
          <div className="product-page__detail">
            <ProductTabs tabs={tabs} />
          </div>
          {content.enquiryEnabled !== false ? (
            <aside
              className="product-quote-card"
              aria-labelledby="product-quote-title"
            >
              <h2 id="product-quote-title">Get a Quote</h2>
              <p>Share your requirement and our team will contact you.</p>
              <QuoteForm productId={content.productId} subject={title} pagePath={publicPath(content.path)} />
            </aside>
          ) : null}
        </div>
      ) : null}
      {content.related?.length ? (
        <section className="product-related">
          <div className="site-container">
            <div className="product-section-title">
              <h2>{labels.productRelatedTitle}</h2>
            </div>
            <ul className="catalogue-grid">
              {content.related.slice(0, 3).map((item) => (
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
          </div>
        </section>
      ) : null}
      {home.clientLogos.length ? (
        <section
          className="clients-rail product-clients"
          aria-labelledby="product-clients-title"
        >
          <div className="site-container clients-rail__heading">
            <p className="eyebrow dark">Trusted across industries</p>
            <h2 id="product-clients-title">Our Clients</h2>
          </div>
          <div className="clients-rail__viewport">
            <div className="clients-rail__track">
              {[...home.clientLogos, ...home.clientLogos].map(
                (client, index) => (
                  <div
                    className="client-logo"
                    key={`${client.name}-${index}`}
                    aria-hidden={index >= home.clientLogos.length}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={client.logo}
                      alt={
                        index < home.clientLogos.length
                          ? `${client.name} logo`
                          : ""
                      }
                    />
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      ) : null}
      {home.usps.length ? (
        <section
          className="section-shell usp-section product-usps"
          aria-labelledby="product-usps-title"
        >
          <div className="site-container">
            <div className="section-heading centered">
              <div>
                <p className="eyebrow dark">What sets us apart</p>
                <h2 id="product-usps-title">Our USPs</h2>
              </div>
            </div>
            <ul className="usp-grid">
              {home.usps.map((item, index) => (
                <li key={`${item.title}-${index}`}>
                  <span>{item.number || `0${index + 1}`}</span>
                  <div className="usp-icon" aria-hidden>
                    ✓
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
      {home.testimonials.length ? (
        <section
          className="testimonials-section product-testimonials"
          aria-labelledby="product-testimonials-title"
        >
          <div className="site-container">
            <div className="section-heading centered">
              <div>
                <p className="eyebrow">Customer feedback</p>
                <h2 id="product-testimonials-title">What Our Customers Say</h2>
              </div>
            </div>
            <ul className="testimonials-grid">
              {home.testimonials.slice(0, 3).map((item, index) => (
                <li key={`${item.author}-${index}`}>
                  <span className="quote-mark" aria-hidden>
                    “
                  </span>
                  <blockquote>{item.quote}</blockquote>
                  <p>{item.author}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
      {posts.length ? (
        <section className="section-shell product-insights">
          <div className="site-container">
            <div className="section-heading">
              <div>
                <p className="eyebrow dark">Knowledge centre</p>
                <h2>Insights &amp; Articles</h2>
                <p>
                  Practical knowledge, product guidance and industry updates
                  from our engineering team.
                </p>
              </div>
              <form className="insights-search" action="/blogs/" method="get">
                <input
                  name="q"
                  placeholder={labels.blogSearchPlaceholder}
                  aria-label={labels.blogSearchPlaceholder}
                />
              </form>
            </div>
            <ul className="insights-grid">
              {posts.map((post) => (
                <li key={post.id}>
                  <article>
                    <Link
                      href={publicPath(post.path)}
                      className="article-visual"
                    >
                      {post.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.coverUrl} alt="" />
                      ) : (
                        <span>Technical guide</span>
                      )}
                    </Link>
                    <div className="article-body">
                      {post.publishedAt ? (
                        <time>
                          {post.publishedAt.toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </time>
                      ) : null}
                      <h3>
                        <Link href={publicPath(post.path)}>
                          {cleanPublicTitle(post.title)}
                        </Link>
                      </h3>
                      {post.excerpt ? <p>{cleanPublicExcerpt(post.excerpt, 180)}</p> : null}
                      <Link
                        className="article-link"
                        href={publicPath(post.path)}
                      >
                        Read more <span aria-hidden>&rarr;</span>
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </main>
  );
}
