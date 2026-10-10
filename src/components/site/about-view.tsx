import Link from "next/link";
import { AboutFaq } from "@/components/site/about-faq";
import { AboutReveal } from "@/components/site/about-reveal";
import type { PublishedContent } from "@/lib/cms/published-content";
import { getHome } from "@/lib/cms/queries";

const valueLabels = [
  "Accountability",
  "Partnership",
  "Leadership",
  "Support",
  "Courage",
  "Innovation",
  "Commitment",
  "Integrity",
];

const offerLabels = [
  "On-site spares availability",
  "Strong OEM partnership",
  "Skilled on-site support",
  "Dedicated service manager",
  "Real-time equipment monitoring",
  "Immediate response",
];

function plainText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function imagesIn(html: string) {
  return [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((match) => match[1]);
}

function paragraphsIn(html: string) {
  return [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => plainText(match[1])).filter(Boolean);
}

function parseAbout(html: string) {
  const valuesAt = html.search(/Our Values/i);
  const offersAt = html.search(/We Offer/i);
  const story = valuesAt > 0 ? html.slice(0, valuesAt) : html;
  const valuesHtml = valuesAt > 0 ? html.slice(valuesAt, offersAt > valuesAt ? offersAt : undefined) : "";
  const offersHtml = offersAt > 0 ? html.slice(offersAt) : "";
  const paragraphs = paragraphsIn(html);
  const storyImages = imagesIn(story);
  const welcomeTitle =
    plainText(html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || "") || "Welcome to Jyoti Hydraulic";
  const reasonTitles = [...html.matchAll(/<a\b(?![^>]*href\s*=)[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => plainText(match[1]))
    .filter(Boolean);

  return {
    welcomeTitle,
    intro: paragraphs[0] || "",
    products: [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((match) => plainText(match[1]))
      .filter(Boolean),
    welcomeImage: storyImages[0] || "",
    whyTitle: "Elevate Your Operations with Hydraulic Power Packs",
    whyImage: storyImages[1] || "",
    whyBody: paragraphs[1] || "",
    reasons: reasonTitles.map((title, index) => ({
      title,
      body: paragraphs[index + 2] || "",
    })),
    vision: plainText(html.match(/<h4[^>]*>\s*VISION\s*<\/h4>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || ""),
    mission: plainText(html.match(/<h4[^>]*>\s*Mission\s*<\/h4>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || ""),
    values: imagesIn(valuesHtml),
    offers: imagesIn(offersHtml),
  };
}

const fallbackAboutHtml = `
<h2>Welcome to Jyoti Hydraulic</h2>
<p>Jyoti Hydraulic is committed to delivering advanced hydraulic solutions tailored to meet diverse industrial requirements. With a strong focus on quality, reliability, and customer satisfaction, we specialize in the design and manufacturing of a wide range of high-performance hydraulic components. Whether it's hydraulic cylinders, rotary joints, screw jacks, or other precision-engineered products, every solution is built with innovation and attention to detail to ensure long-lasting performance and efficiency. Established in 2014 in Faridabad, Jyoti Hydraulic manufactures hydraulic equipment, jigs, and fixtures for industrial and mobile machinery.</p>
<img src="/brand/building.webp" alt="Jyoti Hydraulic office building" />
`;

export const fallbackAboutContent: PublishedContent = {
  kind: "page",
  path: "about-us",
  title: "About Us",
  seoTitle: "About Us",
  seoDescription:
    "Jyoti Hydraulic manufactures hydraulic equipment, jigs, and fixtures in Faridabad.",
  summary:
    "Established in 2014 in Faridabad. Manufacturer of hydraulic equipment, jigs, and fixtures.",
  body: fallbackAboutHtml,
};

function splitWelcome(title: string) {
  const match = title.match(/^(welcome to)\s+(.+)$/i);
  if (!match) return { lead: title, brand: "" };
  return { lead: "Welcome to", brand: match[2] };
}

export async function AboutView({ content }: { content: PublishedContent }) {
  const home = await getHome();
  const about = parseAbout(content.body.trim() || home.aboutBody);
  const welcome = splitWelcome(about.welcomeTitle);

  return (
    <main className="about-page motion-page">
      <AboutReveal />
      <section className="bg-[#f3f4f6]">
        <div className="site-container grid items-center gap-8 py-10 md:grid-cols-[1.05fr_0.95fr] md:py-14 lg:gap-10 lg:py-20">
          <div>
            <p className="about-rule w-fit border-b-2 border-[#2f6fed] pb-1 text-sm font-semibold text-[#243044]">
              About Us
            </p>
            <h1 className="about-in mt-4 text-4xl font-bold leading-tight tracking-tight text-[#1c2430] md:text-5xl" style={{ animationDelay: "80ms" }}>
              {welcome.lead}
              {welcome.brand ? (
                <span className="mt-1 block text-[#1a56c4]">{welcome.brand}</span>
              ) : null}
            </h1>
            {about.intro ? (
              <p className="about-in mt-5 text-[15px] leading-7 text-[#5c6775] lg:max-w-xl" style={{ animationDelay: "160ms" }}>
                {about.intro}
              </p>
            ) : null}
            {about.products.length ? (
              <ul className="mt-6 grid gap-y-3">
                {about.products.map((name, index) => (
                  <li
                    key={name}
                    className="about-check flex items-start gap-2.5 text-sm font-semibold text-[#243044]"
                    style={{ animationDelay: `${240 + index * 70}ms` }}
                  >
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#ff7a18] text-white">
                      <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
                        <path
                          d="M3.5 8.2 6.4 11 12.5 4.8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    {name}
                  </li>
                ))}
              </ul>
            ) : null}
            <Link
              href="/products/"
              className="about-in mt-8 inline-block bg-[#0d3b78] px-7 py-3 text-[13px] font-bold uppercase tracking-[0.04em] text-white transition hover:bg-[#062747]"
              style={{ animationDelay: "480ms" }}
            >
              View products
            </Link>
          </div>
          {about.welcomeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={about.welcomeImage}
              alt="Jyoti Hydraulic workshop"
              className="about-photo h-full max-h-[420px] w-full rounded-md object-cover"
            />
          ) : null}
        </div>
      </section>

      {about.whyBody || about.whyImage || about.reasons.length ? (
      <section className="site-container py-16">
        <h2 className="about-in text-center text-3xl font-semibold text-[#2456a6]">Why Choose Us</h2>
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
          <div className="about-in" style={{ animationDelay: "80ms" }}>
            <span className="about-rule mb-4 block h-[3px] w-12 bg-[#2456a6]" aria-hidden="true" />
            <h3 className="text-3xl font-semibold leading-tight text-[#2456a6] lg:max-w-md">{about.whyTitle}</h3>
            <div className="mt-6 flex items-start gap-4">
              {about.whyImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={about.whyImage}
                  alt="Hydraulic power packs"
                  className="about-tile h-28 w-36 shrink-0 object-contain"
                />
              ) : null}
              {about.whyBody ? (
                <p className="text-[15px] font-semibold leading-7 text-[#243044]">{about.whyBody}</p>
              ) : null}
            </div>
          </div>
          {about.reasons.length ? <AboutFaq items={about.reasons} /> : null}
        </div>
      </section>
      ) : null}

      {(about.vision || about.mission) && (
        <section className="site-container grid gap-4 pb-10 lg:grid-cols-2">
          {about.vision ? (
            <article className="about-statement" style={{ animationDelay: "40ms" }}>
              <span className="about-statement__slash about-statement__slash--top" aria-hidden="true" />
              <span className="about-statement__slash about-statement__slash--bottom" aria-hidden="true" />
              <div className="about-statement__body">
                <span className="about-statement__icon">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                    <path
                      d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <circle cx="12" cy="12" r="2.6" fill="currentColor" />
                  </svg>
                </span>
                <h2 className="mt-3 text-xl font-bold tracking-wide">VISION</h2>
                <p className="mt-2 text-sm leading-6 text-white/95">{about.vision}</p>
              </div>
            </article>
          ) : null}
          {about.mission ? (
            <article className="about-statement" style={{ animationDelay: "160ms" }}>
              <span className="about-statement__slash about-statement__slash--top" aria-hidden="true" />
              <span className="about-statement__slash about-statement__slash--bottom" aria-hidden="true" />
              <div className="about-statement__body">
                <span className="about-statement__icon">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                    <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="12" r="1" fill="currentColor" />
                  </svg>
                </span>
                <h2 className="mt-3 text-xl font-bold tracking-wide">Mission</h2>
                <p className="mt-2 text-sm leading-6 text-white/95">{about.mission}</p>
              </div>
            </article>
          ) : null}
        </section>
      )}

      {about.values.length ? (
        <section className="site-container pb-16">
          <h2 className="about-in text-center text-3xl font-semibold text-[#2456a6]">Our Values</h2>
          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {about.values.map((src, index) => (
              <li key={src} className="about-tile" style={{ animationDelay: `${index * 70}ms` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={valueLabels[index] || "Our value"}
                  className="mx-auto h-auto w-full max-w-[220px] object-contain"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {about.offers.length ? (
        <section className="bg-gradient-to-b from-[#f0b429] via-[#c9b15a] to-[#3d8f86] py-8">
          <div className="site-container">
            <h2 className="about-in text-center text-2xl font-semibold text-[#2456a6]">We Offer</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {about.offers.map((src, index) => (
                <li key={src} className="about-offer" style={{ animationDelay: `${index * 80}ms` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={offerLabels[index] || "What we offer"}
                    className="mx-auto h-44 w-full object-contain sm:h-52"
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </main>
  );
}
