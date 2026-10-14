"use client";

import { useActionState, useRef, useState } from "react";
import { FaqsEditor } from "@/components/admin/advanced-editors";
import { RelationManyField, SpecsEditor } from "@/components/admin/editors";
import { MediaPicker } from "@/components/admin/media-picker";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { helpClass, inputClass, labelClass, primaryButtonClass } from "@/components/admin/styles";
import { deleteResourceAction, saveResourceAction } from "@/lib/cms/actions";
import type { MediaItem } from "@/lib/cms/queries";
import type { FieldDef, ResourceKey } from "@/lib/cms/resources";
import { normalizeSlug, publicPath, siteOrigin } from "@/lib/paths";
import type { SpecRow } from "@/db/schema";
import type { FaqPayload } from "@/lib/cms/entity-data";

function asText(value: unknown) {
  return value == null ? "" : String(value);
}

function asList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toLocalInput(value: unknown) {
  if (!value || typeof value !== "string") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function DateTimeField({ name, defaultIso }: { name: string; defaultIso: string }) {
  const [iso, setIso] = useState(defaultIso);
  return (
    <>
      <input
        className={inputClass}
        type="datetime-local"
        value={toLocalInput(iso)}
        onChange={(event) => setIso(event.target.value ? new Date(event.target.value).toISOString() : "")}
      />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}

export function ResourceForm({
  resource,
  id,
  fields,
  initial,
  media,
  pathMode,
  canDelete,
  canEdit = true,
}: {
  resource: ResourceKey;
  id?: string;
  fields: FieldDef[];
  initial: Record<string, unknown>;
  media: MediaItem[];
  pathMode?: string;
  canDelete: boolean;
  canEdit?: boolean;
}) {
  const [state, action, pending] = useActionState(saveResourceAction, null);
  const slugEdited = useRef(Boolean(initial.slug));
  const pathEdited = useRef(Boolean(initial.path));
  const [title, setTitle] = useState(asText(initial.title));
  const [slug, setSlug] = useState(asText(initial.slug));
  const [path, setPath] = useState(asText(initial.path));

  function onTitle(value: string) {
    setTitle(value);
    if (slugEdited.current) return;
    const nextSlug = normalizeSlug(value);
    setSlug(nextSlug);
    if (!pathEdited.current && (pathMode === "page" || pathMode === "post")) setPath(nextSlug);
  }

  const preview =
    pathMode === "location"
      ? publicPath(`city/${slug}`)
      : pathMode === "export"
        ? publicPath(`exports/${slug}`)
        : pathMode === "post"
          ? publicPath(slug)
          : pathMode
            ? publicPath(path)
            : "";

  const groups: { name: string; fields: FieldDef[] }[] = [];
  for (const field of fields) {
    const name = field.group ?? "Details";
    const group = groups.find((item) => item.name === name);
    if (group) group.fields.push(field);
    else groups.push({ name, fields: [field] });
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="resource" value={resource} />
      <input type="hidden" name="id" value={id ?? ""} />
      {state?.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}
      {preview ? (
        <p className="rounded-md bg-paper px-3 py-2 text-sm text-navy">
          Public URL <span className="font-semibold">{siteOrigin()}{preview}</span>
        </p>
      ) : null}
      <fieldset disabled={!canEdit} className="space-y-6">
      {groups.map((group) => (
        <section key={group.name} className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-muted">{group.name}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {group.fields.map((field) => (
              <label key={field.name} className={field.wide ? "md:col-span-2" : undefined}>
                <span className={labelClass}>
                  {field.label}
                  {field.required ? <span className="text-signal"> *</span> : null}
                </span>
                {renderField(field, { title, slug, path, initial, media, onTitle, setSlug, setPath, slugEdited, pathEdited })}
                {field.help ? <span className={helpClass}>{field.help}</span> : null}
              </label>
            ))}
          </div>
        </section>
      ))}
      {resource === "product-categories" ? (
        <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-muted">Frequently Asked Questions</h2>
          <p className="mb-4 text-sm text-muted">These FAQs appear at the bottom of this category page. Reorder them with Up and Down.</p>
          <FaqsEditor
            name="_faqs"
            initial={
              Array.isArray(initial.categoryFaqs)
                ? (initial.categoryFaqs as FaqPayload[])
                : []
            }
          />
        </section>
      ) : null}
      {canEdit ? <div className="flex flex-wrap items-center gap-4">
        <button className={primaryButtonClass} type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        {id && canDelete ? <DeleteControl /> : null}
      </div> : <p className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-muted">Read-only access. Ask the Super Admin for edit permission.</p>}
      </fieldset>
    </form>
  );
}

