import { CatalogueBrowser } from "@/components/site/catalogue-browser";
import type { PublishedContent } from "@/lib/cms/published-content";
import { mediaDeliveryUrl } from "@/lib/media-url";
import { publicPath } from "@/lib/paths";
import { getHome } from "@/lib/cms/queries";
import { defaultClients } from "@/lib/brand";

export async function CategoryListing({ content }: { content: PublishedContent }) {
  const home = await getHome();
  const clientLogos =
    home.clientLogos && home.clientLogos.length > 0
      ? home.clientLogos
      : defaultClients;
  const childCards =
    content.childCategories?.map((item) => ({
      id: item.id,
      title: item.title,
      path: item.path,
      summary: item.summary,
      imageUrl: item.image
        ? mediaDeliveryUrl(item.image)
        : (item.fallbackImageUrl ?? null),
      imageAlt: item.image?.alt || item.fallbackImageAlt || item.title,
      cta: "View Products",
      chip: "all",
      scope: "group" as const,
    })) ?? [];
  const productCards =
    content.categoryProducts?.map((item) => ({
      id: item.id,
      title: item.title,
      path: item.path,
      summary: item.summary,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt,
      cta: "View product",
      chip: "all",
      scope: "item" as const,
    })) ?? [];
  const cards = [...childCards, ...productCards];
  const chips = [
    { id: "all", label: "All Products", href: "/products/" },
    ...(content.filterCategories ?? [])
      .filter((item) => publicPath(item.path) !== "/products/")
      .map((item) => ({
      id: item.path,
      label: item.title,
      href: publicPath(item.path),
    })),
  ];

  return (
    <CatalogueBrowser
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/products/", label: "Products" },
        { label: content.title },
      ]}
      title={content.title}
      subtitle={content.subtitle || "ISO-9001:2015 Certified Company"}
      summary={content.summary ?? ""}
      body={content.body ?? ""}
      bannerImageUrl={content.image ? mediaDeliveryUrl(content.image) : undefined}
      chips={chips}
      cards={cards}
      activeChip={content.path}
      clientLogos={clientLogos}
      faqs={content.faqs ?? []}
    />
  );
}
