import Link from "next/link";
import { AboutReveal } from "@/components/site/about-reveal";
import { ContactSection } from "@/components/site/contact-section";
import { CountUp } from "@/components/site/count-up";
import {
  HomeBanner,
  type HomeBannerSlide,
} from "@/components/site/home-banner";
import { ProductCard } from "@/components/site/product-card";
import { cleanPublicBody, cleanPublicTitle } from "@/lib/cms/clean-copy";
import {
  featuredProductsForHome,
  getHome,
  homePageCategoryShowcases,
  mediaItems,
  publishedPosts,
} from "@/lib/cms/queries";
import { mediaDeliveryUrl } from "@/lib/media-url";
import {
  defaultClients,
  defaultStats,
  defaultStrengths,
  defaultTestimonials,
  defaultUsps,
} from "@/lib/brand";
import { publicPath } from "@/lib/paths";

function aboutCopy(html: string) {
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  const full =
    "Jyoti Hydraulic is committed to delivering advanced hydraulic solutions tailored to meet diverse industrial requirements. With a strong focus on quality, reliability, and customer satisfaction, we specialize in the design and manufacturing of a wide range of high-performance hydraulic components. Whether it's hydraulic cylinders, rotary joints, screw jacks, or other precision-engineered products, every solution we offer is built with innovation and attention to detail to ensure long-lasting performance and efficiency.";
  return plain.length > full.length ? plain : full;
}

const Arrow = () => <span aria-hidden>→</span>;

function LineIcon({
  type,
}: {
  type: "quality" | "custom" | "supply" | "support" | "trusted";
}) {
  const paths = {
    quality: (
      <path d="M12 2l2.2 2.2 3.1-.1.7 3 2.3 2-1.3 2.8.8 3-2.7 1.6-.9 3-3.1-.4L12 22l-2.2-2.2-3.1.4-.9-3-2.7-1.6.8-3-1.3-2.8 2.3-2 .7-3 3.1.1L12 2zm-3 10l2 2 4-4" />
    ),
    custom: (
      <path d="M9.5 4.5l2 2-5 5-2-2 5-5zm5 8l5 5-2 2-5-5M13 3l2 2-3 3-2-2 3-3zM5 13l2 2-3 6-1-1 2-7z" />
    ),
    supply: (
      <>
        <path d="M12 21s7-5.1 7-12A7 7 0 105 9c0 6.9 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.3" />
      </>
    ),
    support: (
      <>
        <path d="M4 13v-2a8 8 0 0116 0v2M4 13h3v6H5a2 2 0 01-2-2v-2a2 2 0 012-2zm16 0h-3v6h2a2 2 0 002-2v-2a2 2 0 00-2-2zM17 19c-1 2-3 2-5 2" />
      </>
    ),
    trusted: (
      <>
        <path d="M12 3l2.4 4.8 5.3.8-3.8 3.7.9 5.3L12 15.8 7.2 17.6l.9-5.3L4.3 8.6l5.3-.8L12 3z" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[type]}
    </svg>
  );
}

type LineIconType = Parameters<typeof LineIcon>[0]["type"];

function lineIconType(value?: string): LineIconType {
  return value === "custom" ||
    value === "supply" ||
    value === "support" ||
    value === "trusted"
    ? value
    : "quality";
}

