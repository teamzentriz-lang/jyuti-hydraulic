"use client";

import { useEffect, useState } from "react";

export type CertificateCard = {
  id: string;
  title: string;
  caption: string | null;
  src: string | null;
};

function labelFor(item: CertificateCard, index: number) {
  const generic = !item.title || /^(certificates?|quality certificate)$/i.test(item.title.trim());
  if (generic) return `Certificate ${String(index + 1).padStart(2, "0")}`;
  return item.title;
}

export function CertificateBoard({ items }: { items: CertificateCard[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const current = open === null ? null : items[open];

  useEffect(() => {
    if (open === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
      if (event.key === "ArrowRight") setOpen((index) => (index === null ? index : (index + 1) % items.length));
      if (event.key === "ArrowLeft") {
        setOpen((index) => (index === null ? index : (index - 1 + items.length) % items.length));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length, open]);

  return (
    <>
      <ul className="certificate-grid">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="credential-card cert-item"
            style={{ animationDelay: `${(index % 8) * 80}ms` }}
          >
            <button
              type="button"
              className="cert-item__open"
              onClick={() => item.src && setOpen(index)}
            >
              <span className="credential-card__frame">
                {item.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.src} alt={labelFor(item, index)} />
                ) : (
                  <span className="media-placeholder">
                    <span>Certificate</span>
                    <small>Add image from CMS</small>
                  </span>
                )}
                <span className="cert-item__index">{String(index + 1).padStart(2, "0")}</span>
              </span>
              <span className="credential-card__body">
                <span>Certified</span>
                <h3>{labelFor(item, index)}</h3>
                {item.caption && item.caption !== item.title ? <p>{item.caption}</p> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {current?.src ? (
        <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={labelFor(current, open ?? 0)}>
          <button type="button" className="gallery-lightbox__backdrop" aria-label="Close certificate" onClick={() => setOpen(null)} />
          <figure className="gallery-lightbox__frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.src} alt={labelFor(current, open ?? 0)} />
            <figcaption>
              <strong>{labelFor(current, open ?? 0)}</strong>
            </figcaption>
          </figure>
          <button type="button" className="gallery-lightbox__close" onClick={() => setOpen(null)} aria-label="Close">
            ×
          </button>
          {items.length > 1 ? (
            <>
              <button
                type="button"
                className="gallery-lightbox__nav gallery-lightbox__nav--prev"
                aria-label="Previous certificate"
                onClick={() => setOpen((index) => (index === null ? index : (index - 1 + items.length) % items.length))}
              >
                ‹
              </button>
              <button
                type="button"
                className="gallery-lightbox__nav gallery-lightbox__nav--next"
                aria-label="Next certificate"
                onClick={() => setOpen((index) => (index === null ? index : (index + 1) % items.length))}
              >
                ›
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
