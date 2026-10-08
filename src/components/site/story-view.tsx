import Link from "next/link";
import { CmsImage } from "@/components/site/cms-image";
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

  return (
    <main className="story-page">
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
      <div className="site-container story-page__body">
        {content.cover ? (
          <CmsImage item={content.cover} alt={content.title} className="story-page__cover" />
        ) : null}
        {content.hero ? (
          <CmsImage item={content.hero} alt={content.title} className="story-page__cover" />
        ) : null}
        {content.body.trim() ? (
          <article className="story-page__article">
            <RichTextHtml html={content.body} className="rich-text story-prose" />
          </article>
        ) : null}
        <div className="story-page__actions">
          <Link href={isPost ? "/blogs/" : "/products/"} className="site-btn-outline">
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
