"use client";

import { useState } from "react";
import { MediaPicker } from "@/components/admin/media-picker";
import { inputClass, labelClass, secondaryButtonClass } from "@/components/admin/styles";
import type { MediaItem } from "@/lib/cms/queries";
import type {
  FaqPayload,
  PageSectionPayload,
  ProductRelationRow,
  ProductPostRelationRow,
  TechnicalTableRow,
} from "@/lib/cms/entity-data";
import type { ProductSpecRow, SpecRow } from "@/db/schema";

function asText(value: unknown) {
  return value == null ? "" : String(value);
}

export function FaqsEditor({
  name,
  initial,
}: {
  name: string;
  initial: FaqPayload[];
}) {
  const [rows, setRows] = useState<FaqPayload[]>(() =>
    initial.length
      ? initial.map((row, sortOrder) => ({ ...row, sortOrder }))
      : [{ question: "", answer: "", sortOrder: 0, isActive: true }],
  );

  const update = (index: number, patch: Partial<FaqPayload>) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  const move = (index: number, direction: -1 | 1) =>
    setRows((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next.map((row, sortOrder) => ({ ...row, sortOrder }));
    });

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.map((row, index) => (
        <div key={index} className="rounded-lg border border-line bg-paper/40 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              <input
                className={inputClass}
                value={row.question}
                placeholder="Question"
                onChange={(event) => update(index, { question: event.target.value })}
              />
              <textarea
                className={inputClass}
                rows={4}
                value={row.answer}
                placeholder="Answer"
                onChange={(event) => update(index, { answer: event.target.value })}
              />
              <label className="flex items-center gap-2 text-sm text-navy">
                <input
                  type="checkbox"
                  checked={row.isActive}
                  onChange={(event) => update(index, { isActive: event.target.checked })}
                  className="h-4 w-4 accent-navy"
                />
                Show this FAQ
              </label>
            </div>
            <div className="flex gap-2 md:flex-col">
              <button type="button" className={secondaryButtonClass} disabled={index === 0} onClick={() => move(index, -1)}>Up</button>
              <button type="button" className={secondaryButtonClass} disabled={index === rows.length - 1} onClick={() => move(index, 1)}>Down</button>
              <button type="button" className={secondaryButtonClass} onClick={() => setRows((current) => current.filter((_, i) => i !== index))}>Remove</button>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        className={secondaryButtonClass}
        onClick={() =>
          setRows((current) => [
            ...current,
            { question: "", answer: "", sortOrder: current.length, isActive: true },
          ])
        }
      >
        Add FAQ
      </button>
    </div>
  );
}

function normalizeSpecRow(row: ProductSpecRow): ProductSpecRow {
  return {
    label: asText(row.label),
    value: asText(row.value),
    unit: asText(row.unit),
    group: asText(row.group),
  };
}

export function FullSpecsEditor({ name, initial }: { name: string; initial: ProductSpecRow[] }) {
  const [rows, setRows] = useState<ProductSpecRow[]>(() =>
    initial.length ? initial.map(normalizeSpecRow) : [{ label: "", value: "", unit: "", group: "" }],
  );

  function update(index: number, key: keyof ProductSpecRow, value: string) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_80px_1fr_auto]">
            <input className={inputClass} value={asText(row.label)} placeholder="Label" onChange={(e) => update(index, "label", e.target.value)} />
            <input className={inputClass} value={asText(row.value)} placeholder="Value" onChange={(e) => update(index, "value", e.target.value)} />
            <input className={inputClass} value={asText(row.unit)} placeholder="Unit" onChange={(e) => update(index, "unit", e.target.value)} />
            <input className={inputClass} value={asText(row.group)} placeholder="Group" onChange={(e) => update(index, "group", e.target.value)} />
            <button type="button" className={secondaryButtonClass} onClick={() => setRows((c) => c.filter((_, i) => i !== index))}>
              Remove
            </button>
          </div>
        ))}
      </div>
      <button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => setRows((c) => [...c, { label: "", value: "", unit: "", group: "" }])}>
        Add row
      </button>
    </div>
  );
}

