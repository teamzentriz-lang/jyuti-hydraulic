import { eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { navLinks } from "@/db/schema";
import { buildCatalogNavItems } from "@/lib/cms/product-nav";
import type { NavItem } from "@/lib/cms/site";
import { normalizePath, publicPath, siteOrigin } from "@/lib/paths";
import type { WpMenuNode } from "@/lib/import/wordpress-client";
import { wpOrigin } from "@/lib/import/wordpress-client";

export function wpUrlToHref(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "/";
  if (/^https?:\/\//i.test(trimmed)) {
    const origin = wpOrigin();
    if (trimmed.startsWith(origin)) {
      return publicPath(normalizePath(new URL(trimmed).pathname));
    }
    return trimmed;
  }
  return publicPath(trimmed);
}

export function menuLocationToNavLocation(slug: string, locations: string[]): "header" | "footer" | "products" {
  const hay = `${slug} ${locations.join(" ")}`.toLowerCase();
  if (hay.includes("footer")) return "footer";
  if (hay.includes("product")) return "products";
  return "header";
}

export function flattenMenuTree(items: WpMenuNode[]): WpMenuNode[] {
  const flat: WpMenuNode[] = [];
  function walk(nodes: WpMenuNode[]) {
    for (const node of nodes) {
      flat.push(node);
      if (node.children?.length) walk(node.children);
    }
  }
  walk(items);
  return flat;
}

export type FallbackNavLink = {
  label: string;
  href: string;
  itemType?: string;
  referenceId?: string;
  children?: FallbackNavLink[];
};

export async function buildFallbackHeaderNav(db: ReturnType<typeof getDb>) {
  function mapNavToFallback(item: NavItem): FallbackNavLink {
    return {
      label: item.label,
      href: item.href,
      children: item.children.length ? item.children.map(mapNavToFallback) : undefined,
    };
  }

  const catalogChildren: FallbackNavLink[] = (await buildCatalogNavItems(db)).map(mapNavToFallback);

  const topLinks = [
    { label: "Home", href: "/" },
    { label: "About us", href: publicPath("about-us") },
    { label: "Blogs", href: publicPath("blogs") },
    { label: "Gallery", href: publicPath("gallery") },
    { label: "Certificates", href: publicPath("certificates") },
    { label: "Catalogue", href: publicPath("catalogue") },
    { label: "Contact", href: publicPath("contact") },
  ];

  const firstProductHref = catalogChildren[0]?.href ?? publicPath("hydraulic-power-pack");

  return {
    header: [
      topLinks[0],
      topLinks[1],
      {
        label: "Products",
        href: firstProductHref,
        children: catalogChildren,
      },
      ...topLinks.slice(2),
    ],
    footer: [
      { label: "Home", href: "/" },
      { label: "About Us", href: publicPath("about-us") },
      { label: "Products", href: firstProductHref },
      { label: "Blogs", href: publicPath("blogs") },
      { label: "Contact Us", href: publicPath("contact") },
      ...catalogChildren.slice(0, 4).map((cat) => ({
        label: cat.label,
        href: cat.href,
      })),
    ],
  };
}

export function pickWordPressMenusForImport(
  menus: { slug: string; name: string; locations: string[]; items: WpMenuNode[] }[],
) {
  const headerCandidates = menus.filter((menu) => menuLocationToNavLocation(menu.slug, menu.locations) === "header");
  const footerCandidates = menus.filter((menu) => menuLocationToNavLocation(menu.slug, menu.locations) === "footer");

  const pickOne = (list: typeof menus) => {
    if (!list.length) return null;
    const scored = list.map((menu) => {
      const hay = `${menu.slug} ${menu.name} ${menu.locations.join(" ")}`.toLowerCase();
      let score = 0;
      if (hay.includes("primary")) score += 10;
      if (hay.includes("main")) score += 8;
      if (hay.includes("header")) score += 6;
      if (hay.includes("top")) score += 4;
      score += Math.min(menu.items.length, 50);
      return { menu, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.menu ?? list[0];
  };

  const picked: typeof menus = [];
  const header = pickOne(headerCandidates);
  const footer = pickOne(footerCandidates);
  if (header) picked.push(header);
  if (footer && footer !== header) picked.push(footer);
  if (!picked.length && menus.length) picked.push(menus[0]!);
  return picked;
}

export function wordPressMenuRoots(items: WpMenuNode[]): WpMenuNode[] {
  if (items.some((item) => item.parent > 0)) {
    return items.filter((item) => !item.parent || item.parent === 0);
  }
  return items;
}

export async function purgeImportedNavLocations(db: ReturnType<typeof getDb>, locations: ("header" | "footer")[]) {
  for (const location of locations) {
    await db.delete(navLinks).where(eq(navLinks.location, location));
  }
}

export function absolutePublicUrl(path: string) {
  return `${siteOrigin()}${publicPath(path)}`;
}