export async function HomeView() {
  const home = await getHome();
  const mediaIds = [
    ...home.heroMediaIds,
    ...(home.aboutMediaId ? [home.aboutMediaId] : []),
  ];
  const [media, featured, showcases, posts] = await Promise.all([
    mediaItems(mediaIds),
    featuredProductsForHome(home.featuredProductIds),
    homePageCategoryShowcases(home.showcaseCategoryPaths ?? [], 6, 3),
    publishedPosts(3),
  ]);
  const mediaById = new Map(media.map((item) => [item.id, item]));
  const heroImages = home.heroMediaIds.flatMap((id) =>
    mediaById.get(id) ? [mediaById.get(id)!] : [],
  );
  const banners: HomeBannerSlide[] = heroImages.map((item) => ({
    src: mediaDeliveryUrl(item),
    alt: item.alt || item.filename || "Jyoti Hydraulic",
  }));
  const products = showcases
    .flatMap((section) => section.products)
    .filter((p, i, all) => all.findIndex((x) => x.id === p.id) === i)
    .slice(0, 8);
  const displayProducts = products.length ? products : featured.slice(0, 8);
  const aboutImage = home.aboutMediaId
    ? mediaById.get(home.aboutMediaId)
    : null;
  const aboutImageUrl = aboutImage
    ? mediaDeliveryUrl(aboutImage)
    : "/brand/building.webp";
  const aboutImageAlt = aboutImage?.alt || "Jyoti Hydraulic office building";

  const strengths =
    home.strengths && home.strengths.length > 0
      ? home.strengths
      : defaultStrengths;
  const stats = home.stats && home.stats.length > 0 ? home.stats : defaultStats;
  const clientLogos =
    home.clientLogos && home.clientLogos.length > 0
      ? home.clientLogos
      : defaultClients;
  const usps = home.usps && home.usps.length > 0 ? home.usps : defaultUsps;
  const testimonials =
    home.testimonials && home.testimonials.length > 0
      ? home.testimonials
      : defaultTestimonials;

  return (
    <main className="home-page motion-page">
      <AboutReveal />
      <HomeBanner slides={banners} />
      <section className="trust-strip" aria-label="Company strengths">
        <div className="site-container trust-grid">
          {strengths.map((item, index) => (
            <div
              className="trust-item about-check"
              key={item.title || index}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="trust-icon">
                <LineIcon type={lineIconType(item.icon)} />
              </span>
              <span>
                <b>{item.title}</b>
                <small>{item.subtitle}</small>
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="clients-rail" aria-labelledby="clients-title">
        <div className="site-container clients-rail__heading">
          <p className="eyebrow dark">Trusted across industries</p>
          <h2 id="clients-title">Our Clients</h2>
        </div>
        <div className="clients-rail__viewport">
          <div className="clients-rail__track">
            {[...clientLogos, ...clientLogos].map((client, index) => (
              <div
                className="client-logo"
                key={`${client.name}-${index}`}
                aria-hidden={index >= clientLogos.length}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={client.logo}
                  alt={index < clientLogos.length ? `${client.name} logo` : ""}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="home-about" aria-labelledby="home-about-title">
        <div className="home-about__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={aboutImageUrl} alt={aboutImageAlt} />
        </div>
        <div className="home-about__copy">
          <h1 id="home-about-title">{home.aboutTitle || "About Us"}</h1>
          <p>{aboutCopy(home.aboutBody)}</p>
          <Link href="/about-us/" className="site-btn-primary">
            Read more <Arrow />
          </Link>
        </div>
      </section>
      {displayProducts.length ? (
        <section className="section-shell products-section">
          <div className="site-container">
            <div className="section-heading about-in">
              <div>
                <p className="eyebrow dark">Built for demanding applications</p>
                <h2>Our Product Range</h2>
                <p>
                  Explore dependable hydraulic solutions engineered for
                  performance, safety and long service life.
                </p>
              </div>
              <Link href="/products/" className="site-btn-outline">
                View all products <Arrow />
              </Link>
            </div>
            <ul className="product-grid">
              {displayProducts.map((product, index) => (
                <li
                  key={product.id}
                  className="about-tile"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <ProductCard {...product} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
      <section className="custom-band">
        <div className="site-container custom-band__inner">
          <div className="custom-band__panel">
            <p className="eyebrow">
              {home.customBandEyebrow || "Made around your application"}
            </p>
            <h2>
              {home.customBandTitle ||
                "Custom Hydraulic Solutions for Every Industry"}
            </h2>
            <p>
              {home.customBandBody ||
                "From standard power packs to fully customized systems, our team designs and manufactures equipment that meets your exact requirements."}
            </p>
            <Link
              href={home.customBandButtonHref || "/contact/"}
              className="site-btn-primary"
            >
              {home.customBandButtonText || "Get a custom solution"} <Arrow />
            </Link>
          </div>
        </div>
      </section>
      <section className="stats-strip">
        <div className="site-container stats-grid">
          {stats.map((item, index) => (
            <div
              key={item.label || index}
              className="about-in"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <CountUp value={item.value} as="strong" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="section-shell why-section">
        <div className="site-container">
          <div className="section-heading centered about-in">
            <div>
              <p className="eyebrow dark">The Jyoti advantage</p>
              <h2>{home.whyChooseTitle || "Why Choose Us?"}</h2>
              <p>{home.whyChooseIntro}</p>
            </div>
          </div>
          <ul className="why-grid">
            {(home.whyChooseUs.length
              ? home.whyChooseUs
              : home.visionBody || home.missionBody
                ? [
                    { title: home.visionTitle, body: home.visionBody },
                    { title: home.missionTitle, body: home.missionBody },
                  ]
                : [
                    {
                      title: "Unmatched quality and durability",
                      body: "Carefully selected materials and consistent manufacturing for equipment that stays in service.",
                    },
                    {
                      title: "Exceptional customer support",
                      body: "Responsive help with product selection, technical questions and after-sales requirements.",
                    },
                    {
                      title: "Innovative engineering",
                      body: "Standard products and custom hydraulic systems engineered around your specification.",
                    },
                  ]
            ).map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className="about-slide"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <CountUp value={String(index + 1)} pad={2} />
                <h3>{item.title}</h3>
                <p>{cleanPublicBody(item.body)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section
        className="section-shell usp-section"
        aria-labelledby="usp-title"
      >
        <div className="site-container">
          <div className="section-heading centered about-in">
            <div>
              <p className="eyebrow dark">What sets us apart</p>
              <h2 id="usp-title">Our USPs</h2>
            </div>
          </div>
          <ul className="usp-grid">
            {usps.map((item, index) => (
              <li
                key={item.title || index}
                className="about-tile"
                style={{ animationDelay: `${index * 70}ms` }}
              >
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
      <section
        className="testimonials-section"
        aria-labelledby="testimonials-title"
      >
        <div className="site-container">
          <div className="section-heading centered about-in">
            <div>
              <p className="eyebrow">Customer feedback</p>
              <h2 id="testimonials-title">What Our Customers Say</h2>
            </div>
          </div>
          <ul className="testimonials-grid">
            {testimonials.map((item, index) => (
              <li
                key={index}
                className="about-slide"
                style={{ animationDelay: `${index * 80}ms` }}
              >
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
      {posts.length ? (
        <section className="section-shell insights-section">
          <div className="site-container">
            <div className="section-heading about-in">
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
                  placeholder="Search articles..."
                  aria-label="Search articles"
                  suppressHydrationWarning
                />
              </form>
            </div>
            <ul className="insights-grid">
              {posts.map((post, index) => (
                <li
                  key={post.id}
                  className="about-tile"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <article>
                    <Link
                      href={publicPath(post.path)}
                      className={`article-visual article-visual--${index + 1}`}
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
                        Read more <Arrow />
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
      <ContactSection embedded pagePath="/" />
    </main>
  );
}
