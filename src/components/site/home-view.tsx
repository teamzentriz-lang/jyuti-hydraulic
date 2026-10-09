import Link from "next/link";
import { AboutReveal } from "@/components/site/about-reveal";
import { CmsImage } from "@/components/site/cms-image";
import { ContactSection } from "@/components/site/contact-section";
import { CountUp } from "@/components/site/count-up";
import { ProductCard } from "@/components/site/product-card";
import { cleanPublicBody, cleanPublicTitle } from "@/lib/cms/clean-copy";
import {
  featuredProductsForHome,
  getHome,
  homePageCategoryShowcases,
  mediaItems,
  publishedPosts,
} from "@/lib/cms/queries";
import { publicPath } from "@/lib/paths";

const Arrow = () => <span aria-hidden>→</span>;

function plainExcerpt(html: string, max = 220) {
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/this is placeholder copy for layout preview\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "";
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const stop = cut.lastIndexOf(". ");
  return stop > 70 ? cut.slice(0, stop + 1) : `${cut.trim()}…`;
}

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
  const heroImage =
    heroImages[0] ??
    (home.aboutMediaId ? mediaById.get(home.aboutMediaId) : undefined);
  const aboutImage = home.aboutMediaId
    ? mediaById.get(home.aboutMediaId)
    : heroImages[1];
  const products = showcases
    .flatMap((section) => section.products)
    .filter((p, i, all) => all.findIndex((x) => x.id === p.id) === i)
    .slice(0, 8);
  const displayProducts = products.length ? products : featured.slice(0, 8);
  const intro = plainExcerpt(home.heroSubcopy.trim() || home.aboutBody);
  const strengths = [
    ["quality", "High Quality", "Manufacturing"],
    ["custom", "Custom-Built", "Solutions"],
    ["supply", "Pan India", "Supply"],
    ["support", "Technical", "Support"],
    ["trusted", "Trusted by", "Industries"],
  ] as const;

  const heroFallback =
    displayProducts.find(
      (item) => item.imageUrl && /cylinder/i.test(item.title),
    )?.imageUrl ??
    displayProducts.find(
      (item) => item.imageUrl && /power pack/i.test(item.title),
    )?.imageUrl ??
    null;
  const stats = [
    ["12+", "Years of Experience"],
    ["1000+", "Products Delivered"],
    ["500+", "Happy Clients"],
    ["Pan India", "Supply Network"],
  ] as const;
  const clients = [
    ["Konica Minolta", "/clients/konica-minolta.jpg"],
    ["Crompton", "/clients/crompton.jpg"],
    ["Maruti Suzuki", "/clients/maruti-suzuki.jpg"],
    ["Nestlé", "/clients/nestle.jpg"],
    ["Philips", "/clients/philips.jpg"],
    ["Tupperware", "/clients/tupperware.jpg"],
    ["Surya", "/clients/surya.jpg"],
    ["Honda", "/clients/honda.jpg"],
    ["JCB", "/clients/jcb.jpg"],
    ["Campus", "/clients/campus.jpg"],
  ] as const;
  const usps = [
    [
      "01",
      "Application-first engineering",
      "Hydraulic systems selected and configured around real operating requirements.",
    ],
    [
      "02",
      "Pan-India supply",
      "Reliable product availability and delivery support across industrial regions.",
    ],
    [
      "03",
      "Responsive support",
      "Practical guidance for selection, commissioning and after-sales requirements.",
    ],
    [
      "04",
      "Experienced team",
      "Hands-on hydraulic knowledge backed by manufacturing and field experience.",
    ],
    [
      "05",
      "In-house solutions",
      "Standard products and custom-built assemblies from one dependable partner.",
    ],
  ] as const;
  const testimonials = [
    [
      "The team understood our application quickly and recommended a practical hydraulic solution that integrated smoothly with our equipment.",
      "Industrial equipment customer",
    ],
    [
      "Clear technical communication, dependable product quality and responsive support made the entire procurement process straightforward.",
      "Manufacturing customer",
    ],
    [
      "Jyoti Hydraulic has been a reliable partner for custom requirements, delivery coordination and after-sales assistance.",
      "OEM customer",
    ],
  ] as const;

  return (
    <main className="home-page motion-page">
      <AboutReveal />
      <section className="hero-industrial">
        {heroImage ? (
          <CmsImage
            item={heroImage}
            alt=""
            className="hero-industrial__image about-photo"
          />
        ) : heroFallback ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroFallback}
            alt=""
            className="hero-industrial__image about-photo"
          />
        ) : null}
        <div className="hero-industrial__shade" />
        <div className="site-container hero-industrial__content">
          <div className="hero-copy">
            <p className="eyebrow about-rule">
              {home.heroEyebrow || "Industrial hydraulic solutions"}
            </p>
            <h1 className="about-in" style={{ animationDelay: "80ms" }}>
              {home.heroHeadline ||
                "Engineered for power. Built for your industry."}
            </h1>
            {intro ? (
              <p
                className="hero-intro about-in"
                style={{ animationDelay: "160ms" }}
              >
                {intro}
              </p>
            ) : null}
            <div
              className="hero-actions about-in"
              style={{ animationDelay: "240ms" }}
            >
              <Link href="/products/" className="site-btn-primary">
                Explore products <Arrow />
              </Link>
              <Link href="/contact/" className="site-btn-ghost">
                Request a quote
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="clients-rail" aria-labelledby="clients-title">
        <div className="site-container clients-rail__heading">
          <p className="eyebrow dark">Trusted across industries</p>
          <h2 id="clients-title">Our Clients</h2>
        </div>
        <div className="clients-rail__viewport">
          <div className="clients-rail__track">
            {[...clients, ...clients].map(([name, logo], index) => (
              <div
                className="client-logo"
                key={`${name}-${index}`}
                aria-hidden={index >= clients.length}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logo}
                  alt={index < clients.length ? `${name} logo` : ""}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="trust-strip" aria-label="Company strengths">
        <div className="site-container trust-grid">
          {strengths.map(([type, title, caption], index) => (
            <div
              className="trust-item about-check"
              key={title}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="trust-icon">
                <LineIcon type={type} />
              </span>
              <span>
                <b>{title}</b>
                <small>{caption}</small>
              </span>
            </div>
          ))}
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
        {aboutImage ? (
          <CmsImage
            item={aboutImage}
            alt="Hydraulic engineering"
            className="custom-band__image about-photo"
          />
        ) : null}
        <div className="site-container custom-band__inner">
          <div className="custom-band__panel about-in">
            <p className="eyebrow">Made around your application</p>
            <h2>Custom Hydraulic Solutions for Every Industry</h2>
            <p>
              From standard power packs to fully customized systems, our team
              designs and manufactures equipment that meets your exact
              requirements.
            </p>
            <Link href="/contact/" className="site-btn-primary">
              Get a custom solution <Arrow />
            </Link>
          </div>
        </div>
      </section>
      <section className="stats-strip">
        <div className="site-container stats-grid">
          {stats.map(([value, label], index) => (
            <div
              key={label}
              className="about-in"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <CountUp value={value} as="strong" />
              <span>{label}</span>
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
            {usps.map(([number, title, body], index) => (
              <li
                key={title}
                className="about-tile"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <span>{number}</span>
                <div className="usp-icon" aria-hidden>
                  ✓
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
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
            {testimonials.map(([quote, customer], index) => (
              <li
                key={customer}
                className="about-slide"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <span className="quote-mark" aria-hidden>
                  “
                </span>
                <blockquote>{quote}</blockquote>
                <p>{customer}</p>
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
