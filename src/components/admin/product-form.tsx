"use client";

import { useActionState, useRef, useState } from "react";
import {
  ApplicationsEditor,
  DocumentsEditor,
  FeaturesEditor,
  FullSpecsEditor,
  OptionsEditor,
  PageSectionsEditor,
  RelatedProductsEditor,
  TechnicalTablesEditor,
} from "@/components/admin/advanced-editors";
import { MediaPicker } from "@/components/admin/media-picker";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { TabShell } from "@/components/admin/tab-shell";
import { helpClass, inputClass, labelClass, primaryButtonClass } from "@/components/admin/styles";
import { deleteResourceAction, saveResourceAction } from "@/lib/cms/actions";
import type { ProductPayload } from "@/lib/cms/entity-data";
import type { MediaItem } from "@/lib/cms/queries";
import { normalizeSlug, publicPath, siteOrigin } from "@/lib/paths";
import type { ProductSpecRow } from "@/db/schema";

function asText(value: unknown) {
  return value == null ? "" : String(value);
}

function normalizeSpecRows(rows: ProductSpecRow[]) {
  return rows.map((row) => ({
    label: asText(row.label),
    value: asText(row.value),
    unit: asText(row.unit),
    group: asText(row.group),
  }));
}

function specificationsForForm(initial: Record<string, unknown>, payload: ProductPayload) {
  if (payload.specifications.length) return normalizeSpecRows(payload.specifications);
  if (Array.isArray(initial.specs)) return normalizeSpecRows(initial.specs as ProductSpecRow[]);
  return [];
}

