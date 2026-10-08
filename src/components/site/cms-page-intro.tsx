import { CmsImage } from "@/components/site/cms-image";
import { PageSectionsView } from "@/components/site/page-sections-view";
import { RichTextHtml } from "@/components/site/rich-text-html";
import type { PublishedContent } from "@/lib/cms/published-content";

export function CmsPageIntro({
  content,
  hideHeading = false,
}: {
  content: PublishedContent | null;
  hideHeading?: boolean;
}) {
  if (!content) return null;

  return (
    <div className="cms-page-intro mb-12">
      {content.hero ? (
        <CmsImage
          item={content.hero}
          alt={content.title}
          className="mb-8 w-full rounded-lg border border-line object-cover"
        />
      ) : null}
      {!hideHeading ? (
        <>
          <p className="page-kicker">Jyoti Hydraulic</p>
          <h1 className="text-4xl font-semibold tracking-tight text-navy">
            {content.title}
          </h1>
          {content.summary ? (
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">
              {content.summary}
            </p>
          ) : null}
        </>
      ) : null}
      {content.body.trim() ? (
        <RichTextHtml
          html={content.body}
          className="rich-text mt-8 max-w-3xl"
        />
      ) : null}
      {content.sections?.length ? (
        <PageSectionsView sections={content.sections} />
      ) : null}
    </div>
  );
}
