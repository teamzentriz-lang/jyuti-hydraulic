import Link from "next/link";
import { CmsImage } from "@/components/site/cms-image";
import { ProductCard } from "@/components/site/product-card";
import { RichTextHtml } from "@/components/site/rich-text-html";
import {
  featuredProductsForHome,
  getHome,
  homePageCategoryShowcases,
  mediaItems,
  publishedPosts,
} from "@/lib/cms/queries";
import { publicPath } from "@/lib/paths";

function SectionTitle({ children, as = "h2" }: { children: React.ReactNode; as?: "h1" | "h2" }) {
  const Tag = as;
  return (
    <Tag className="relative pl-4 text-2xl font-bold uppercase tracking-tight text-navy before:absolute before:left-0 before:top-1 before:h-[calc(100%-0.25rem)] before:w-1 before:bg-signal md:text-3xl">
      {children}
    </Tag>
  );
}

export async function HomeView() {
  const home = await getHome();
  const mediaIds = [...home.heroMediaIds, ...(home.aboutMediaId ? [home.aboutMediaId] : [])];
  const pillars = home.aboutPillars?.length ? home.aboutPillars : [];
  const [media, featured, showcases, posts] = await Promise.all([
    mediaItems(mediaIds),
    featuredProductsForHome(home.featuredProductIds),
    homePageCategoryShowcases(home.showcaseCategoryPaths ?? [], 6, 3),
    publishedPosts(3),
  ]);
  const mediaById = new Map(media.map((item) => [item.id, item]));
  const heroImages = home.heroMediaIds.flatMap((id) => {
    const item = mediaById.get(id);
    return item ? [item] : [];
  });
  const aboutImage = home.aboutMediaId ? mediaById.get(home.aboutMediaId) : undefined;
  const aboutIntro = home.aboutBody.trim() ? home.aboutBody : home.heroSubcopy ? `<p>${home.heroSubcopy}</p>` : "";

  return (
    <main>
      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-[1200px] px-4 py-14 lg:px-6 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              {home.heroEyebrow ? (
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-signal">{home.heroEyebrow}</p>
              ) : null}
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-navy lg:text-4xl">
                {home.heroHeadline || home.aboutTitle}
              </h1>
              {aboutIntro ? (
                <RichTextHtml html={aboutIntro} className="rich-text mt-5 max-w-xl text-base leading-8 text-muted" />
              ) : null}
              <Link
                href="/about-us/"
                className="site-btn-primary mt-8 inline-flex"
              >
                Read more
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {heroImages.length ? (
                heroImages.map((image) => (
                  <CmsImage
                    key={image.id}
                    item={image}
                    alt={home.heroHeadline}
                    className="aspect-[4/3] w-full rounded-sm border border-line object-cover shadow-sm"
                  />
                ))
              ) : aboutImage ? (
                <CmsImage
                  item={aboutImage}
                  alt={home.aboutTitle}
                  className="col-span-2 aspect-[16/9] w-full rounded-sm border border-line object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/placeholders/product.svg"
                  alt=""
                  className="col-span-2 aspect-[16/9] w-full rounded-sm border border-line object-cover"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {pillars.length ? (
        <section className="border-b border-line bg-white">
          <div className="mx-auto max-w-[1200px] px-4 py-14 lg:px-6">
            <ul className="grid gap-6 md:grid-cols-3">
              {pillars.map((item, index) => (
                <li key={item.title} className="group relative border border-line bg-paper p-6 pt-8">
                  <span className="absolute -top-4 left-6 flex h-10 w-10 items-center justify-center rounded-full bg-signal text-sm font-bold text-white">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-lg font-bold text-navy">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {showcases.map((section, sectionIndex) => (
        <section
          key={section.id}
          className={`border-b border-line ${sectionIndex % 2 === 0 ? "bg-white" : "bg-paper"}`}
        >
          <div className="mx-auto max-w-[1200px] px-4 py-14 lg:px-6">
            <SectionTitle as="h2">{section.title}</SectionTitle>
            {section.products.length ? (
              <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {section.products.map((product) => (
                  <li key={product.id}>
                    <ProductCard
                      title={product.title}
                      path={product.path}
                      summary={product.summary}
                      imageUrl={product.imageUrl}
                      imageAlt={product.imageAlt}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-8 text-sm text-muted">
                No products in this category yet. Add categories in the CMS or run npm run db:seed-structure.
              </p>
            )}
          </div>
        </section>
      ))}

      {featured.length ? (
        <section className="border-b border-line bg-paper">
          <div className="mx-auto max-w-[1200px] px-4 py-14 lg:px-6">
            <SectionTitle>Featured products</SectionTitle>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((product) => (
                <li key={product.id}>
                  <ProductCard
                    title={product.title}
                    path={product.path}
                    summary={product.summary}
                    imageUrl={product.imageUrl}
                    imageAlt={product.imageAlt}
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {home.whyChooseUs.length ? (
        <section className="border-b border-line bg-navy text-white">
          <div className="mx-auto max-w-[1200px] px-4 py-14 lg:px-6">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-signal">Why choose us</p>
            {home.whyChooseTitle ? (
              <h2 className="mt-2 max-w-3xl text-2xl font-bold md:text-3xl">{home.whyChooseTitle}</h2>
            ) : null}
            {home.whyChooseIntro ? (
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/85">{home.whyChooseIntro}</p>
            ) : null}
            <ul className="mt-10 grid gap-6 md:grid-cols-3">
              {home.whyChooseUs.map((item, index) => (
                <li key={`${item.title}-${index}`} className="border border-white/15 bg-white/5 p-5">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/85">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {(home.visionBody || home.missionBody) && (
        <section className="border-b border-line bg-white">
          <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-14 lg:grid-cols-2 lg:px-6">
            <div className="border border-line bg-paper p-6">
              <h2 className="text-lg font-bold uppercase text-navy">{home.visionTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-muted">{home.visionBody}</p>
            </div>
            <div className="border border-line bg-paper p-6">
              <h2 className="text-lg font-bold uppercase text-navy">{home.missionTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-muted">{home.missionBody}</p>
            </div>
          </div>
        </section>
      )}

      {posts.length ? (
        <section className="bg-paper">
          <div className="mx-auto max-w-[1200px] px-4 py-14 lg:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionTitle>Our blogs</SectionTitle>
              <Link href="/blogs/" className="text-sm font-semibold text-signal hover:underline">
                View all posts
              </Link>
            </div>
            <ul className="mt-10 grid gap-6 md:grid-cols-3">
              {posts.map((post) => (
                <li key={post.id} className="border border-line bg-white p-5 shadow-sm">
                  {post.publishedAt ? (
                    <time className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {post.publishedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </time>
                  ) : null}
                  <h3 className="mt-2 text-lg font-semibold text-navy">
                    <Link href={publicPath(post.path)} className="hover:text-signal hover:underline">
                      {post.title}
                    </Link>
                  </h3>
                  {post.excerpt ? <p className="mt-2 text-sm leading-6 text-muted">{post.excerpt}</p> : null}
                  <Link
                    href={publicPath(post.path)}
                    className="mt-4 inline-block text-sm font-semibold text-signal hover:underline"
                  >
                    Read more
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </main>
  );
}
