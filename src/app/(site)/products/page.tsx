import type { Metadata } from "next";
import { CatalogueBrowser } from "@/components/site/catalogue-browser";
import { catalogueListing, getSettings } from "@/lib/cms/queries";
import { publicPath, siteOrigin } from "@/lib/paths";
import { noIndexRobots } from "@/lib/seo-robots";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: `Our Products | ${settings.companyName}`,
    description:
      "Discover hydraulic power packs, cylinders, screw jacks, pumps and rotary joints engineered for industrial use.",
    alternates: { canonical: `${siteOrigin()}/products/` },
    robots: noIndexRobots,
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string }>;
}) {
  const [query, listing] = await Promise.all([searchParams, catalogueListing()]);
  const visibleGroups = listing.groups.filter((group) => publicPath(group.path) !== "/products/");
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
    ...listing.items.filter((item) => publicPath(item.path) !== "/products/").map((item) => ({
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
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Products" },
      ]}
      title="Our Products"
      subtitle="ISO-9001:2015 Certified Company"
      summary="Discover our complete range of hydraulic products designed for various industrial applications."
      chips={chips}
      cards={cards}
      initialQuery={query.q ?? ""}
      initialChip={query.group && chips.some((chip) => chip.id === query.group) ? query.group : "all"}
    />
  );
}
