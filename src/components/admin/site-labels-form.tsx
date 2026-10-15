"use client";
import { useActionState } from "react";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/components/admin/styles";
import { saveSiteLabelsAction } from "@/lib/cms/actions";
import type { SiteLabels } from "@/lib/site-labels";
const groups = [
  [
    "Blog & Home",
    [
      "blogEyebrow",
      "blogTitle",
      "blogSearchPlaceholder",
      "blogLatestEyebrow",
      "blogLatestTitle",
      "blogLatestDescription",
    ],
  ],
  [
    "Products & Catalogue",
    [
      "productsTitle",
      "productsSubtitle",
      "productsDescription",
      "catalogueEyebrow",
      "catalogueTitle",
      "catalogueDescription",
      "catalogueSectionEyebrow",
      "catalogueSectionTitle",
      "catalogueSectionDescription",
    ],
  ],
  [
    "Contact & Footer",
    [
      "contactEyebrow",
      "mapEyebrow",
      "mapTitle",
      "footerLinksTitle",
      "footerContactTitle",
      "footerNewsletterTitle",
    ],
  ],
  [
    "Product detail & 404",
    [
      "productOverviewEyebrow",
      "productRelatedTitle",
      "productComingSoonTitle",
      "productComingSoonDescription",
      "productVideoLabel",
      "productReviewsLabel",
      "notFoundTitle",
      "notFoundDescription",
      "notFoundHomeLabel",
      "notFoundProductsLabel",
      "notFoundContactLabel",
    ],
  ],
] as const;
const label = (key: string) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
export function SiteLabelsForm({ labels }: { labels: SiteLabels }) {
  const [state, action, pending] = useActionState(saveSiteLabelsAction, null);
  return (
    <form action={action} className="space-y-6">
      {state?.error ? <p className="text-red-700">{state.error}</p> : null}
      {groups.map(([title, keys]) => (
        <section
          key={title}
          className="grid gap-4 rounded-lg border border-line bg-white p-4 md:grid-cols-2"
        >
          <h2 className="md:col-span-2 text-lg font-semibold text-navy">
            {title}
          </h2>
          {keys.map((key) => (
            <label
              key={key}
              className={key.includes("Description") ? "md:col-span-2" : ""}
            >
              <span className={labelClass}>{label(key)}</span>
              {key.includes("Description") ? (
                <textarea
                  name={key}
                  rows={3}
                  className={inputClass}
                  defaultValue={labels[key]}
                />
              ) : (
                <input
                  name={key}
                  className={inputClass}
                  defaultValue={labels[key]}
                />
              )}
            </label>
          ))}
        </section>
      ))}
      <button className={primaryButtonClass} disabled={pending}>
        {pending ? "Saving…" : "Save site labels"}
      </button>
    </form>
  );
}