export function TechnicalTablesEditor({ name, initial }: { name: string; initial: TechnicalTableRow[] }) {
  const [tables, setTables] = useState(() =>
    initial.length
      ? initial.map((table) => ({
          tableTitle: asText(table.tableTitle),
          columns: Array.isArray(table.columns) ? table.columns.map((column) => asText(column)) : [""],
          rows: Array.isArray(table.rows)
            ? table.rows.map((row) => (Array.isArray(row) ? row.map((cell) => asText(cell)) : [""]))
            : [[""]],
        }))
      : [{ tableTitle: "", columns: [""], rows: [[""]] }],
  );

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(tables)} />
      <div className="space-y-4">
        {tables.map((table, tIndex) => (
          <div key={tIndex} className="rounded-md border border-line bg-paper/50 p-3">
            <input
              className={`${inputClass} mb-2`}
              value={asText(table.tableTitle)}
              placeholder="Table title"
              onChange={(e) =>
                setTables((c) => c.map((t, i) => (i === tIndex ? { ...t, tableTitle: e.target.value } : t)))
              }
            />
            <p className="mb-1 text-xs font-semibold text-muted">Columns (comma-separated)</p>
            <input
              className={`${inputClass} mb-2`}
              value={table.columns.join(", ")}
              onChange={(e) =>
                setTables((c) =>
                  c.map((t, i) => (i === tIndex ? { ...t, columns: e.target.value.split(",").map((s) => s.trim()) } : t)),
                )
              }
            />
            <p className="mb-1 text-xs font-semibold text-muted">Rows (one per line, cells separated by | )</p>
            <textarea
              className={inputClass}
              rows={4}
              value={table.rows.map((r: string[]) => r.join(" | ")).join("\n")}
              onChange={(e) =>
                setTables((c) =>
                  c.map((t, i) =>
                    i === tIndex
                      ? {
                          ...t,
                          rows: e.target.value
                            .split("\n")
                            .filter(Boolean)
                            .map((line) => line.split("|").map((cell) => cell.trim())),
                        }
                      : t,
                  ),
                )
              }
            />
            <button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => setTables((c) => c.filter((_, i) => i !== tIndex))}>
              Remove table
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={`${secondaryButtonClass} mt-2`}
        onClick={() => setTables((c) => [...c, { tableTitle: "", columns: ["Parameter", "Specification"], rows: [[""]] }])}
      >
        Add table
      </button>
    </div>
  );
}

type FeatureRow = { title: string; description: string; iconMediaId: string | null; imageMediaId: string | null };
type AppRow = { title: string; description: string; imageMediaId: string | null };
type DocRow = { title: string; mediaId: string | null; documentType: string; description: string; version: string };
type OptRow = { optionName: string; optionValue: string; description: string; imageMediaId: string | null };

export function RepeatableTextPairs({
  name,
  initial,
  labels,
}: {
  name: string;
  initial: FeatureRow[];
  labels: [string, string];
}) {
  const [rows, setRows] = useState(() =>
    initial.length
      ? initial.map((row) => ({ ...row, title: asText(row.title), description: asText(row.description) }))
      : [{ title: "", description: "", iconMediaId: null, imageMediaId: null }],
  );
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.map((row, index) => (
        <div key={index} className="mb-2 rounded border border-line p-2">
          <input className={`${inputClass} mb-2`} value={asText(row.title)} placeholder={labels[0]} onChange={(e) => setRows((c) => c.map((r, i) => (i === index ? { ...r, title: e.target.value } : r)))} />
          <textarea className={inputClass} rows={2} value={asText(row.description)} placeholder={labels[1]} onChange={(e) => setRows((c) => c.map((r, i) => (i === index ? { ...r, description: e.target.value } : r)))} />
          <button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => setRows((c) => c.filter((_, i) => i !== index))}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className={secondaryButtonClass} onClick={() => setRows((c) => [...c, { title: "", description: "", iconMediaId: null, imageMediaId: null }])}>
        Add
      </button>
    </div>
  );
}

