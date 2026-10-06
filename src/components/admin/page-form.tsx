"use client";

import { useActionState, useRef, useState } from "react";
import { PageSectionsEditor } from "@/components/admin/advanced-editors";
import { MediaPicker } from "@/components/admin/media-picker";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { TabShell } from "@/components/admin/tab-shell";
import { inputClass, labelClass, primaryButtonClass } from "@/components/admin/styles";
import { deleteResourceAction, saveResourceAction } from "@/lib/cms/actions";
import type { PageSectionPayload } from "@/lib/cms/entity-data";
import type { MediaItem } from "@/lib/cms/queries";
import { mergePageInitial } from "@/lib/cms/page-form-defaults";
import { normalizeSlug, publicPath, siteOrigin } from "@/lib/paths";

function asText(value: unknown) {
  return value == null ? "" : String(value);
}

const pageTypes = [
  "home",
  "about",
  "contact",
  "custom",
  "landing_page",
  "product_listing",
  "blog_listing",
  "gallery",
  "certificates",
  "catalogue",
];

export function PageForm({
  id,
  initial,
  sections,
  media,
  canDelete,
}: {
  id?: string;
  initial: Record<string, unknown>;
  sections: PageSectionPayload[];
  media: MediaItem[];
  canDelete: boolean;
}) {
  const values = mergePageInitial(initial);
  const [state, action, pending] = useActionState(saveResourceAction, null);
  const slugEdited = useRef(asText(values.slug).length > 0);
  const pathEdited = useRef(asText(values.path).length > 0);
  const [title, setTitle] = useState(asText(values.title));
  const [slug, setSlug] = useState(asText(values.slug));
  const [path, setPath] = useState(asText(values.path));
  const preview = publicPath(path);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="resource" value="pages" />
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
                  <span className={labelClass}>Title</span>
                  <input
                    className={inputClass}
                    name="title"
                    value={title}
                    required
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!slugEdited.current) setSlug(normalizeSlug(e.target.value));
                      if (!pathEdited.current) setPath(normalizeSlug(e.target.value));
                    }}
                  />
                </label>
                <label>
                  <span className={labelClass}>Slug</span>
                  <input className={inputClass} name="slug" value={slug} required onChange={(e) => { slugEdited.current = true; setSlug(e.target.value.toLowerCase()); }} />
                </label>
                <label>
                  <span className={labelClass}>URL path</span>
                  <input className={inputClass} name="path" value={path} required onChange={(e) => { pathEdited.current = true; setPath(e.target.value); }} />
                </label>
                <label>
                  <span className={labelClass}>Page type</span>
                  <select className={inputClass} name="pageType" defaultValue={asText(values.pageType)}>
                    {pageTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Status</span>
                  <select className={inputClass} name="status" defaultValue={asText(values.status)}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass}>Excerpt</span>
                  <textarea className={inputClass} name="excerpt" rows={2} defaultValue={asText(values.excerpt)} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass}>Short description</span>
                  <textarea className={inputClass} name="shortDescription" rows={2} defaultValue={asText(values.shortDescription)} />
                </label>
                <div className="md:col-span-2">
                  <span className={labelClass}>Featured image</span>
                  <MediaPicker name="featuredImageId" initialIds={asText(values.featuredImageId) ? [asText(values.featuredImageId)] : []} known={media} />
                </div>
                <div className="md:col-span-2">
                  <span className={labelClass}>Hero image</span>
                  <MediaPicker name="heroMediaId" initialIds={asText(values.heroMediaId) ? [asText(values.heroMediaId)] : []} known={media} />
                </div>
                <div className="md:col-span-2">
                  <span className={labelClass}>Body</span>
                  <RichTextEditor name="body" defaultValue={asText(values.body)} />
                </div>
              </section>
            ),
          },
          {
            id: "builder",
            label: "Page builder",
            content: (
              <section className="rounded-lg border border-line bg-white p-4">
                <PageSectionsEditor name="_sections" initial={sections} media={media} />
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
                  <input className={inputClass} name="seoTitle" defaultValue={asText(values.seoTitle)} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClass}>Meta description</span>
                  <textarea className={inputClass} name="seoDescription" rows={3} defaultValue={asText(values.seoDescription)} />
                </label>
                <label className="flex items-center gap-2">
                  <input name="breadcrumbsEnabled" type="checkbox" defaultChecked={values.breadcrumbsEnabled !== false} className="h-4 w-4 accent-navy" />
                  <span className="text-sm">Show breadcrumbs</span>
                </label>
              </section>
            ),
          },
        ]}
      />
      <div className="flex flex-wrap gap-4">
        <button className={primaryButtonClass} type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save page"}
        </button>
        {id && canDelete ? (
          <button type="submit" formAction={deleteResourceAction} className="text-sm font-semibold text-signal" formNoValidate onClick={(e) => { if (!window.confirm("Delete this page?")) e.preventDefault(); }}>
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}
