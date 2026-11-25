import { cache } from "react";
import { CategorySocialMeta } from "@/components/site/category-social-meta";
import { contentMetadata } from "@/components/site/content-view";
import { resolvePublishedContentByPath } from "@/lib/cms/published-content";
import type { Metadata } from "next";
import { CatalogueBrowser } from "@/components/site/catalogue-browser";
import {
  catalogueListing,
  getSettings,
  getSiteLabels,
} from "@/lib/cms/queries";
import { publicPath } from "@/lib/paths";
import { sitePageMetadata } from "@/lib/site-metadata";

const productsCategory = cache(() => resolvePublishedContentByPath("products"));

export async function generateMetadata(): Promise<Metadata> {
  const [settings, labels, category] = await Promise.all([
    getSettings(),
    getSiteLabels(), productsCategory(),
  ]);
  if (category?.kind === "category") return contentMetadata(category, settings.companyName);
  return sitePageMetadata({
    companyName: settings.companyName,
    path: "products",
    title: labels.productsTitle,
    description: labels.productsDescription,
    keywords: [
      "hydraulic products",
      "hydraulic power packs",
      "hydraulic cylinders",
    ],
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string }>;
}) {
  const [query, listing, labels, category] = await Promise.all([
    searchParams,
    catalogueListing(),
    getSiteLabels(), productsCategory(),
  ]);
  const visibleGroups = listing.groups.filter(
    (group) => publicPath(group.path) !== "/products/",
  );
  const chips = [
    { id: "all", label: "All Products" },
    ...visibleGroups.map((group) => ({ id: group.id, label: group.title })),
  ];
  const cards = [
    ...visibleGroups.map((group) => ({
      ...group,
      cta: "View Products",
      chip: group.id,
      scope: "group" as const,
    })),
    ...listing.items
      .filter((item) => publicPath(item.path) !== "/products/")
      .map((item) => ({
        id: item.id,
        title: item.title,
        path: item.path,
        summary: item.summary,
        imageUrl: item.imageUrl,
        imageAlt: item.imageAlt,
        cta: item.kind === "category" ? "View Products" : "View product",
        chip: item.groupId,
        scope: "item" as const,
      })),
  ];

  return (
    <>
    {category?.kind === "category" && <CategorySocialMeta type={category.liveCategoryMeta?.["og:type"]} />}
    <CatalogueBrowser
      crumbs={[{ href: "/", label: "Home" }, { label: "Products" }]}
      title={labels.productsTitle}
      subtitle={labels.productsSubtitle}
      summary={labels.productsDescription}
      chips={chips}
      cards={cards}
      initialQuery={query.q ?? ""}
      initialChip={
        query.group && chips.some((chip) => chip.id === query.group)
          ? query.group
          : "all"
      }
    />
    </>
  );
}
