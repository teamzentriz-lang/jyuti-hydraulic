"use client";

import { useState } from "react";

export type ProductGalleryImage = {
  id: string;
  src: string;
  alt: string;
};

export function ProductGallery({ images }: { images: ProductGalleryImage[] }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];
  if (!current) return null;

  return (
    <div
      className={`product-gallery ${images.length === 1 ? "product-gallery--single" : ""}`}
    >
      {images.length > 1 ? (
        <div className="product-gallery__thumbs" aria-label="Product images">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className={index === active ? "is-active" : ""}
              aria-label={`View image ${index + 1}`}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt="" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="product-gallery__stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.src} alt={current.alt} />
      </div>
    </div>
  );
}
