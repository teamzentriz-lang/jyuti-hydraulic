import type { Metadata } from "next";
import Link from "next/link";
import { contentMetadata } from "@/components/site/content-view";
import { getSettings, publishedPosts } from "@/lib/cms/queries";
import { resolvePublishedContentByPath } from "@/lib/cms/published-content";
import { getSite } from "@/lib/cms/site";
import { publicPath, siteOrigin } from "@/lib/paths";

export async function generateMetadata(): Promise<Metadata> {
  const content = await resolvePublishedContentByPath("blogs");
  if (content) {
    const site = await getSite();
    return contentMetadata(content, site.settings.companyName);
  }
  const settings = await getSettings();
  return {
    title: `Blogs | ${settings.companyName}`,
    alternates: { canonical: `${siteOrigin()}/blogs/` },
  };
}

function BlogCard({
  post,
  featured = false,
}: {
  post: Awaited<ReturnType<typeof publishedPosts>>[number];
  featured?: boolean;
}) {
  return (
    <article className={`blog-card ${featured ? "blog-card--featured" : ""}`}>
      <Link
        href={publicPath(post.path)}
        className="blog-card__media"
        aria-label={post.title}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.coverUrl || "/placeholders/product.svg"}
          alt={post.coverAlt || post.title}
        />
        <span className="blog-card__badge">Industry Insights</span>
      </Link>
      <div className="blog-card__content">
        <div className="blog-card__meta">
          {post.publishedAt ? (
            <time>
              {post.publishedAt.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </time>
          ) : (
            <span>Latest article</span>
          )}
          {post.readingTime ? <span>{post.readingTime} min read</span> : null}
        </div>
        <h2>
          <Link href={publicPath(post.path)}>{post.title}</Link>
        </h2>
        {post.excerpt ? (
          <p>{post.excerpt}</p>
        ) : (
          <p>
            Explore practical insights, product knowledge and engineering
            guidance from Jyoti Hydraulic.
          </p>
        )}
        <Link href={publicPath(post.path)} className="blog-card__link">
          Read Article <span aria-hidden>→</span>
        </Link>
      </div>
    </article>
  );
}

export default async function BlogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = await searchParams;
  const search = query.q?.trim() ?? "";
  const [posts, cmsPage] = await Promise.all([
    publishedPosts(24, false, search),
    resolvePublishedContentByPath("blogs"),
  ]);
  const rawSummary = cmsPage?.summary?.trim();
  const pageSummary =
    rawSummary && rawSummary.length < 220
      ? rawSummary
      : "Explore technical guides, hydraulic product insights and practical advice from our engineering team.";

  return (
    <main className="listing-page blogs-page">
      <div className="site-page-banner">
        <div className="site-container page-banner-inner">
          <p className="page-kicker">Knowledge centre</p>
          <h1>{cmsPage?.title || "Insights & Articles"}</h1>
          <p>{pageSummary}</p>
        </div>
      </div>
      <div className="site-container blog-index">
        <form className="insights-search blog-index__search" action="/blogs/" method="get">
          <input
            name="q"
            defaultValue={search}
            placeholder="Search articles..."
            aria-label="Search articles"
            suppressHydrationWarning
          />
        </form>
        <div className="blog-index__heading">
          <div>
            <p className="section-label">Latest from Jyoti Hydraulic</p>
            <h2>Engineering Knowledge, Made Practical</h2>
          </div>
          <p>
            Stay informed with product explainers, maintenance advice and
            industry updates.
          </p>
        </div>
        {posts.length ? (
          <ul className="blog-grid">
            {posts.map((post, index) => (
              <li
                key={post.id}
                className={index === 0 ? "blog-grid__featured" : ""}
              >
                <BlogCard post={post} featured={index === 0} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="blog-empty">
            <h2>{search ? `No articles match “${search}”` : "Articles are coming soon"}</h2>
            <p>
              {search
                ? "Try a different word, or browse the latest articles."
                : "Our engineering team is preparing useful industry resources."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
