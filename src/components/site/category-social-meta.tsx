"use client";

import { useEffect } from "react";

/** Keep the server-rendered OG type in sync during client-side navigation. */
export function CategorySocialMeta({ type }: { type?: string }) {
  useEffect(() => {
    if (!type) return;
    const tag = document.head.querySelector<HTMLMetaElement>("meta[data-category-og-type]") ?? document.createElement("meta");
    tag.dataset.categoryOgType = "";
    tag.setAttribute("property", "og:type");
    tag.content = type;
    if (!tag.isConnected) document.head.append(tag);
    return () => tag.remove();
  }, [type]);
  return null;
}
