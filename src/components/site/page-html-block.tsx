"use client";

import { usePathname } from "next/navigation";

type Override = {
  path: string;
  headerHtml: string;
  footerHtml: string;
  isActive: boolean;
};

function normalize(path: string) {
  const cleaned = path.replace(/\/+$/, "");
  return cleaned || "/";
}

export function PageHtmlBlock({
  position,
  commonHtml,
  overrides,
}: {
  position: "header" | "footer";
  commonHtml: string;
  overrides: Override[];
}) {
  const pathname = normalize(usePathname());
  const page = overrides.find(
    (entry) => entry.isActive && normalize(entry.path) === pathname,
  );
  const pageHtml = position === "header" ? page?.headerHtml : page?.footerHtml;
  const html = [commonHtml, pageHtml]
    .filter((value): value is string => Boolean(value?.trim()))
    .join("\n");
  if (!html) return null;
  return (
    <section
      className={`site-html-block site-html-block--${position}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