export function FeaturesEditor({ name, initial, media }: { name: string; initial: FeatureRow[]; media: MediaItem[] }) {
  const [rows, setRows] = useState(() =>
    initial.length
      ? initial.map((row) => ({ ...row, title: asText(row.title), description: asText(row.description) }))
      : [{ title: "", description: "", iconMediaId: null, imageMediaId: null }],
  );
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.map((row, index) => (
        <div key={index} className="mb-3 rounded border border-line p-3">
          <input className={`${inputClass} mb-2`} value={asText(row.title)} placeholder="Title" onChange={(e) => setRows((c) => c.map((r, i) => (i === index ? { ...r, title: e.target.value } : r)))} />
          <textarea className={`${inputClass} mb-2`} rows={2} value={asText(row.description)} placeholder="Description" onChange={(e) => setRows((c) => c.map((r, i) => (i === index ? { ...r, description: e.target.value } : r)))} />
          <MediaPicker name={`feature-icon-${index}`} initialIds={row.iconMediaId ? [row.iconMediaId] : []} known={media} onChange={(ids) => setRows((c) => c.map((r, i) => (i === index ? { ...r, iconMediaId: ids[0] ?? null } : r)))} />
          <MediaPicker name={`feature-image-${index}`} initialIds={row.imageMediaId ? [row.imageMediaId] : []} known={media} onChange={(ids) => setRows((c) => c.map((r, i) => (i === index ? { ...r, imageMediaId: ids[0] ?? null } : r)))} />
          <button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => setRows((c) => c.filter((_, i) => i !== index))}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className={secondaryButtonClass} onClick={() => setRows((c) => [...c, { title: "", description: "", iconMediaId: null, imageMediaId: null }])}>
        Add feature
      </button>
    </div>
  );
}

export function ApplicationsEditor({ name, initial, media }: { name: string; initial: AppRow[]; media: MediaItem[] }) {
  const [rows, setRows] = useState(() =>
    initial.length
      ? initial.map((row) => ({ ...row, title: asText(row.title), description: asText(row.description) }))
      : [{ title: "", description: "", imageMediaId: null }],
  );
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.map((row, index) => (
        <div key={index} className="mb-3 rounded border border-line p-3">
          <input className={`${inputClass} mb-2`} value={asText(row.title)} placeholder="Title" onChange={(e) => setRows((c) => c.map((r, i) => (i === index ? { ...r, title: e.target.value } : r)))} />
          <textarea className={`${inputClass} mb-2`} rows={2} value={asText(row.description)} onChange={(e) => setRows((c) => c.map((r, i) => (i === index ? { ...r, description: e.target.value } : r)))} />
          <MediaPicker name={`app-image-${index}`} initialIds={row.imageMediaId ? [row.imageMediaId] : []} known={media} onChange={(ids) => setRows((c) => c.map((r, i) => (i === index ? { ...r, imageMediaId: ids[0] ?? null } : r)))} />
          <button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => setRows((c) => c.filter((_, i) => i !== index))}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className={secondaryButtonClass} onClick={() => setRows((c) => [...c, { title: "", description: "", imageMediaId: null }])}>
        Add application
      </button>
    </div>
  );
}

