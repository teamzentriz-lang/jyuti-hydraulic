"use client";

import { useEffect, useRef } from "react";

export function RichTextHtml({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const images = [...root.querySelectorAll<HTMLImageElement>("img")];
    const fallback = (image: HTMLImageElement) => {
      if (image.dataset.fallbackApplied) return;
      image.dataset.fallbackApplied = "true";
      image.src = "/placeholders/product.svg";
      image.alt = image.alt || "Jyoti Hydraulic";
    };
    const handlers = new Map(
      images.map((image) => {
        const handler = () => fallback(image);
        image.addEventListener("error", handler, { once: true });
        return [image, handler] as const;
      }),
    );
    return () => handlers.forEach((handler, image) => image.removeEventListener("error", handler));
  }, [html]);

  if (!html.trim()) return null;
  return (
    <div
      ref={ref}
      className={className ?? "rich-text text-muted"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
