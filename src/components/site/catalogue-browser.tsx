"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { AboutFaq } from "@/components/site/about-faq";
import { cleanPublicExcerpt, cleanPublicTitle } from "@/lib/cms/clean-copy";
import { publicPath } from "@/lib/paths";
import { RichTextHtml } from "@/components/site/rich-text-html";

export type CatalogueCard = {
  id: string;
  title: string;
  path: string;
  summary: string;
  imageUrl: string | null;
  imageAlt: string;
  cta: string;
  chip: string;
  scope: "group" | "item";
};

export type CatalogueChip = {
  id: string;
  label: string;
  href?: string;
};

export function CatalogueBrowser({
  title,
  subtitle = "ISO-9001:2015 Certified Company",
  summary,
  body,
  chips,
  cards,
  initialQuery = "",
  initialChip = "all",
  activeChip,
  crumbs,
  bannerImageUrl,
  clientLogos = [],
  faqs = [],
  contentBeforeCards = false,
}: {
  title: string;
  subtitle?: string;
  summary?: string;
  body?: string;
  chips: CatalogueChip[];
  cards: CatalogueCard[];
  initialQuery?: string;
  initialChip?: string;
  activeChip?: string;
  crumbs?: { href?: string; label: string }[];
  bannerImageUrl?: string;
  clientLogos?: { name: string; logo: string }[];
  faqs?: { question: string; answer: string }[];
  contentBeforeCards?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [chip, setChip] = useState(initialChip);
  const linked = chips.some((item) => item.href);
  const selected = linked ? (activeChip ?? "all") : chip;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((card) => {
      const matchesQuery =
        !q ||
        `${card.title} ${card.summary}`.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (q) return true;
      if (linked) return true;
      if (selected === "all") return card.scope === "group";
      return card.scope === "item" && card.chip === selected;
    });
  }, [cards, linked, query, selected]);

  const shown =
    !linked && selected !== "all" && !query.trim() && visible.length === 0
      ? cards.filter((card) => card.scope === "group" && card.chip === selected)
      : visible;

  const summaryCopy = cleanPublicExcerpt(summary ?? "", 420);
  const bodyMarkup = body?.trim() ?? "";
  const hasBottomContent = Boolean(bodyMarkup || summaryCopy);
  const contentSection = hasBottomContent ? (
    <section className="catalogue-bottom-content" aria-labelledby="cat-desc-title">
      <div className="catalogue-bottom-content__card">
        <div className="catalogue-bottom-content__header">
          <p className="eyebrow dark">Category Overview</p>
          <h2 id="cat-desc-title">About {cleanPublicTitle(title)}</h2>
        </div>
        {!bodyMarkup && summaryCopy ? (
          <div className="catalogue-bottom-content__summary">
            <p>{summaryCopy}</p>
          </div>
        ) : null}
        {bodyMarkup ? <RichTextHtml html={bodyMarkup} className="catalogue-bottom-content__body rich-text" /> : null}
      </div>
    </section>
  ) : null;

  return (
    <div className="catalogue-browser-root">
      {/* 1. Full-width top banner strip (Image 3 design) */}
      <section
        className="site-page-banner catalogue-page-banner"
        aria-label="Page Header"
        style={
          bannerImageUrl
            ? ({ "--catalogue-banner-image": `url("${bannerImageUrl}")` } as CSSProperties)
            : undefined
        }
      >
        <div className="site-container page-banner-inner">
          {crumbs?.length ? (
            <div className="catalogue-banner-crumbs">
              <Breadcrumbs items={crumbs} />
            </div>
          ) : null}
          <h1 className="catalogue-banner-title">{cleanPublicTitle(title)}</h1>
          <p className="catalogue-banner-subtitle">
            {subtitle || "ISO-9001:2015 Certified Company"}
          </p>
        </div>
      </section>

      {/* 2. Main product listing & filtering section */}
      <main className="catalogue-page">
        <div className="site-container catalogue-page__inner">
          {contentBeforeCards ? contentSection : null}
          <div className="catalogue-controls">
            {chips.length ? (
              <div className="catalogue-chips" role="tablist" aria-label="Product groups">
                {chips.map((item) =>
                  item.href ? (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={item.id === selected ? "is-active" : ""}
                      aria-current={item.id === selected ? "page" : undefined}
                    >
                      {cleanPublicTitle(item.label)}
                    </Link>
                  ) : (
                    <button
                      key={item.id}
                      type="button"
                      className={item.id === selected ? "is-active" : ""}
                      aria-pressed={item.id === selected}
                      onClick={() => setChip(item.id)}
                    >
                      {cleanPublicTitle(item.label)}
                    </button>
                  ),
                )}
              </div>
            ) : null}
            <form
              className="catalogue-search"
              action="/products/"
              onSubmit={(event) => {
                if (!linked) event.preventDefault();
              }}
            >
              <span aria-hidden>⌕</span>
              <input
                name="q"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
              />
            </form>
          </div>

          {shown.length ? (
            <ul className="catalogue-grid">
              {shown.map((card) => {
                const excerpt = cleanPublicExcerpt(card.summary, 180);
                return (
                  <li key={`${card.scope}-${card.id}`}>
                    <article className="catalogue-card">
                      <Link href={publicPath(card.path)} className="catalogue-card__media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={card.imageUrl || "/placeholders/product.svg"}
                          alt={card.imageUrl ? card.imageAlt : card.title}
                          loading="lazy"
                          decoding="async"
                        />
                      </Link>
                      <div className="catalogue-card__body">
                        <h2>
                          <Link href={publicPath(card.path)}>{cleanPublicTitle(card.title)}</Link>
                        </h2>
                        {excerpt ? <p>{excerpt}</p> : null}
                        <Link href={publicPath(card.path)} className="catalogue-card__cta">
                          {card.cta} <span aria-hidden>→</span>
                        </Link>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="catalogue-empty">
              <h2>No matching products</h2>
              <p>Try another search, or publish products from the admin catalogue.</p>
            </div>
          )}

          {/* 3. Bottom content description card (moved below products as requested) */}
          {!contentBeforeCards ? contentSection : null}
        </div>
      </main>
      {clientLogos.length ? (
        <section className="clients-rail category-clients" aria-labelledby="category-clients-title">
          <div className="site-container clients-rail__heading">
            <p className="eyebrow dark">Trusted across industries</p>
            <h2 id="category-clients-title">Our Clients</h2>
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
      ) : null}
      {faqs.length ? (
        <section className="category-faq-section" aria-labelledby="category-faq-title">
          <div className="site-container">
            <div className="category-faq-heading">
              <p className="eyebrow dark">Helpful answers</p>
              <h2 id="category-faq-title">Frequently Asked Questions</h2>
            </div>
            <AboutFaq
              items={faqs.map((item) => ({
                title: item.question,
                body: item.answer,
              }))}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