function DeleteControl() {
  return (
    <button
      type="submit"
      formAction={deleteResourceAction}
      className="text-sm font-semibold text-signal"
      formNoValidate
      onClick={(event) => {
        if (!window.confirm("Delete this record? This cannot be undone.")) event.preventDefault();
      }}
    >
      Delete
    </button>
  );
}

function renderField(
  field: FieldDef,
  state: {
    title: string;
    slug: string;
    path: string;
    initial: Record<string, unknown>;
    media: MediaItem[];
    onTitle: (value: string) => void;
    setSlug: (value: string) => void;
    setPath: (value: string) => void;
    slugEdited: React.RefObject<boolean>;
    pathEdited: React.RefObject<boolean>;
  },
) {
  if (field.name === "title") {
    return <input className={inputClass} name="title" value={state.title} required={field.required} onChange={(event) => state.onTitle(event.target.value)} />;
  }
  if (field.name === "slug") {
    return (
      <input
        className={inputClass}
        name="slug"
        value={state.slug}
        required={field.required}
        onChange={(event) => {
          state.slugEdited.current = true;
          state.setSlug(event.target.value.toLowerCase());
        }}
      />
    );
  }
  if (field.name === "path") {
    return (
      <input
        className={inputClass}
        name="path"
        value={state.path}
        required={field.required}
        onChange={(event) => {
          state.pathEdited.current = true;
          state.setPath(event.target.value);
        }}
      />
    );
  }
  if (field.type === "textarea") {
    return <textarea className={inputClass} name={field.name} rows={4} defaultValue={asText(state.initial[field.name])} required={field.required} />;
  }
  if (field.type === "richtext") {
    return <RichTextEditor name={field.name} defaultValue={asText(state.initial[field.name])} />;
  }
  if (field.type === "select") {
    return (
      <select className={inputClass} name={field.name} defaultValue={asText(state.initial[field.name] ?? field.defaultValue ?? "")} required={field.required}>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "relation") {
    return (
      <select className={inputClass} name={field.name} defaultValue={asText(state.initial[field.name])}>
        <option value="">None</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "checkbox") {
    return (
      <span className="flex h-10 items-center">
        <input name={field.name} type="checkbox" defaultChecked={Boolean(state.initial[field.name] ?? field.defaultValue)} className="h-4 w-4 accent-navy" />
      </span>
    );
  }
  if (field.type === "number") {
    return <input className={inputClass} name={field.name} type="number" defaultValue={asText(state.initial[field.name] ?? 0)} />;
  }
  if (field.type === "datetime") {
    return <DateTimeField name={field.name} defaultIso={asText(state.initial[field.name])} />;
  }
  if (field.type === "password") {
    return <input className={inputClass} name={field.name} type="password" autoComplete="new-password" />;
  }
  if (field.type === "media" || field.type === "mediaMany") {
    return (
      <MediaPicker
        name={field.name}
        multiple={field.type === "mediaMany"}
        initialIds={field.type === "mediaMany" ? asList(state.initial[field.name]) : asList([state.initial[field.name]]).filter(Boolean)}
        known={state.media}
      />
    );
  }
  if (field.type === "specs") {
    const specs = Array.isArray(state.initial[field.name]) ? (state.initial[field.name] as SpecRow[]) : [];
    return <SpecsEditor name={field.name} initial={specs} />;
  }
  if (field.type === "relationMany") {
    return <RelationManyField name={field.name} options={field.options ?? []} initialIds={asList(state.initial[field.name])} />;
  }
  if (field.type === "permissionList") {
    const selected = new Set(asList(state.initial[field.name]));
    return (
      <div className="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-2">
        {field.options?.map((option) => (
          <label key={option.value} className="flex items-start gap-2 text-sm text-ink">
            <input name={field.name} type="checkbox" value={option.value} defaultChecked={selected.has(option.value)} className="mt-0.5 h-4 w-4 accent-navy" />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    );
  }
  return <input className={inputClass} name={field.name} defaultValue={asText(state.initial[field.name])} required={field.required} />;
}
