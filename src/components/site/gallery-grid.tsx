"use client";

import { useEffect, useState } from "react";

export type GalleryCard = {
  id: string;
  title: string;
  caption: string | null;
  src: string | null;
  kind: "image" | "video" | "empty";
};

function labelFor(item: GalleryCard) {
  if (!item.title || /^gallery$/i.test(item.title)) return "Manufacturing";
  return item.title;
}

export function GalleryGrid({ items }: { items: GalleryCard[] }) {
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
      <ul className="gallery-mosaic">
        {items.map((item, index) => (
          <li
            key={item.id}
            className={`gallery-item gallery-item--${index % 7}`}
            style={{ animationDelay: `${(index % 8) * 70}ms` }}
          >
            <button
              type="button"
              className="gallery-item__open"
              onClick={() => item.src && setOpen(index)}
            >
              <span className="gallery-item__media">
                {item.src && item.kind === "video" ? (
                  <video src={item.src} muted playsInline preload="metadata" />
                ) : item.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.src} alt={labelFor(item)} />
                ) : (
                  <span className="media-placeholder">
                    <span>Image</span>
                    <small>Add media from CMS</small>
                  </span>
                )}
                <span className="gallery-item__number">{String(index + 1).padStart(2, "0")}</span>
              </span>
              <span className="gallery-item__caption">
                <h3>{labelFor(item)}</h3>
                {item.caption && item.caption !== item.title ? <p>{item.caption}</p> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {current?.src ? (
        <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={labelFor(current)}>
          <button type="button" className="gallery-lightbox__backdrop" aria-label="Close gallery" onClick={() => setOpen(null)} />
          <figure className="gallery-lightbox__frame">
            {current.kind === "video" ? (
              <video src={current.src} controls autoPlay playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.src} alt={labelFor(current)} />
            )}
            <figcaption>
              <strong>{labelFor(current)}</strong>
              {current.caption && current.caption !== current.title ? <span>{current.caption}</span> : null}
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
                aria-label="Previous image"
                onClick={() => setOpen((index) => (index === null ? index : (index - 1 + items.length) % items.length))}
              >
                ‹
              </button>
              <button
                type="button"
                className="gallery-lightbox__nav gallery-lightbox__nav--next"
                aria-label="Next image"
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
