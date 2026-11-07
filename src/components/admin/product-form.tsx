"use client";

import { useActionState, useRef, useState } from "react";
import {
  ApplicationsEditor,
  DocumentsEditor,
  FaqsEditor,
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
import {
  helpClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/components/admin/styles";
import { deleteResourceAction, saveResourceAction } from "@/lib/cms/actions";
import type { ProductPayload } from "@/lib/cms/entity-data";
import type { MediaItem } from "@/lib/cms/queries";
import { normalizeSlug, publicPath, siteOrigin } from "@/lib/paths";
import type { ProductSpecRow } from "@/db/schema";
import { FormDraftGuard } from "@/components/admin/form-draft-guard";
import {
  normalizeProductEditorHtml,
  normalizeProductSummary,
} from "@/lib/cms/product-article";

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

function specificationsForForm(
  initial: Record<string, unknown>,
  payload: ProductPayload,
) {
  if (payload.specifications.length)
    return normalizeSpecRows(payload.specifications);
  if (Array.isArray(initial.specs))
    return normalizeSpecRows(initial.specs as ProductSpecRow[]);
  return [];
}

export function ProductForm({
  id,
  initial,
  payload,
  media,
  categoryOptions,
  categoryIds,
  productOptions,
  pageHtml,
  canDelete,
}: {
  id?: string;
  initial: Record<string, unknown>;
  payload: ProductPayload;
  media: MediaItem[];
  categoryOptions: { value: string; label: string }[];
  categoryIds: string[];
  productOptions: { value: string; label: string }[];
  pageHtml: {
    headerHtml: string;
    footerHtml: string;
    isActive: boolean;
  } | null;
  canDelete: boolean;
}) {
  const [state, action, pending] = useActionState(saveResourceAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const slugEdited = useRef(Boolean(asText(initial.slug)));
  const pathEdited = useRef(Boolean(asText(initial.path)));
  const [title, setTitle] = useState(() => asText(initial.title));
  const [slug, setSlug] = useState(() => asText(initial.slug));
  const [path, setPath] = useState(() => asText(initial.path));
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(() =>
    categoryIds.length
      ? categoryIds
      : [asText(initial.categoryId), asText(initial.subCategoryId)].filter(
          Boolean,
        ),
  );
  const specificationRows = specificationsForForm(initial, payload);

  const preview = publicPath(path);
  const defaultMetaTitle =
    asText(initial.seoTitle).trim() || title || asText(initial.title);
  const defaultMetaDescription =
    asText(initial.seoDescription).trim() ||
    normalizeProductSummary(asText(initial.summary));
  const defaultCanonicalUrl =
    asText(initial.canonicalUrl).trim() ||
    (preview ? `${siteOrigin()}${preview}` : "");
  const updateTitle = (nextTitle: string) => {
    setTitle(nextTitle);
    if (!slugEdited.current) setSlug(normalizeSlug(nextTitle));
    if (!pathEdited.current) setPath(`products/${normalizeSlug(nextTitle)}`);
  };

  return (
    <form ref={formRef} action={action} className="space-y-6">
      <input type="hidden" name="resource" value="products" />
      <input type="hidden" name="id" value={id ?? ""} />
      {[
        "body",
        "richContent",
        "featuresText",
        "benefits",
        "advantages",
        "applicationsText",
        "workingPrinciple",
        "construction",
        "material",
        "manufacturingDetails",
        "qualityInformation",
        "maintenanceInformation",
        "safetyInformation",
        "customizationInformation",
        "thumbnailId",
        "diagramImageId",
        "technicalDrawingId",
        "dimensionDrawingId",
        "installationImageId",
      ].map((name) => (
        <input
          key={name}
          type="hidden"
          name={name}
          value={asText(initial[name])}
        />
      ))}
      <FormDraftGuard
        formRef={formRef}
        storageKey={`cms:product-draft:${id ?? "new"}`}
        serverUpdatedAt={asText(initial.updatedAt) || null}
        pending={pending}
        onRestore={(values) => {
          if (values.title?.[0] !== undefined) setTitle(values.title[0]);
          if (values.slug?.[0] !== undefined) setSlug(values.slug[0]);
          if (values.path?.[0] !== undefined) setPath(values.path[0]);
          if (values.categoryIds) setSelectedCategoryIds(values.categoryIds);
        }}
      />
      {state?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      {preview ? (
        <p className="rounded-md bg-paper px-3 py-2 text-sm text-navy">
          Public URL{" "}
          <span className="font-semibold">
            {siteOrigin()}
            {preview}
          </span>
        </p>
      ) : null}
      <TabShell
        stacked
        tabs={[
          {
            id: "general",
            label: "Product basics",
            content: (
              <section className="grid gap-4 rounded-lg border border-line bg-white p-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className={labelClass}>Name</span>
                  <input
                    className={inputClass}
                    name="title"
                    value={title ?? ""}
                    required
                    onChange={(e) => updateTitle(e.target.value)}
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
                  <input
                    className={inputClass}
                    name="sku"
                    defaultValue={asText(initial.sku)}
                  />
                </label>
                <label>
                  <span className={labelClass}>Product code</span>
                  <input
                    className={inputClass}
                    name="productCode"
                    defaultValue={asText(initial.productCode)}
                  />
                </label>
                <label>
                  <span className={labelClass}>Brand</span>
                  <input
                    className={inputClass}
                    name="brand"
                    defaultValue={asText(initial.brand)}
                  />
                </label>
                <label>
                  <span className={labelClass}>Model number</span>
                  <input
                    className={inputClass}
                    name="modelNumber"
                    defaultValue={asText(initial.modelNumber)}
                  />
                </label>
                <label>
                  <span className={labelClass}>Category display order</span>
                  <input
                    className={inputClass}
                    name="sortOrder"
                    type="number"
                    defaultValue={asText(initial.sortOrder ?? 0)}
                  />
                  <span className={helpClass}>
                    Lower number appears first inside the selected category.
                  </span>
                </label>
                <label>
                  <span className={labelClass}>Status</span>
                  <select
                    className={inputClass}
                    name="status"
                    defaultValue={asText(initial.status ?? "draft")}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    name="isFeatured"
                    type="checkbox"
                    defaultChecked={Boolean(initial.isFeatured)}
                    className="h-4 w-4 accent-navy"
                  />
                  <span className="text-sm">Featured</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    name="isActive"
                    type="checkbox"
                    defaultChecked={initial.isActive !== false}
                    className="h-4 w-4 accent-navy"
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label>
                  <span className={labelClass}>Price (optional)</span>
                  <input
                    className={inputClass}
                    name="price"
                    defaultValue={asText(initial.price)}
                  />
                </label>
                <label>
                  <span className={labelClass}>Stock (optional)</span>
                  <input
                    className={inputClass}
                    name="stock"
                    defaultValue={asText(initial.stock)}
                  />
                </label>
                <label>
                  <span className={labelClass}>Product rating</span>
                  <select
                    className={inputClass}
                    name="rating"
                    defaultValue={asText(initial.rating)}
                  >
                    <option value="">Not shown</option>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} star{rating === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Shipping area</span>
                  <input
                    className={inputClass}
                    name="shippingArea"
                    defaultValue={asText(initial.shippingArea)}
                    placeholder="All over India"
                  />
                </label>
              </section>
            ),
          },
          {
            id: "description",
            label: "Content and details",
            content: (
              <section className="space-y-4 rounded-lg border border-line bg-white p-4">
                <label>
                  <span className={labelClass}>Short summary</span>
                  <textarea
                    className={inputClass}
                    name="summary"
                    rows={3}
                    defaultValue={normalizeProductSummary(asText(initial.summary))}
                  />
                </label>
                <div>
                  <span className={labelClass}>Product description (Overview tab)</span>
                  <RichTextEditor
                    name="overview"
                    media={media}
                    defaultValue={normalizeProductEditorHtml(
                      asText(initial.overview) ||
                        asText(initial.body) ||
                        asText(initial.richContent),
                    )}
                  />
                  <span className={helpClass}>
                    Add narrative product content here. Insert images only
                    from the Media library, and manage blog posts from Blog
                    posts—not inside this product description.
                  </span>
                </div>
                <div className="rounded-md border border-line p-4">
                  <span className={labelClass}>
                    Show this product in categories
                  </span>
                  <p className={`${helpClass} mb-3`}>
                    Tick every category where this product should appear. The
                    first two selections remain the primary and secondary
                    categories for older navigation.
                  </p>
                  <input
                    type="hidden"
                    name="categoryId"
                    value={selectedCategoryIds[0] ?? ""}
                  />
                  <input
                    type="hidden"
                    name="subCategoryId"
                    value={selectedCategoryIds[1] ?? ""}
                  />
                  <div className="grid gap-2 md:grid-cols-2">
                    {categoryOptions.map((option) => {
                      const checked = selectedCategoryIds.includes(
                        option.value,
                      );
                      return (
                        <label
                          key={option.value}
                          className="flex items-start gap-2 rounded border border-line px-3 py-2 text-sm text-navy"
                        >
                          <input
                            name="categoryIds"
                            type="checkbox"
                            value={option.value}
                            checked={checked}
                            onChange={() =>
                              setSelectedCategoryIds((current) =>
                                checked
                                  ? current.filter((id) => id !== option.value)
                                  : [...current, option.value],
                              )
                            }
                            className="mt-0.5 h-4 w-4 accent-navy"
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <details open className="rounded-md border border-line p-4">
                  <summary className="cursor-pointer font-semibold text-navy">
                    Images
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <span className={labelClass}>Main product image</span>
                      <MediaPicker
                        name="featuredImageId"
                        initialIds={
                          asText(initial.featuredImageId)
                            ? [asText(initial.featuredImageId)]
                            : []
                        }
                        known={media}
                      />
                    </div>
                    <div>
                      <span className={labelClass}>
                        Product gallery and uploaded content images (optional)
                      </span>
                      <MediaPicker
                        name="galleryMediaIds"
                        multiple
                        initialIds={payload.galleryMediaIds ?? []}
                        known={media}
                      />
                      <span className={helpClass}>
                        Upload or select the product’s images here. The Insert
                        image button above uses this same Media library.
                      </span>
                    </div>
                  </div>
                </details>
                <details className="rounded-md border border-line p-4">
                  <summary className="cursor-pointer font-semibold text-navy">
                    Specifications (shown in the Specifications tab)
                  </summary>
                  <div className="mt-4">
                    <FullSpecsEditor
                      name="_specs"
                      initial={specificationRows}
                    />
                  </div>
                </details>
                <details className="rounded-md border border-line p-4">
                  <summary className="cursor-pointer font-semibold text-navy">
                    Related products
                  </summary>
                  <div className="mt-4">
                    <RelatedProductsEditor
                      name="_related"
                      initial={payload.relatedProducts}
                      options={productOptions}
                    />
                  </div>
                </details>
                <details className="rounded-md border border-line p-4">
                  <summary className="cursor-pointer font-semibold text-navy">
                    Features and applications
                  </summary>
                  <div className="mt-4 space-y-6">
                    <FeaturesEditor
                      name="_features"
                      initial={payload.features}
                      media={media}
                    />
                    <ApplicationsEditor
                      name="_applications"
                      initial={payload.applications}
                      media={media}
                    />
                  </div>
                </details>
                <details className="rounded-md border border-line p-4">
                  <summary className="cursor-pointer font-semibold text-navy">
                    Technical data and options
                  </summary>
                  <div className="mt-4 space-y-6">
                    <TechnicalTablesEditor
                      name="_technicalTables"
                      initial={payload.technicalTables}
                    />
                    <OptionsEditor
                      name="_options"
                      initial={payload.options}
                      media={media}
                    />
                  </div>
                </details>
                <details className="rounded-md border border-line p-4">
                  <summary className="cursor-pointer font-semibold text-navy">
                    Documents
                  </summary>
                  <div className="mt-4 space-y-5">
                    <div>
                      <span className={labelClass}>Product PDF brochure</span>
                      <MediaPicker
                        name="brochureMediaId"
                        initialIds={
                          asText(initial.brochureMediaId)
                            ? [asText(initial.brochureMediaId)]
                            : []
                        }
                        known={media}
                      />
                      <span className={helpClass}>
                        This file powers the public “View PDF” button.
                      </span>
                    </div>
                    <div>
                      <span className={helpClass}>
                        Add a document with type “Certificate” to enable the
                        public View Certificates button and certificate icons.
                      </span>
                      <DocumentsEditor
                        name="_documents"
                        initial={payload.documents}
                        media={media}
                      />
                    </div>
                  </div>
                </details>
                <details className="rounded-md border border-line p-4">
                  <summary className="cursor-pointer font-semibold text-navy">
                    Video and customer reviews
                  </summary>
                  <div className="mt-4 space-y-6">
                    <PageSectionsEditor
                      name="_sections"
                      initial={payload.sections}
                      media={media}
                      allowedTypes={["video", "testimonials"]}
                    />
                  </div>
                </details>
                <details className="rounded-md border border-line p-4">
                  <summary className="cursor-pointer font-semibold text-navy">
                    Product FAQs
                  </summary>
                  <div className="mt-4 space-y-3">
                    <p className={helpClass}>
                      Add product questions and answers here. These appear only
                      in the public product FAQ tab.
                    </p>
                    <FaqsEditor name="_faqs" initial={payload.faqs} />
                  </div>
                </details>
              </section>
            ),
          },
          {
            id: "images",
            label: "Images",
            hidden: true,
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
                    <MediaPicker
                      name={name}
                      initialIds={
                        asText(initial[name]) ? [asText(initial[name])] : []
                      }
                      known={media}
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <span className={labelClass}>Gallery</span>
                  <MediaPicker
                    name="galleryMediaIds"
                    multiple
                    initialIds={payload.galleryMediaIds ?? []}
                    known={media}
                  />
                  <span className={helpClass}>
                    Drag order with Up/Down in the picker.
                  </span>
                </div>
              </section>
            ),
          },
          {
            id: "features",
            label: "Features",
            hidden: true,
            content: (
              <section className="rounded-lg border border-line bg-white p-4">
                <FeaturesEditor
                  name="_features"
                  initial={payload.features}
                  media={media}
                />
              </section>
            ),
          },
          {
            id: "applications",
            label: "Applications",
            hidden: true,
            content: (
              <section className="rounded-lg border border-line bg-white p-4">
                <ApplicationsEditor
                  name="_applications"
                  initial={payload.applications}
                  media={media}
                />
              </section>
            ),
          },
          {
            id: "specifications",
            label: "Specifications",
            hidden: true,
            content: (
              <section className="rounded-lg border border-line bg-white p-4">
                <FullSpecsEditor name="_specs" initial={specificationRows} />
              </section>
            ),
          },
          {
            id: "tables",
            label: "Technical tables",
            hidden: true,
            content: (
              <section className="rounded-lg border border-line bg-white p-4">
                <TechnicalTablesEditor
                  name="_technicalTables"
                  initial={payload.technicalTables}
                />
              </section>
            ),
          },
          {
            id: "options",
            label: "Options",
            hidden: true,
            content: (
              <section className="rounded-lg border border-line bg-white p-4">
                <OptionsEditor
                  name="_options"
                  initial={payload.options}
                  media={media}
                />
              </section>
            ),
          },
          {
            id: "documents",
            label: "Documents",
            hidden: true,
            content: (
              <section className="rounded-lg border border-line bg-white p-4">
                <DocumentsEditor
                  name="_documents"
                  initial={payload.documents}
                  media={media}
                />
              </section>
            ),
          },
          {
            id: "related",
            label: "Related products",
            hidden: true,
            content: (
              <section className="rounded-lg border border-line bg-white p-4">
                <RelatedProductsEditor
                  name="_related"
                  initial={payload.relatedProducts}
                  options={productOptions}
                />
              </section>
            ),
          },
          {
            id: "sections",
            label: "Video & reviews",
            hidden: true,
            content: (
              <section className="space-y-3 rounded-lg border border-line bg-white p-4">
                <p className={helpClass}>
                  Add a <strong>video</strong> section for the Video tab, or a{" "}
                  <strong>review</strong> section for the Reviews tab. Tabs only
                  appear on the product page when active content is added here.
                </p>
                <PageSectionsEditor
                  name="_sections"
                  initial={payload.sections}
                  media={media}
                />
              </section>
            ),
          },
          {
            id: "faqs",
            label: "FAQs",
            hidden: true,
            content: (
              <section className="space-y-3 rounded-lg border border-line bg-white p-4">
                <p className={helpClass}>
                  Only active FAQs appear in the product page FAQ tab.
                </p>
                <FaqsEditor name="_faqs" initial={payload.faqs} />
              </section>
            ),
          },
          {
            id: "page-html",
            label: "Advanced page HTML",
            content: (
              <details className="rounded-lg border border-line bg-white p-4">
                <summary className="cursor-pointer font-semibold text-navy">
                  Custom header and footer HTML (optional)
                </summary>
                <div className="mt-4 space-y-4">
                <label className="flex items-center gap-2 text-sm text-navy">
                  <input
                    name="_pageHtmlEnabled"
                    type="checkbox"
                    defaultChecked={pageHtml?.isActive ?? false}
                    className="h-4 w-4 accent-navy"
                  />
                  Enable this product&apos;s custom header and footer HTML
                </label>
                <p className={helpClass}>
                  This applies only to this product URL. Common HTML remains
                  available under Site → Common HTML and appears across all
                  public pages. Use the HTML source fields below; valid JSON-LD
                  schema blocks are supported.
                </p>
                <div>
                  <span className={labelClass}>Custom header HTML</span>
                  <textarea
                    name="_pageHeaderHtml"
                    className="min-h-52 w-full rounded-md border border-line bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
                    aria-label="Custom header HTML source"
                    spellCheck={false}
                    defaultValue={pageHtml?.headerHtml ?? ""}
                  />
                </div>
                <div>
                  <span className={labelClass}>Custom footer HTML</span>
                  <textarea
                    name="_pageFooterHtml"
                    className="min-h-52 w-full rounded-md border border-line bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
                    aria-label="Custom footer HTML source"
                    spellCheck={false}
                    defaultValue={pageHtml?.footerHtml ?? ""}
                  />
                </div>
                </div>
              </details>
            ),
          },
          {
            id: "enquiry",
            label: "Enquiry",
            content: (
              <section className="grid gap-4 rounded-lg border border-line bg-white p-4 md:grid-cols-2">
                <label className="flex items-center gap-2 md:col-span-2">
                  <input
                    name="enquiryEnabled"
                    type="checkbox"
                    defaultChecked={initial.enquiryEnabled !== false}
                    className="h-4 w-4 accent-navy"
                  />
                  <span className="text-sm">Enable product enquiry</span>
                </label>
                <label>
                  <span className={labelClass}>Button text</span>
                  <input
                    className={inputClass}
                    name="enquiryButtonText"
                    defaultValue={asText(initial.enquiryButtonText)}
                  />
                </label>
                <label>
                  <span className={labelClass}>Enquiry email</span>
                  <input
                    className={inputClass}
                    name="enquiryEmail"
                    type="email"
                    defaultValue={asText(initial.enquiryEmail)}
                  />
                </label>
              </section>
            ),
          },
          {
            id: "seo",
            label: "SEO and social sharing",
            content: (
              <details className="rounded-lg border border-line bg-white p-4">
                <summary className="cursor-pointer font-semibold text-navy">
                  Optional SEO overrides
                </summary>
                <p className={`${helpClass} mt-2`}>
                  Leave these empty to automatically use the product name,
                  short summary, public product URL, and main product image.
                </p>
                <section className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className={labelClass}>Meta title</span>
                  <input
                    className={inputClass}
                    name="seoTitle"
                    defaultValue={asText(initial.seoTitle)}
                  />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass}>Meta description</span>
                  <textarea
                    className={inputClass}
                    name="seoDescription"
                    rows={3}
                    defaultValue={asText(initial.seoDescription)}
                  />
                </label>
                <label>
                  <span className={labelClass}>Focus keyword</span>
                  <input
                    className={inputClass}
                    name="focusKeyword"
                    defaultValue={asText(initial.focusKeyword)}
                  />
                </label>
                <label>
                  <span className={labelClass}>Canonical URL</span>
                  <input
                    className={inputClass}
                    name="canonicalUrl"
                    defaultValue={defaultCanonicalUrl}
                  />
                  <span className={helpClass}>
                    This is also used as the Open Graph URL. It defaults to
                    this product page URL; change it only for a deliberate
                    alternate canonical page.
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    name="robotsIndex"
                    type="checkbox"
                    defaultChecked={initial.robotsIndex !== false}
                    className="h-4 w-4 accent-navy"
                  />
                  <span className="text-sm">Allow indexing</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    name="robotsFollow"
                    type="checkbox"
                    defaultChecked={initial.robotsFollow !== false}
                    className="h-4 w-4 accent-navy"
                  />
                  <span className="text-sm">Allow following links</span>
                </label>
                <div className="md:col-span-2">
                  <p className="mb-2 text-sm font-semibold text-navy">
                    Open Graph (Facebook, WhatsApp, LinkedIn)
                  </p>
                </div>
                <label className="md:col-span-2">
                  <span className={labelClass}>Open Graph title</span>
                  <input
                    className={inputClass}
                    name="ogTitle"
                    defaultValue={asText(initial.ogTitle) || defaultMetaTitle}
                  />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass}>Open Graph description</span>
                  <textarea
                    className={inputClass}
                    name="ogDescription"
                    rows={3}
                    defaultValue={
                      asText(initial.ogDescription) || defaultMetaDescription
                    }
                  />
                </label>
                <div className="md:col-span-2">
                  <span className={labelClass}>
                    Social sharing image override
                  </span>
                  <MediaPicker
                    name="ogImageId"
                    initialIds={
                      asText(initial.ogImageId)
                        ? [asText(initial.ogImageId)]
                        : []
                    }
                    known={media}
                  />
                  <span className={helpClass}>
                    If no override is selected, the main product image URL is
                    used automatically for Open Graph and Twitter sharing.
                  </span>
                </div>
                </section>
              </details>
            ),
          },
        ]}
      />
      <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-4 rounded-lg border border-line bg-white/95 p-3 shadow-lg backdrop-blur">
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
