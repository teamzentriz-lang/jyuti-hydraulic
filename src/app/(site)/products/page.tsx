import type { Metadata } from "next";
import { CatalogueBrowser } from "@/components/site/catalogue-browser";
import {
  catalogueListing,
  getSettings,
  getSiteLabels,
} from "@/lib/cms/queries";
import { publicPath } from "@/lib/paths";
import { sitePageMetadata } from "@/lib/site-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, labels] = await Promise.all([
    getSettings(),
    getSiteLabels(),
  ]);
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
  const [query, listing, labels] = await Promise.all([
    searchParams,
    catalogueListing(),
    getSiteLabels(),
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
  );
}
