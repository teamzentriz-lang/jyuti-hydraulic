import { normalizeSlug } from "@/lib/paths";
import type { WpPageItem } from "@/lib/import/wordpress-client";
import { filterCatalogCandidates, pagePathFromLink, slugFromPath } from "@/lib/import/wordpress-catalog";

export type StaticPage = WpPageItem & { path: string };

export function isCityPath(path: string) {
  return path === "city" || path.startsWith("city/");
}

export function isExportPath(path: string) {
  return path === "exports" || path.startsWith("exports/");
}

/** WordPress front page — home content stays in the Home singleton. */
export function isFrontPagePath(path: string, slug: string) {
  if (!path) return true;
  return path === "home" || slug === "home";
}

export function filterStaticPages(allPages: WpPageItem[]): StaticPage[] {
  const catalogIds = new Set(filterCatalogCandidates(allPages).map((page) => page.id));
  const staticPages: StaticPage[] = [];

  for (const page of allPages) {
    const path = pagePathFromLink(page.link);
    if (isFrontPagePath(path, page.slug)) continue;
    if (isCityPath(path)) continue;
    if (isExportPath(path)) continue;
    if (catalogIds.has(page.id)) continue;
    staticPages.push({ ...page, path });
  }

  return staticPages.sort((a, b) => a.path.localeCompare(b.path));
}

export function inferPageType(path: string) {
  const root = path.split("/")[0] ?? path;
  const byRoot: Record<string, string> = {
    "about-us": "about",
    contact: "contact",
    gallery: "gallery",
    certificates: "certificates",
    career: "custom",
    catalogue: "catalogue",
    "return-policy": "custom",
    "thank-you": "custom",
    blogs: "blog_listing",
  };
  return byRoot[root] ?? "custom";
}

export function pageSlugFromPath(path: string) {
  return slugFromPath(path);
}

export function postPathFromSlug(slug: string) {
  return normalizeSlug(slug);
}
