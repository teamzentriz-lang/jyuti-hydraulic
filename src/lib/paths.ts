const RESERVED_ROOTS = new Set(["admin", "api", "media", "_next"]);

export function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizePath(input: string) {
  const withoutOrigin = input.trim().replace(/^https?:\/\/[^/]+/i, "");
  return withoutOrigin
    .split("/")
    .map((part) => normalizeSlug(part))
    .filter(Boolean)
    .join("/");
}

export function publicPath(path: string) {
  const clean = normalizePath(path);
  return clean ? `/${clean}/` : "/";
}

export function normalizeRedirectPath(input: string) {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return publicPath(trimmed);
}

export type RouteKind = "page" | "post" | "category" | "product" | "location" | "export";

export function assertPathAllowed(path: string, kind: RouteKind) {
  if (!path) throw new Error("A URL path is required.");
  const first = path.split("/")[0] ?? "";
  if (!first || RESERVED_ROOTS.has(first) || first.startsWith("_")) {
    throw new Error(`/${path}/ is reserved by the application.`);
  }
  if (kind === "post" && path.includes("/")) {
    throw new Error("Blog posts use a single slug at the site root, for example /working-principle-of-a-screw-jack/.");
  }
  if (kind === "location" && !/^city\/[a-z0-9-]+$/.test(path)) {
    throw new Error("Location pages live at /city/{slug}/.");
  }
  if (kind === "export" && !/^exports\/[a-z0-9-]+$/.test(path)) {
    throw new Error("Export pages live at /exports/{slug}/.");
  }
  if ((kind === "page" || kind === "post") && /^(city|exports|products)\//.test(path)) {
    throw new Error("That path belongs to the catalogue, city, or export section.");
  }
}

export function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://jyotihydraulic.com").replace(/\/$/, "");
}
