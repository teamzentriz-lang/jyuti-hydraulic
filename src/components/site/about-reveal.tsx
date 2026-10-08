"use client";

import { useEffect } from "react";

const motionSelector = [
  ".about-in",
  ".about-rule",
  ".about-photo",
  ".about-check",
  ".about-tile",
  ".about-offer",
  ".about-slide",
  ".about-statement",
  ".about-faq details",
  ".gallery-item",
  ".cert-item",
  ".catalogue-book",
  ".doc-item",
  ".contact-row",
].join(",");

function showWhenReady(element: HTMLElement) {
  const image = element instanceof HTMLImageElement ? element : element.querySelector("img");
  const show = () => element.classList.add("is-shown");
  if (image && !image.complete) {
    image.addEventListener("load", show, { once: true });
    image.addEventListener("error", show, { once: true });
    if (image.complete) show();
    return;
  }
  show();
}

export function AboutReveal() {
  useEffect(() => {
    const root = document.querySelector(".motion-page");
    if (!root) return;
    const nodes = [...root.querySelectorAll<HTMLElement>(motionSelector)];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((node) => node.classList.add("is-shown"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          showWhenReady(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.16 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return null;
}
