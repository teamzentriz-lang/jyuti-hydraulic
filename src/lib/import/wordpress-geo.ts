import { normalizeSlug } from "@/lib/paths";
import type { WpPageItem } from "@/lib/import/wordpress-client";
import { pagePathFromLink, slugFromPath } from "@/lib/import/wordpress-catalog";

export type GeoPage = WpPageItem & { path: string };

export function filterCityPages(allPages: WpPageItem[]): GeoPage[] {
  return allPages
    .map((page) => ({ ...page, path: pagePathFromLink(page.link) }))
    .filter((page) => /^city\/[a-z0-9-]+$/.test(page.path))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function filterExportPages(allPages: WpPageItem[]): GeoPage[] {
  return allPages
    .map((page) => ({ ...page, path: pagePathFromLink(page.link) }))
    .filter((page) => /^exports\/[a-z0-9-]+$/.test(page.path))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function humanizeSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Location from slug suffix `-in-{place}` or title “… in {place}”. */
export function parseLocationName(title: string, slug: string) {
  const fromTitle = title.match(/\bin\s+(.+?)\s*$/i)?.[1]?.trim();
  if (fromTitle) return fromTitle.slice(0, 200);

  const fromSlug = slug.match(/-in-([a-z0-9-]+)$/i)?.[1];
  if (fromSlug) return humanizeSlug(fromSlug).slice(0, 200);

  return humanizeSlug(slugFromPath(slug)).slice(0, 200) || title.slice(0, 200);
}

export function parseRegion(locationName: string) {
  return locationName.slice(0, 200);
}

export function parseExportCountry(title: string, slug: string) {
  const fromTitle = title.match(/\bin\s+(.+?)\s*$/i)?.[1]?.trim();
  if (fromTitle) return fromTitle.slice(0, 120);
  return humanizeSlug(slugFromPath(slug)).slice(0, 120) || slug.slice(0, 120);
}

export function parseExportProductLine(title: string, slug: string) {
  const trimmed = title.replace(/\s+in\s+.+$/i, "").trim();
  const line = trimmed
    .replace(/\s+(manufacturer|manufacturers|supplier|suppliers)\b.*$/i, "")
    .trim();
  if (line) return line.slice(0, 200);

  const fromSlug = slug.replace(/-in-[a-z0-9-]+$/i, "").replace(/^exports-/, "");
  return humanizeSlug(fromSlug).slice(0, 200) || title.slice(0, 200);
}

export function citySlugFromPath(path: string) {
  return path.split("/")[1] ?? normalizeSlug(path);
}

export function exportSlugFromPath(path: string) {
  return path.split("/")[1] ?? normalizeSlug(path);
}

export type CatalogMatch = { id: string; path: string; slug: string };

export function productHintFromGeoSlug(slug: string) {
  return slug.replace(/-in-[a-z0-9-]+$/i, "").replace(/-manufacturers-in-[a-z0-9-]+$/i, "");
}

export function matchCatalogId(hint: string, rows: CatalogMatch[]) {
  const normalizedHint = normalizeSlug(hint);
  if (!normalizedHint) return null;

  for (const row of rows) {
    const pathSlug = row.path.split("/").pop() ?? "";
    if (normalizeSlug(pathSlug) === normalizedHint) return row.id;
    if (normalizeSlug(row.slug) === normalizedHint) return row.id;
    if (normalizedHint.includes(normalizeSlug(pathSlug)) && pathSlug.length > 3) return row.id;
  }

  for (const row of rows) {
    const pathSlug = normalizeSlug(row.path.split("/").pop() ?? "");
    if (pathSlug && normalizedHint.includes(pathSlug)) return row.id;
  }

  return null;
}
