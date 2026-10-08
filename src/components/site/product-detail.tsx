import Link from "next/link";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CmsImage } from "@/components/site/cms-image";
import { ProductCard } from "@/components/site/product-card";
import { ProductTabs } from "@/components/site/product-tabs";
import { RichTextHtml } from "@/components/site/rich-text-html";
import { cleanPublicExcerpt, cleanPublicTitle } from "@/lib/cms/clean-copy";
import { getSettings } from "@/lib/cms/queries";
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
  const ranked = [...cleaned].sort((a, b) => textOf(b).length - textOf(a).length);
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
  return next.replace(/<p>\s*<\/p>/gi, "").replace(/<ul>\s*<\/ul>/gi, "").trim();
}

function textOf(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sameHeading(title: string, pageTitle: string) {
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const a = norm(title);
  const b = norm(pageTitle);
  if (!a || !b) return false;
  return a.includes(b.slice(0, 24)) || b.includes(a.slice(0, 24));
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

function splitCopyAndImages(html: string) {
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const text = html.replace(/<img\b[^>]*>/gi, "").replace(/<p>\s*<\/p>/gi, "").trim();
  return { images, text, hasText: Boolean(textOf(text)) };
}

function ArticleBlocks({ html, pageTitle }: { html: string; pageTitle: string }) {
  const sections = articleSections(html);
  if (!sections.length) return <RichTextHtml html={html} className="product-prose" />;
  return (
    <div className="product-article">
      {sections.map((section, index) => {
        const showTitle = Boolean(section.title) && !(index === 0 && sameHeading(section.title, pageTitle));
        const { images, text, hasText } = splitCopyAndImages(section.html);
        const sideBySide = images.length > 0 && hasText;
        return (
          <section key={`${section.title}-${index}`} className="product-article__block">
            {showTitle ? <h2>{section.title}</h2> : null}
            {sideBySide ? (
              <div className={index % 2 === 0 ? "media-split" : "media-split media-split--flip"}>
                <RichTextHtml html={text} className="product-prose" />
                <RichTextHtml html={images.join("")} className="media-split__media" />
              </div>
            ) : (
              <RichTextHtml
                html={section.html}
                className={
                  (section.html.match(/<p\b/gi) ?? []).length > 1
                    ? "product-prose product-prose--columns"
                    : "product-prose"
                }
              />
            )}
          </section>
        );
      })}
    </div>
  );
}

export async function ProductDetail({ content }: { content: PublishedContent }) {
  const settings = await getSettings();
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
        .filter((block) => !["Overview", "Applications", "Features"].includes(block.heading))
        .map((block) => `<h2>${block.heading}</h2>${block.html}`),
    ]),
  );
  const lead = content.summary ? cleanPublicExcerpt(content.summary, 320) : "";
  const imageUrl = image ? absoluteUrl(mediaDeliveryUrl(image)) : undefined;
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
  const applicationsHtml = readableArticle(
    dedupedHtml([
      content.detailBlocks?.find((block) => block.heading === "Applications")?.html,
      content.detailBlocks?.find((block) => block.heading === "Features")?.html,
    ].filter((part) => !coveredBy(overviewHtml, part ?? ""))),
  );
  const tabs = [
    overviewHtml
      ? {
          id: "overview",
          label: "Overview",
          content: <ArticleBlocks html={overviewHtml} pageTitle={content.title} />,
        }
      : null,
    content.specs?.length || content.technicalTables?.length || content.contentTables?.length
      ? {
          id: "specifications",
          label: "Specifications",
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
        }
      : null,
    content.applications?.length || applicationsHtml
      ? {
          id: "applications",
          label: "Applications",
          content: (
            <>
              {applicationsHtml ? (
                <ArticleBlocks html={readableArticle(applicationsHtml)} pageTitle={content.title} />
              ) : null}
              {content.applications?.length ? (
                <ul className="application-list">
                  {content.applications.map((item, index) => (
                    <li key={`${item.title}-${index}`}>
                      <h3>{item.title}</h3>
                      {item.description ? <p>{item.description}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ),
        }
      : null,
    content.documents?.length || content.brochureUrl
      ? {
          id: "downloads",
          label: "Downloads",
          content: (
            <ul className="download-list">
              {content.brochureUrl ? (
                <li>
                  <a href={content.brochureUrl} target="_blank" rel="noopener noreferrer">
                    Download brochure
                  </a>
                </li>
              ) : null}
              {content.documents?.map((doc, index) => (
                <li key={`${doc.title}-${index}`}>
                  {doc.url ? (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      {doc.title || "Download"}
                    </a>
                  ) : (
                    <span>{doc.title}</span>
                  )}
                  {doc.description ? <p>{doc.description}</p> : null}
                </li>
              ))}
            </ul>
          ),
        }
      : null,
  ].filter((tab) => tab !== null);

  const title = cleanPublicTitle(content.title);
  const enquireHref = `/contact/?product=${encodeURIComponent(title)}`;

  return (
    <main className="product-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <div className="site-container product-page__hero">
        <div className="product-stage">
          {image ? (
            <CmsImage item={image} alt={title} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/placeholders/product.svg" alt={title} />
          )}
        </div>
        <div className="product-summary">
          <Breadcrumbs
            items={[
              { href: "/", label: "Home" },
              { href: "/products/", label: "Products" },
              ...(content.parent
                ? [{ href: publicPath(content.parent.path), label: cleanPublicTitle(content.parent.title) }]
                : []),
              { label: title },
            ]}
          />
          <p className="eyebrow dark">Jyoti Hydraulic</p>
          <h1>{title}</h1>
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
                Request a quote
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
        <div className="site-container product-page__detail">
          <ProductTabs tabs={tabs} />
        </div>
      ) : null}
      {content.faqs?.length ? (
        <div className="site-container product-page__extra">
          <h2>FAQs</h2>
          <dl className="faq-list">
            {content.faqs.map((item, index) => (
              <div key={`${item.question}-${index}`}>
                <dt>{item.question}</dt>
                <dd>
                  <RichTextHtml html={item.answer} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {content.related?.length ? (
        <section className="site-container product-related">
          <h2>Related Products</h2>
          <ul className="catalogue-grid">
            {content.related.map((item) => (
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
    </main>
  );
}
