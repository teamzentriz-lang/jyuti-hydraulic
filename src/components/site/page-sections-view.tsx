import Link from "next/link";
import { CmsImage } from "@/components/site/cms-image";
import { RichTextHtml } from "@/components/site/rich-text-html";
import type { RenderedPageSection } from "@/lib/cms/published-content";
import { publicPath } from "@/lib/paths";

function sectionHref(raw: string) {
  const url = raw.trim();
  if (!url) return "#";
  if (
    /^https?:\/\//i.test(url) ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:")
  )
    return url;
  if (url.startsWith("/")) return publicPath(url);
  return publicPath(url);
}

function SectionButtons({ section }: { section: RenderedPageSection }) {
  const primary = section.buttonText.trim();
  const secondary = section.secondaryButtonText.trim();
  if (!primary && !secondary) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {primary ? (
        <Link
          href={sectionHref(section.buttonUrl)}
          className="site-btn-primary"
        >
          {primary}
        </Link>
      ) : null}
      {secondary ? (
        <Link
          href={sectionHref(section.secondaryButtonUrl)}
          className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-navy hover:bg-paper"
        >
          {secondary}
        </Link>
      ) : null}
    </div>
  );
}

export function PageSectionsView({
  sections,
}: {
  sections: RenderedPageSection[];
}) {
  if (!sections.length) return null;

  return (
    <div className="page-sections mt-12 space-y-12">
      {sections.map((section, index) => (
        <section
          key={section.id ?? `${section.sectionType}-${index}`}
          className={`page-section-card page-section-card--${index % 2 ? "reverse" : "standard"} rounded-lg border border-line bg-white p-6 md:p-8`}
        >
          {section.eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {section.eyebrow}
            </p>
          ) : null}
          {section.title ? (
            <h2 className="mt-2 text-2xl font-semibold text-navy">
              {section.title}
            </h2>
          ) : null}
          {section.subtitle ? (
            <p className="mt-2 text-lg text-muted">{section.subtitle}</p>
          ) : null}
          {section.image && section.description.trim() ? (
            <div className="media-split mt-6">
              <RichTextHtml html={section.description} className="product-prose" />
              <CmsImage
                item={section.image}
                alt={section.title || "Section image"}
                className="media-split__photo"
              />
            </div>
          ) : (
            <>
              {section.image ? (
                <CmsImage
                  item={section.image}
                  alt={section.title || "Section image"}
                  className="mt-6 w-full rounded-lg border border-line object-cover"
                />
              ) : null}
              {section.description.trim() ? (
                <RichTextHtml html={section.description} className="rich-text mt-6 max-w-3xl" />
              ) : null}
            </>
          )}
          <SectionButtons section={section} />
        </section>
      ))}
    </div>
  );
}