export function DocumentsEditor({ name, initial, media }: { name: string; initial: DocRow[]; media: MediaItem[] }) {
  const [rows, setRows] = useState(() =>
    initial.length
      ? initial.map((row) => ({
          ...row,
          title: asText(row.title),
          documentType: asText(row.documentType) || "other",
          description: asText(row.description),
          version: asText(row.version),
        }))
      : [{ title: "", mediaId: null, documentType: "other", description: "", version: "" }],
  );
  const types = ["datasheet", "brochure", "catalogue", "manual", "technical_drawing", "certificate", "other"];
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.map((row, index) => (
        <div key={index} className="mb-3 rounded border border-line p-3">
          <input className={`${inputClass} mb-2`} value={asText(row.title)} placeholder="Title" onChange={(e) => setRows((c) => c.map((r, i) => (i === index ? { ...r, title: e.target.value } : r)))} />
          <select className={`${inputClass} mb-2`} value={asText(row.documentType) || "other"} onChange={(e) => setRows((c) => c.map((r, i) => (i === index ? { ...r, documentType: e.target.value } : r)))}>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <MediaPicker name={`doc-${index}`} initialIds={row.mediaId ? [row.mediaId] : []} known={media} onChange={(ids) => setRows((c) => c.map((r, i) => (i === index ? { ...r, mediaId: ids[0] ?? null } : r)))} />
          <button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => setRows((c) => c.filter((_, i) => i !== index))}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className={secondaryButtonClass} onClick={() => setRows((c) => [...c, { title: "", mediaId: null, documentType: "other", description: "", version: "" }])}>
        Add document
      </button>
    </div>
  );
}

export function OptionsEditor({ name, initial, media }: { name: string; initial: OptRow[]; media: MediaItem[] }) {
  const [rows, setRows] = useState(() =>
    initial.length
      ? initial.map((row) => ({
          ...row,
          optionName: asText(row.optionName),
          optionValue: asText(row.optionValue),
          description: asText(row.description),
        }))
      : [{ optionName: "", optionValue: "", description: "", imageMediaId: null }],
  );
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.map((row, index) => (
        <div key={index} className="mb-3 rounded border border-line p-3">
          <input className={`${inputClass} mb-2`} value={asText(row.optionName)} placeholder="Option name" onChange={(e) => setRows((c) => c.map((r, i) => (i === index ? { ...r, optionName: e.target.value } : r)))} />
          <input className={`${inputClass} mb-2`} value={asText(row.optionValue)} placeholder="Value" onChange={(e) => setRows((c) => c.map((r, i) => (i === index ? { ...r, optionValue: e.target.value } : r)))} />
          <textarea className={`${inputClass} mb-2`} rows={2} value={asText(row.description)} onChange={(e) => setRows((c) => c.map((r, i) => (i === index ? { ...r, description: e.target.value } : r)))} />
          <MediaPicker name={`opt-${index}`} initialIds={row.imageMediaId ? [row.imageMediaId] : []} known={media} onChange={(ids) => setRows((c) => c.map((r, i) => (i === index ? { ...r, imageMediaId: ids[0] ?? null } : r)))} />
          <button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => setRows((c) => c.filter((_, i) => i !== index))}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className={secondaryButtonClass} onClick={() => setRows((c) => [...c, { optionName: "", optionValue: "", description: "", imageMediaId: null }])}>
        Add option
      </button>
    </div>
  );
}

