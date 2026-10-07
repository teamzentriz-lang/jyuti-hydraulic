"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cleanPublicExcerpt } from "@/lib/cms/clean-copy";
import { publicPath } from "@/lib/paths";

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

function HeadingSummary({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.trim().length > 160;
  return (
    <div className={open ? "catalogue-summary is-open" : "catalogue-summary"}>
      <p>{text}</p>
      {long ? (
        <button type="button" onClick={() => setOpen((value) => !value)}>
          {open ? "Read less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}

export function CatalogueBrowser({
  eyebrow = "Catalogue",
  title,
  summary,
  chips,
  cards,
  initialQuery = "",
  initialChip = "all",
  activeChip,
}: {
  eyebrow?: string;
  title: string;
  summary?: string;
  chips: CatalogueChip[];
  cards: CatalogueCard[];
  initialQuery?: string;
  initialChip?: string;
  activeChip?: string;
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

  return (
    <main className="catalogue-page">
      <div className="site-container catalogue-page__inner">
        <div className="catalogue-page__heading">
          <div>
            <p className="eyebrow dark">{eyebrow}</p>
            <h1>{title}</h1>
            {summary ? (
              <HeadingSummary text={cleanPublicExcerpt(summary, 320)} />
            ) : null}
          </div>
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
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === selected ? "is-active" : ""}
                  aria-pressed={item.id === selected}
                  onClick={() => setChip(item.id)}
                >
                  {item.label}
                </button>
              ),
            )}
          </div>
        ) : null}
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
                      alt={card.imageUrl ? card.imageAlt : ""}
                    />
                  </Link>
                  <div className="catalogue-card__body">
                    <h2>
                      <Link href={publicPath(card.path)}>{card.title}</Link>
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
      </div>
    </main>
  );
}