export function ProductForm({
  id,
  initial,
  payload,
  media,
  categoryOptions,
  productOptions,
  canDelete,
}: {
  id?: string;
  initial: Record<string, unknown>;
  payload: ProductPayload;
  media: MediaItem[];
  categoryOptions: { value: string; label: string }[];
  productOptions: { value: string; label: string }[];
  canDelete: boolean;
}) {
  const [state, action, pending] = useActionState(saveResourceAction, null);
  const slugEdited = useRef(Boolean(asText(initial.slug)));
  const pathEdited = useRef(Boolean(asText(initial.path)));
  const [title, setTitle] = useState(() => asText(initial.title));
  const [slug, setSlug] = useState(() => asText(initial.slug));
  const [path, setPath] = useState(() => asText(initial.path));
  const specificationRows = specificationsForForm(initial, payload);

  const preview = publicPath(path);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="resource" value="products" />
      <input type="hidden" name="id" value={id ?? ""} />
      {state?.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}
      {preview ? (
        <p className="rounded-md bg-paper px-3 py-2 text-sm text-navy">
          Public URL <span className="font-semibold">{siteOrigin()}{preview}</span>
        </p>
      ) : null}
      <TabShell
        tabs={[
          {
            id: "general",
            label: "General",
            content: (
              <section className="grid gap-4 rounded-lg border border-line bg-white p-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className={labelClass}>Name</span>
                  <input
                    className={inputClass}
                    name="title"
                    value={title ?? ""}
                    required
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!slugEdited.current) setSlug(normalizeSlug(e.target.value));
                      if (!pathEdited.current) setPath(`products/${normalizeSlug(e.target.value)}`);
                    }}
                  />
                </label>
                <label>
                  <span className={labelClass}>Slug</span>
                  <input
                    className={inputClass}
                    name="slug"
                    value={slug ?? ""}
                    required
                    onChange={(e) => {
                      slugEdited.current = true;
                      setSlug(e.target.value.toLowerCase());
                    }}
                  />
                </label>
                <label>
                  <span className={labelClass}>URL path</span>
                  <input
                    className={inputClass}
                    name="path"
                    value={path ?? ""}
                    required
                    onChange={(e) => {
                      pathEdited.current = true;
                      setPath(e.target.value);
                    }}
                  />
                </label>
                <label>
                  <span className={labelClass}>SKU</span>
                  <input className={inputClass} name="sku" defaultValue={asText(initial.sku)} />
                </label>
                <label>
                  <span className={labelClass}>Product code</span>
                  <input className={inputClass} name="productCode" defaultValue={asText(initial.productCode)} />
                </label>
                <label>
                  <span className={labelClass}>Category</span>
                  <select className={inputClass} name="categoryId" defaultValue={asText(initial.categoryId)}>
                    <option value="">None</option>
                    {categoryOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Sub-category</span>
                  <select className={inputClass} name="subCategoryId" defaultValue={asText(initial.subCategoryId)}>
                    <option value="">None</option>
                    {categoryOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Brand</span>
                  <input className={inputClass} name="brand" defaultValue={asText(initial.brand)} />
                </label>
                <label>
                  <span className={labelClass}>Model number</span>
                  <input className={inputClass} name="modelNumber" defaultValue={asText(initial.modelNumber)} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass}>Short description</span>
                  <textarea className={inputClass} name="summary" rows={3} defaultValue={asText(initial.summary)} />
                </label>
                <label>
                  <span className={labelClass}>Sort order</span>
                  <input className={inputClass} name="sortOrder" type="number" defaultValue={asText(initial.sortOrder ?? 0)} />
                </label>
                <label>
                  <span className={labelClass}>Status</span>
                  <select className={inputClass} name="status" defaultValue={asText(initial.status ?? "draft")}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <input name="isFeatured" type="checkbox" defaultChecked={Boolean(initial.isFeatured)} className="h-4 w-4 accent-navy" />
                  <span className="text-sm">Featured</span>
                </label>
                <label className="flex items-center gap-2">
                  <input name="isActive" type="checkbox" defaultChecked={initial.isActive !== false} className="h-4 w-4 accent-navy" />
                  <span className="text-sm">Active</span>
                </label>
                <label>
                  <span className={labelClass}>Price (optional)</span>
                  <input className={inputClass} name="price" defaultValue={asText(initial.price)} />
                </label>
                <label>
                  <span className={labelClass}>Stock (optional)</span>
                  <input className={inputClass} name="stock" defaultValue={asText(initial.stock)} />
                </label>
              </section>
            ),
          },
          {
            id: "description",
            label: "Description",
            content: (
              <section className="space-y-4 rounded-lg border border-line bg-white p-4">
                {[
                  ["overview", "Overview"],
                  ["body", "Main body"],
                  ["richContent", "Rich content"],
                  ["featuresText", "Features (text)"],
                  ["benefits", "Benefits"],
                  ["advantages", "Advantages"],
                  ["applicationsText", "Applications (text)"],
                  ["workingPrinciple", "Working principle"],
                  ["construction", "Construction"],
                  ["material", "Material"],
                  ["manufacturingDetails", "Manufacturing"],
                  ["qualityInformation", "Quality"],
                  ["maintenanceInformation", "Maintenance"],
                  ["safetyInformation", "Safety"],
                  ["customizationInformation", "Customization"],
                ].map(([name, label]) => (
                  <div key={name}>
                    <span className={labelClass}>{label}</span>
                    <RichTextEditor name={name} defaultValue={asText(initial[name])} />
                  </div>
                ))}
              </section>
            ),
          },
          {
            id: "images",
            label: "Images",
            content: (
              <section className="grid gap-4 rounded-lg border border-line bg-white p-4 md:grid-cols-2">
                {[
                  ["featuredImageId", "Featured image"],
                  ["thumbnailId", "Thumbnail"],
                  ["diagramImageId", "Diagram"],
                  ["technicalDrawingId", "Technical drawing"],
                  ["dimensionDrawingId", "Dimension drawing"],
                  ["installationImageId", "Installation"],
                  ["brochureMediaId", "Brochure PDF"],
                ].map(([name, label]) => (
                  <div key={name}>
                    <span className={labelClass}>{label}</span>
                    <MediaPicker name={name} initialIds={asText(initial[name]) ? [asText(initial[name])] : []} known={media} />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <span className={labelClass}>Gallery</span>
                  <MediaPicker name="galleryMediaIds" multiple initialIds={payload.galleryMediaIds ?? []} known={media} />
                  <span className={helpClass}>Drag order with Up/Down in the picker.</span>
                </div>
              </section>
            ),
          },
          {
            id: "features",
            label: "Features",
            content: (
              <section className="rounded-lg border border-line bg-white p-4">
                <FeaturesEditor name="_features" initial={payload.features} media={media} />
              </section>
            ),
          },
          {
            id: "applications",
            label: "Applications",
            content: (
              <section className="rounded-lg border border-line bg-white p-4">
                <ApplicationsEditor name="_applications" initial={payload.applications} media={media} />
              </section>
            ),
          },
          {
            id: "specifications",
            label: "Specifications",
            content: (
              <section className="rounded-lg border border-line bg-white p-4">
                <FullSpecsEditor name="_specs" initial={specificationRows} />
              </section>
            ),
          },
          {
            id: "tables",
            label: "Technical tables",
            content: (
              <section className="rounded-lg border border-line bg-white p-4">
                <TechnicalTablesEditor name="_technicalTables" initial={payload.technicalTables} />
              </section>
            ),
          },
          {
            id: "options",
            label: "Options",
            content: (
              <section className="rounded-lg border border-line bg-white p-4">
                <OptionsEditor name="_options" initial={payload.options} media={media} />
              </section>
            ),
          },
          {
            id: "documents",
            label: "Documents",
            content: (
              <section className="rounded-lg border border-line bg-white p-4">
                <DocumentsEditor name="_documents" initial={payload.documents} media={media} />
              </section>
            ),
          },
          {
            id: "related",
            label: "Related products",
            content: (
              <section className="rounded-lg border border-line bg-white p-4">
                <RelatedProductsEditor name="_related" initial={payload.relatedProducts} options={productOptions} />
              </section>
            ),
          },
          {
            id: "sections",
            label: "Page sections",
            content: (
              <section className="rounded-lg border border-line bg-white p-4">
                <PageSectionsEditor name="_sections" initial={payload.sections} media={media} />
              </section>
            ),
          },
          {
            id: "enquiry",
            label: "Enquiry",
            content: (
              <section className="grid gap-4 rounded-lg border border-line bg-white p-4 md:grid-cols-2">
                <label className="flex items-center gap-2 md:col-span-2">
                  <input name="enquiryEnabled" type="checkbox" defaultChecked={initial.enquiryEnabled !== false} className="h-4 w-4 accent-navy" />
                  <span className="text-sm">Enable product enquiry</span>
                </label>
                <label>
                  <span className={labelClass}>Button text</span>
                  <input className={inputClass} name="enquiryButtonText" defaultValue={asText(initial.enquiryButtonText)} />
                </label>
                <label>
                  <span className={labelClass}>Enquiry email</span>
                  <input className={inputClass} name="enquiryEmail" type="email" defaultValue={asText(initial.enquiryEmail)} />
                </label>
              </section>
            ),
          },
          {
            id: "seo",
            label: "SEO",
            content: (
              <section className="grid gap-4 rounded-lg border border-line bg-white p-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className={labelClass}>Meta title</span>
                  <input className={inputClass} name="seoTitle" defaultValue={asText(initial.seoTitle)} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass}>Meta description</span>
                  <textarea className={inputClass} name="seoDescription" rows={3} defaultValue={asText(initial.seoDescription)} />
                </label>
                <label>
                  <span className={labelClass}>Focus keyword</span>
                  <input className={inputClass} name="focusKeyword" defaultValue={asText(initial.focusKeyword)} />
                </label>
                <label>
                  <span className={labelClass}>Canonical URL</span>
                  <input className={inputClass} name="canonicalUrl" defaultValue={asText(initial.canonicalUrl)} />
                </label>
                <label className="flex items-center gap-2">
                  <input name="robotsIndex" type="checkbox" defaultChecked={initial.robotsIndex !== false} className="h-4 w-4 accent-navy" />
                  <span className="text-sm">Allow indexing</span>
                </label>
                <label className="flex items-center gap-2">
                  <input name="robotsFollow" type="checkbox" defaultChecked={initial.robotsFollow !== false} className="h-4 w-4 accent-navy" />
                  <span className="text-sm">Allow following links</span>
                </label>
                <div className="md:col-span-2">
                  <p className="mb-2 text-sm font-semibold text-navy">
                    Open Graph (Facebook, WhatsApp, LinkedIn)
                  </p>
                </div>
                <label className="md:col-span-2">
                  <span className={labelClass}>Open Graph title</span>
                  <input className={inputClass} name="ogTitle" defaultValue={asText(initial.ogTitle)} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass}>Open Graph description</span>
                  <textarea className={inputClass} name="ogDescription" rows={3} defaultValue={asText(initial.ogDescription)} />
                </label>
                <div className="md:col-span-2">
                  <span className={labelClass}>Open Graph image</span>
                  <MediaPicker name="ogImageId" initialIds={asText(initial.ogImageId) ? [asText(initial.ogImageId)] : []} known={media} />
                </div>
              </section>
            ),
          },
        ]}
      />
      <div className="flex flex-wrap items-center gap-4">
        <button className={primaryButtonClass} type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save product"}
        </button>
        {id && canDelete ? (
          <button
            type="submit"
            formAction={deleteResourceAction}
            className="text-sm font-semibold text-signal"
            formNoValidate
            onClick={(e) => {
              if (!window.confirm("Delete this product?")) e.preventDefault();
            }}
          >
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}
