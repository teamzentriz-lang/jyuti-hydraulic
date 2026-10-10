"use client";

import { useEffect, useState } from "react";

export type HomeBannerSlide = {
  src: string;
  alt: string;
};

export function HomeBanner({ slides }: { slides: HomeBannerSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (paused || count < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [paused, count]);

  if (!count) return null;

  const go = (next: number) => {
    setIndex((next + count) % count);
  };

  return (
    <section
      className="home-banner"
      aria-roledescription="carousel"
      aria-label="Jyoti Hydraulic banners"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className="home-banner__viewport">
        {slides.map((slide, slideIndex) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            className={slideIndex === index ? "is-active" : ""}
            aria-hidden={slideIndex === index ? undefined : true}
          />
        ))}
        {count > 1 ? (
          <>
            <button
              type="button"
              className="home-banner__nav home-banner__nav--prev"
              aria-label="Previous banner"
              onClick={() => go(index - 1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="home-banner__nav home-banner__nav--next"
              aria-label="Next banner"
              onClick={() => go(index + 1)}
            >
              ›
            </button>
            <div className="home-banner__dots" role="tablist" aria-label="Banner slides">
              {slides.map((slide, slideIndex) => (
                <button
                  key={slide.src}
                  type="button"
                  role="tab"
                  aria-label={`Banner ${slideIndex + 1}`}
                  aria-selected={slideIndex === index}
                  className={slideIndex === index ? "is-active" : ""}
                  onClick={() => go(slideIndex)}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