export function RelatedProductsEditor({
  name,
  initial,
  options,
}: {
  name: string;
  initial: ProductRelationRow[];
  options: { value: string; label: string }[];
}) {
  const [rows, setRows] = useState(() =>
    initial.length
      ? initial.map((row) => ({
          ...row,
          relatedProductId: asText(row.relatedProductId),
          relationType: asText(row.relationType) || "related",
        }))
      : [{ relatedProductId: "", relationType: "related", sortOrder: 0 }],
  );
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.map((row, index) => (
        <div key={index} className="mb-2 grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
          <select className={inputClass} value={asText(row.relatedProductId)} onChange={(e) => setRows((c) => c.map((r, i) => (i === index ? { ...r, relatedProductId: e.target.value } : r)))}>
            <option value="">Select product</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select className={inputClass} value={asText(row.relationType) || "related"} onChange={(e) => setRows((c) => c.map((r, i) => (i === index ? { ...r, relationType: e.target.value } : r)))}>
            {["related", "alternative", "accessory", "compatible", "upsell"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button type="button" className={secondaryButtonClass} onClick={() => setRows((c) => c.filter((_, i) => i !== index))}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className={secondaryButtonClass} onClick={() => setRows((c) => [...c, { relatedProductId: "", relationType: "related", sortOrder: c.length }])}>
        Add relation
      </button>
    </div>
  );
}

export function RelatedPostsEditor({
  name,
  initial,
  options,
}: {
  name: string;
  initial: ProductPostRelationRow[];
  options: { value: string; label: string }[];
}) {
  const [rows, setRows] = useState(() =>
    initial.map((row) => ({ postId: asText(row.postId) })),
  );
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.map((row, index) => (
        <div key={`${row.postId}-${index}`} className="mb-2 grid gap-2 sm:grid-cols-[1fr_auto]">
          <select
            className={inputClass}
            value={row.postId}
            onChange={(event) =>
              setRows((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? { postId: event.target.value } : item,
                ),
              )
            }
          >
            <option value="">Select blog post</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={() => setRows((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          >
            Delete
          </button>
        </div>
      ))}
      <button
        type="button"
        className={secondaryButtonClass}
        onClick={() => setRows((current) => [...current, { postId: "" }])}
      >
        Add related blog
      </button>
      <p className="mt-2 text-xs text-muted">
        Selected blogs appear in separate cards below the product content. If
        none are selected, the latest published blogs are shown.
      </p>
    </div>
  );
}

const sectionTypes = [
  "hero",
  "text",
  "rich_text",
  "features",
  "video",
  "testimonials",
  "product_grid",
  "cta",
  "faq",
  "about",
  "why_choose_us",
  "vision",
  "mission",
  "contact",
  "custom",
];

const sectionTypeLabels: Record<string, string> = {
  hero: "Hero banner",
  text: "Text block",
  rich_text: "Rich text block",
  features: "Feature list",
  video: "Video",
  testimonials: "Customer review",
  product_grid: "Product grid",
  cta: "Call to action",
  faq: "FAQ (pages only)",
  about: "About section",
  why_choose_us: "Why choose us",
  vision: "Vision",
  mission: "Mission",
  contact: "Contact section",
  custom: "Custom section",
};

function blankPageSection(sortOrder: number, sectionType = "text"): PageSectionPayload {
  return {
    sectionType,
    title: "",
    subtitle: "",
    eyebrow: "",
    description: "",
    imageId: null,
    backgroundImageId: null,
    mobileImageId: null,
    buttonText: "",
    buttonUrl: "",
    secondaryButtonText: "",
    secondaryButtonUrl: "",
    alignment: "",
    layout: "",
    background: "",
    customData: {},
    sortOrder,
    isActive: true,
  };
}

function normalizePageSection(section: PageSectionPayload, sortOrder: number): PageSectionPayload {
  const base = blankPageSection(sortOrder);
  return {
    ...base,
    ...section,
    sectionType: section.sectionType ?? "text",
    title: section.title ?? "",
    subtitle: section.subtitle ?? "",
    eyebrow: section.eyebrow ?? "",
    description: section.description ?? "",
    buttonText: section.buttonText ?? "",
    buttonUrl: section.buttonUrl ?? "",
    secondaryButtonText: section.secondaryButtonText ?? "",
    secondaryButtonUrl: section.secondaryButtonUrl ?? "",
    alignment: section.alignment ?? "",
    layout: section.layout ?? "",
    background: section.background ?? "",
    customData: section.customData ?? {},
    sortOrder: section.sortOrder ?? sortOrder,
    isActive: section.isActive ?? true,
  };
}

export function PageSectionsEditor({
  name,
  initial,
  media,
  allowedTypes = sectionTypes,
}: {
  name: string;
  initial: PageSectionPayload[];
  media: MediaItem[];
  /** Restrict a context such as Product editing to only relevant section types. */
  allowedTypes?: string[];
}) {
  const defaultType = allowedTypes[0] ?? "text";
  const [sections, setSections] = useState<PageSectionPayload[]>(() =>
    initial.length
      ? initial.map((section, index) => normalizePageSection(section, index))
      : [blankPageSection(0, defaultType)],
  );

  function patch(index: number, patch: Partial<PageSectionPayload>) {
    setSections((c) => c.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function move(index: number, dir: -1 | 1) {
    setSections((c) => {
      const next = [...c];
      const target = index + dir;
      if (target < 0 || target >= next.length) return c;
      const [item] = next.splice(index, 1);
      if (!item) return c;
      next.splice(target, 0, item);
      return next.map((s, sortOrder) => ({ ...s, sortOrder }));
    });
  }

  function duplicate(index: number) {
    setSections((c) => {
      const copy = { ...c[index], id: undefined };
      const next = [...c];
      next.splice(index + 1, 0, copy);
      return next.map((s, sortOrder) => ({ ...s, sortOrder }));
    });
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(sections)} />
      <div className="space-y-4">
        {sections.map((section, index) => (
          <div key={index} className="rounded-lg border border-line bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select className={inputClass} value={asText(section.sectionType) || "text"} onChange={(e) => patch(index, { sectionType: e.target.value })}>
                {(allowedTypes.includes(section.sectionType)
                  ? allowedTypes
                  : [section.sectionType, ...allowedTypes]
                ).map((t) => (
                  <option key={t} value={t}>
                    {sectionTypeLabels[t] ?? t}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={section.isActive} onChange={(e) => patch(index, { isActive: e.target.checked })} />
                Active
              </label>
              <button type="button" className="text-xs font-semibold text-navy" onClick={() => move(index, -1)}>
                Up
              </button>
              <button type="button" className="text-xs font-semibold text-navy" onClick={() => move(index, 1)}>
                Down
              </button>
              <button type="button" className="text-xs font-semibold text-navy" onClick={() => duplicate(index)}>
                Duplicate
              </button>
              <button type="button" className="text-xs font-semibold text-signal" onClick={() => setSections((c) => c.filter((_, i) => i !== index))}>
                Delete
              </button>
            </div>
            <input className={`${inputClass} mb-2`} value={asText(section.eyebrow)} placeholder="Eyebrow" onChange={(e) => patch(index, { eyebrow: e.target.value })} />
            <input className={`${inputClass} mb-2`} value={asText(section.title)} placeholder="Title" onChange={(e) => patch(index, { title: e.target.value })} />
            <input className={`${inputClass} mb-2`} value={asText(section.subtitle)} placeholder="Subtitle" onChange={(e) => patch(index, { subtitle: e.target.value })} />
            {section.sectionType === "video" ? (
              <label className="mb-2 block">
                <span className={labelClass}>YouTube video URL</span>
                <input
                  className={inputClass}
                  type="url"
                  value={asText(section.customData.videoUrl)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  onChange={(e) =>
                    patch(index, {
                      customData: {
                        ...section.customData,
                        videoUrl: e.target.value,
                      },
                    })
                  }
                />
              </label>
            ) : null}
            <textarea className={`${inputClass} mb-2`} rows={3} value={asText(section.description)} placeholder="Description" onChange={(e) => patch(index, { description: e.target.value })} />
            <MediaPicker name={`section-image-${index}`} initialIds={section.imageId ? [section.imageId] : []} known={media} onChange={(ids) => patch(index, { imageId: ids[0] ?? null })} />
          </div>
        ))}
      </div>
      <button
        type="button"
        className={`${secondaryButtonClass} mt-3`}
        onClick={() => setSections((c) => [...c, blankPageSection(c.length, defaultType)])}
      >
        Add section
      </button>
    </div>
  );
}

export type { SpecRow };
