import Link from "next/link";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { CmsImage } from "@/components/site/cms-image";
import { QuoteForm } from "@/components/site/quote-form";
import { RichTextHtml } from "@/components/site/rich-text-html";
import { cleanPublicExcerpt, cleanPublicTitle } from "@/lib/cms/clean-copy";
import type { PublishedContent } from "@/lib/cms/published-content";

function formatDate(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function StoryView({ content }: { content: PublishedContent }) {
  const isPost = content.kind === "post";
  const kicker = isPost
    ? "Insights"
    : content.kind === "location"
      ? "Locations"
      : "Exports";
  const date = formatDate(content.meta?.publishedAt);
  const chips = [
    content.meta?.locationName,
    content.meta?.region,
    content.meta?.country,
    content.meta?.productLine,
  ].filter((item): item is string => Boolean(item));
  const title = cleanPublicTitle(content.title);
  const lead = cleanPublicExcerpt(content.summary ?? "", 320);
  const cover = content.cover ?? content.hero ?? null;

  if (content.kind === "location") {
    return (
      <main className="product-page location-page">
        <section className="product-title-band">
          <div className="site-container">
            <Breadcrumbs
              items={[
                { href: "/", label: "Home" },
                { href: "/products/", label: "Products" },
                { label: title },
              ]}
            />
            <h1>{title}</h1>
            <p>
              {[content.meta?.locationName, content.meta?.region]
                .filter(Boolean)
                .join(", ") || "Jyoti Hydraulic"}
            </p>
          </div>
        </section>
        <div className="site-container product-content-grid location-page__content">
          <article className="product-page__detail location-page__article">
            <RichTextHtml html={content.body} className="product-prose" />
          </article>
          <aside className="product-quote-card" aria-labelledby="location-quote-title">
            <h2 id="location-quote-title">Get a Quote</h2>
            <p>Share your requirement and our team will contact you.</p>
            <QuoteForm subject={title} pagePath={`/${content.path}/`} />
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className={`story-page ${isPost ? "story-page--post" : ""}`}>
      {isPost ? (
        <header className="story-page__title-strip">
          <div className="site-container story-page__title-inner">
            <p className="page-kicker">{kicker}</p>
            <h1>{title}</h1>
            {date ? <p className="story-page__date">{date}</p> : null}
          </div>
        </header>
      ) : (
        <div className="site-page-banner">
          <div className="site-container page-banner-inner">
            <p className="page-kicker">{kicker}</p>
            <h1>{title}</h1>
            {date ? <p className="story-page__date">{date}</p> : null}
            {lead ? <p>{lead}</p> : null}
            {chips.length ? (
              <ul className="story-page__chips">
                {chips.map((chip) => (
                  <li key={chip}>{chip}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      )}
      <div
        className={`site-container story-page__body ${isPost ? "story-page__body--post" : ""}`}
      >
        <div className="story-page__main">
          {cover ? (
            <CmsImage
              item={cover}
              alt={content.title}
              className="story-page__cover"
            />
          ) : null}
          {content.body.trim() ? (
            <article className="story-page__article">
              <RichTextHtml
                html={content.body}
                className="rich-text story-prose"
              />
            </article>
          ) : null}
        </div>
        {isPost ? (
          <aside
            className="story-page__enquiry"
            aria-labelledby="story-enquiry-title"
          >
            <h2 id="story-enquiry-title">Enquire Now</h2>
            <p>
              Tell us what you need. Our hydraulic experts will get back to you.
            </p>
            <QuoteForm subject={title} pagePath={`/${content.path}/`} />
          </aside>
        ) : null}
        <div className="story-page__actions">
          <Link
            href={isPost ? "/blogs/" : "/products/"}
            className="site-btn-outline"
          >
            {isPost ? "All articles" : "Browse products"}
          </Link>
          <Link href="/contact/" className="site-btn-primary">
            Request a quote
          </Link>
        </div>
      </div>
    </main>
  );
}
