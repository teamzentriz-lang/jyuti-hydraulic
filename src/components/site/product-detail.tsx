import Link from "next/link";
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
  publishedPosts,
} from "@/lib/cms/queries";
import type { PublishedContent } from "@/lib/cms/published-content";
import { mediaDeliveryUrl } from "@/lib/media-url";
import { publicPath, siteOrigin } from "@/lib/paths";

function normalizeCopy(html: string) {
  return textOf(html)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function coveredBy(existing: string, candidate: string) {
  const haystack = normalizeCopy(existing);
  const needle = normalizeCopy(candidate);
  if (!needle || needle.length < 40) return false;
  if (haystack.includes(needle)) return true;
  const sample = needle.slice(0, 220);
  return sample.length > 60 && haystack.includes(sample);
}

function dedupedHtml(parts: Array<string | undefined>) {
  const cleaned = parts.map((part) => part?.trim() ?? "").filter(Boolean);
  const ranked = [...cleaned].sort(
    (a, b) => textOf(b).length - textOf(a).length,
  );
  const kept: string[] = [];
  for (const part of ranked) {
    if (kept.some((existing) => coveredBy(existing, part))) continue;
    kept.push(part);
  }
  return cleaned.filter((part) => kept.includes(part)).join("");
}

function absoluteUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteOrigin()}${url.startsWith("/") ? url : `/${url}`}`;
}

function readableArticle(html: string) {
  let next = html.replace(/inquiry now/gi, "");
  const cuts = [
    /<h3[^>]*>\s*Contact With Us/i,
    /Feel free to write our/i,
    /Our Blogs/i,
    /Our Products/i,
    /Read More/i,
    /Get in Touch/i,
    /Get Your Quote/i,
  ]
    .map((pattern) => next.search(pattern))
    .filter((index) => index > 40);
  if (cuts.length) next = next.slice(0, Math.min(...cuts));
  return next
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/<ul>\s*<\/ul>/gi, "")
    .trim();
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

function articleSections(html: string) {
  const chunks = html.split(/<h2[^>]*>/i);
  const sections: { title: string; html: string }[] = [];
  const push = (title: string, body: string) => {
    const cleaned = body.replace(/<p>\s*<\/p>/gi, "").trim();
    if (!textOf(cleaned) && !/<img\b/i.test(cleaned)) return;
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
  const sections = articleSections(html);
  const renderSection = (
    sectionHtml: string,
    index: number,
    heading?: string,
  ) => {
    const images = [...sectionHtml.matchAll(/<img\b[^>]*>/gi)].map(
      (match) => match[0],
    );
    const text = sectionHtml
      .replace(/<img\b[^>]*>/gi, "")
      .replace(/<p>\s*<\/p>/gi, "")
      .trim();
    const hasText = Boolean(textOf(text));
    return (
      <section
        key={`${heading ?? "overview"}-${index}`}
        className="product-article__block"
      >
        {heading ? <h2>{heading}</h2> : null}
        {images.length && hasText ? (
          <div className="media-split">
            <RichTextHtml html={text} className="product-prose" />
            <RichTextHtml
              html={images.join("")}
              className="media-split__media"
            />
          </div>
        ) : images.length ? (
          <RichTextHtml html={images.join("")} className="media-split__media" />
        ) : text ? (
          <RichTextHtml
            html={text}
            className={
              (text.match(/<p\b/gi) ?? []).length > 1
                ? "product-prose product-prose--columns"
                : "product-prose"
            }
          />
        ) : null}
      </section>
    );
  };
  if (!sections.length) {
    return <div className="product-article">{renderSection(html, 0)}</div>;
  }
  return (
    <div className="product-article">
      {sections.map((section, index) => {
        const showTitle =
          Boolean(section.title) &&
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
  const [settings, home, posts, labels] = await Promise.all([
    getSettings(),
    getHome(),
    publishedPosts(3),
    getSiteLabels(),
  ]);
  const image = content.gallery?.[0];
  const pills = (content.features ?? [])
    .map((item) => item.title.trim())
    .filter(Boolean)
    .slice(0, 4);
  const overviewHtml = readableArticle(
    dedupedHtml([
      content.detailBlocks?.find((block) => block.heading === "Overview")?.html,
      content.body,
      ...(content.detailBlocks ?? [])
        .filter(
          (block) =>
            !["Overview", "Applications", "Features"].includes(block.heading),
        )
        .map((block) => `<h2>${block.heading}</h2>${block.html}`),
    ]),
  );
  const lead = content.summary ? cleanPublicExcerpt(content.summary, 320) : "";
  const title = cleanPublicTitle(content.title);
  const imageUrl = image ? absoluteUrl(mediaDeliveryUrl(image)) : undefined;
  const galleryImages = (content.gallery ?? []).map((item, index) => ({
    id: item.id,
    src: mediaDeliveryUrl(item),
    alt: item.alt || `${cleanPublicTitle(content.title)} image ${index + 1}`,
  }));
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: cleanPublicTitle(content.title),
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
  const comingSoon = (
    <div className="product-tabs__empty">
      <h3>Coming soon</h3>
      <p>We’re preparing this product information. Please check back soon.</p>
    </div>
  );
  const tabs = [
    {
      id: "overview",
      label: labels.productOverviewLabel,
      icon: "overview",
      content: overviewHtml ? (
        <ArticleBlocks html={overviewHtml} pageTitle={content.title} />
      ) : (
        comingSoon
      ),
    },
    {
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
    {
      id: "features",
      label: labels.productFeaturesLabel,
      icon: "features",
      content: content.features?.length ? (
        <ul className="product-feature-list">
          {content.features.map((item, index) => (
            <li key={`${item.title}-${index}`}>
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaDeliveryUrl(item.image)} alt={item.title} />
              ) : null}
              <div>
                <h3>{item.title}</h3>
                {item.description ? <p>{item.description}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        comingSoon
      ),
    },
    {
      id: "video",
      label: labels.productVideoLabel,
      icon: "video",
      content: content.sections?.some(
        (section) =>
          section.sectionType === "video" &&
          section.isActive &&
          youtubeEmbedUrl(section.customData.videoUrl),
      ) ? (
        <div className="product-video-list">
          {content.sections
            .filter(
              (section) => section.sectionType === "video" && section.isActive,
            )
            .map((section, index) => {
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
      id: "reviews",
      label: labels.productReviewsLabel,
      icon: "reviews",
      content: home.testimonials.length ? (
        <ul className="product-review-list">
          {home.testimonials.map((review, index) => (
            <li key={`${review.author}-${index}`}>
              <span aria-hidden="true">★★★★★</span>
              <blockquote>{review.quote}</blockquote>
              <p>{review.author}</p>
            </li>
          ))}
        </ul>
      ) : (
        comingSoon
      ),
    },
  ];

  const enquireHref = `/contact/?product=${encodeURIComponent(title)}`;

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
              { label: title },
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
        {galleryImages.length ? (
          <ProductGallery images={galleryImages} />
        ) : (
          <div className="product-gallery__stage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/placeholders/product.svg" alt={title} />
          </div>
        )}
        <div className="product-summary">
          <p className="eyebrow dark">{labels.productOverviewEyebrow}</p>
          {lead ? <p className="product-summary__lead">{lead}</p> : null}
          {pills.length ? (
            <ul className="feature-pills">
              {pills.map((pill) => (
                <li key={pill}>{pill}</li>
              ))}
            </ul>
          ) : null}
          <div className="product-summary__actions">
            {content.enquiryEnabled !== false ? (
              <Link href={enquireHref} className="site-btn-primary">
                Get a Quote
              </Link>
            ) : null}
            {content.brochureUrl ? (
              <a
                href={content.brochureUrl}
                className="site-btn-outline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download Brochure
              </a>
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
              <QuoteForm subject={title} pagePath={publicPath(content.path)} />
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
                    &ldquo;
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
              <Link href="/blogs/" className="site-btn-outline">
                View all articles
              </Link>
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
                      {post.excerpt ? <p>{post.excerpt}</p> : null}
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
