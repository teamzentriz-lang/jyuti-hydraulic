import type { Metadata } from "next";
import Link from "next/link";
import { CmsPageIntro } from "@/components/site/cms-page-intro";
import { contentMetadata } from "@/components/site/content-view";
import { publishedPosts, getSettings } from "@/lib/cms/queries";
import { resolvePublishedContentByPath } from "@/lib/cms/published-content";
import { getSite } from "@/lib/cms/site";
import { publicPath } from "@/lib/paths";

export async function generateMetadata(): Promise<Metadata> {
  const content = await resolvePublishedContentByPath("blogs");
  if (content) {
    const site = await getSite();
    return contentMetadata(content, site.settings.companyName);
  }
  const settings = await getSettings();
  return { title: `Blogs | ${settings.companyName}` };
}

export default async function BlogsPage() {
  const [posts, cmsPage] = await Promise.all([publishedPosts(24), resolvePublishedContentByPath("blogs")]);

  const pageTitle = cmsPage?.title ?? "Our blogs";
  const pageSummary = cmsPage?.summary ?? "Industry articles and product guides.";

  return (
    <main>
      <div className="site-page-banner">
        <div className="mx-auto max-w-[1200px] px-4 py-10 lg:px-6">
          <h1 className="text-3xl font-bold md:text-4xl">{pageTitle}</h1>
          <p className="mt-3 max-w-2xl text-white/85">{pageSummary}</p>
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] px-4 py-12 lg:px-6">
      {cmsPage ? <CmsPageIntro content={cmsPage} hideHeading /> : null}
      {posts.length ? (
        <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.id} className="rounded-lg border border-line bg-white p-5">
              {post.publishedAt ? (
                <time className="text-xs font-semibold uppercase text-muted">
                  {post.publishedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </time>
              ) : null}
              <h2 className="mt-2 text-lg font-semibold text-navy">
                <Link href={publicPath(post.path)} className="hover:underline">
                  {post.title}
                </Link>
              </h2>
              {post.excerpt ? <p className="mt-2 text-sm leading-6 text-muted">{post.excerpt}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-sm text-muted">No published posts yet. Create posts in the admin and set status to Published.</p>
      )}
      </div>
    </main>
  );
}
