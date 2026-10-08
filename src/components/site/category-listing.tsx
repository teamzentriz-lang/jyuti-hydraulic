import { CatalogueBrowser } from "@/components/site/catalogue-browser";
import { RichTextHtml } from "@/components/site/rich-text-html";
import { cleanPublicExcerpt } from "@/lib/cms/clean-copy";
import type { PublishedContent } from "@/lib/cms/published-content";
import { mediaDeliveryUrl } from "@/lib/media-url";
import { publicPath } from "@/lib/paths";

export function CategoryListing({ content }: { content: PublishedContent }) {
  const childCards =
    content.childCategories?.map((item) => ({
      id: item.id,
      title: item.title,
      path: item.path,
      summary: item.summary,
      imageUrl: item.image ? mediaDeliveryUrl(item.image) : null,
      imageAlt: item.image?.alt || item.title,
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

  if (!cards.length) {
    return (
      <main className="content-page">
        <div className="site-page-banner">
          <div className="site-container page-banner-inner">
            <p className="page-kicker">Products</p>
            <h1>{content.title}</h1>
            {content.summary ? <p>{cleanPublicExcerpt(content.summary, 320)}</p> : null}
          </div>
        </div>
        {content.body.trim() ? (
          <div className="site-container content-canvas">
            <RichTextHtml html={content.body} className="rich-text" />
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <>
      <CatalogueBrowser
        eyebrow="Products"
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/products/", label: "Products" },
          { label: content.title },
        ]}
        title={content.title}
        summary={
          cleanPublicExcerpt(content.summary ?? "", 320) ||
          "Explore this range of hydraulic products engineered for industrial use."
        }
        chips={chips}
        cards={cards}
        activeChip={content.path}
      />
    </>
  );
}
