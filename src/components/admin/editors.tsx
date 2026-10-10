"use client";

import { useMemo, useState } from "react";
import { helpClass, inputClass, secondaryButtonClass } from "@/components/admin/styles";
import type { ClientItem, SpecRow, WhyItem } from "@/db/schema";

function asText(value: unknown) {
  return value == null ? "" : String(value);
}

export function SpecsEditor({ name, initial }: { name: string; initial: SpecRow[] }) {
  const [rows, setRows] = useState<SpecRow[]>(() =>
    initial.length ? initial.map((row) => ({ label: asText(row.label), value: asText(row.value) })) : [{ label: "", value: "" }],
  );

  function update(index: number, key: keyof SpecRow, value: string) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input className={inputClass} value={asText(row.label)} placeholder="Pressure" onChange={(event) => update(index, "label", event.target.value)} />
            <input className={inputClass} value={asText(row.value)} placeholder="250 bar" onChange={(event) => update(index, "value", event.target.value)} />
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => setRows((current) => [...current, { label: "", value: "" }])}>
        Add spec
      </button>
    </div>
  );
}

export function WhyEditor({ name, initial }: { name: string; initial: WhyItem[] }) {
  const [rows, setRows] = useState<WhyItem[]>(() =>
    initial.length ? initial.map((row) => ({ title: asText(row.title), body: asText(row.body) })) : [{ title: "", body: "" }],
  );

  function update(index: number, key: keyof WhyItem, value: string) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="rounded-md border border-line bg-paper/60 p-3">
            <input className={`${inputClass} mb-2`} value={asText(row.title)} placeholder="Title" onChange={(event) => update(index, "title", event.target.value)} />
            <textarea className={inputClass} rows={3} value={asText(row.body)} placeholder="Short explanation" onChange={(event) => update(index, "body", event.target.value)} />
            <button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>
              Remove
            </button>
          </div>
        ))}
      </div>
      <button type="button" className={`${secondaryButtonClass} mt-2`} onClick={() => setRows((current) => [...current, { title: "", body: "" }])}>
        Add item
      </button>
    </div>
  );
}

export function RelationManyField({
  name,
  options,
  initialIds,
}: {
  name: string;
  options: { value: string; label: string }[];
  initialIds: string[];
}) {
  const [ids, setIds] = useState(initialIds);
  const [query, setQuery] = useState("");
  const selected = ids.map((id) => options.find((option) => option.value === id)?.label ?? "Missing record");
  const matches = useMemo(
    () =>
      options
        .filter((option) => !ids.includes(option.value) && option.label.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 8),
    [ids, options, query],
  );

  function move(index: number, direction: -1 | 1) {
    setIds((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      const [item] = next.splice(index, 1);
      if (!item) return current;
      next.splice(target, 0, item);
      return next;
    });
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(ids)} />
      <ul className="mb-2 space-y-1">
        {selected.map((label, index) => (
          <li key={ids[index]} className="flex items-center justify-between gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm">
            <span>{label}</span>
            <span className="flex gap-2">
              <button type="button" className="text-xs font-semibold text-navy" onClick={() => move(index, -1)}>
                Up
              </button>
              <button type="button" className="text-xs font-semibold text-navy" onClick={() => move(index, 1)}>
                Down
              </button>
              <button type="button" className="text-xs font-semibold text-signal" onClick={() => setIds((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                Remove
              </button>
            </span>
          </li>
        ))}
      </ul>
      <input className={inputClass} value={query} placeholder="Search products" onChange={(event) => setQuery(event.target.value)} />
      {matches.length ? (
        <ul className="mt-1 overflow-hidden rounded-md border border-line bg-white">
          {matches.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
                onClick={() => {
                  setIds((current) => [...current, option.value]);
                  setQuery("");
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={helpClass}>{options.length ? "No further matches." : "Add products before relating them."}</p>
      )}
    </div>
  );
}

export function ClientsEditor({ name, initial }: { name: string; initial: ClientItem[] }) {
  const [rows, setRows] = useState<ClientItem[]>(() =>
    initial.length ? initial.map((row) => ({ name: asText(row.name), logo: asText(row.logo) })) : [],
  );
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  function update(index: number, key: keyof ClientItem, value: string) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  }

  function move(index: number, direction: -1 | 1) {
    setRows((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      const [item] = next.splice(index, 1);
      if (!item) return current;
      next.splice(target, 0, item);
      return next;
    });
  }

  async function uploadLogo(index: number, file: File | undefined) {
    if (!file) return;
    setUploadingIndex(index);
    try {
      const body = new FormData();
      body.append("files", file);
      const res = await fetch("/api/admin/media/", { method: "POST", body });
      const data = (await res.json()) as { items?: { id: string; url?: string }[] };
      const item = data.items?.[0];
      if (item) {
        const url = item.url?.startsWith("http") ? item.url : `/api/media/${item.id}/`;
        update(index, "logo", url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingIndex(null);
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-lg border border-line bg-paper/60 p-3 sm:flex-row sm:items-center">
            <div className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded border border-line bg-white p-1">
              {row.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.logo} alt={row.name || "Client logo"} className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-[10px] text-muted">No logo</span>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-muted">Brand / Client Name</label>
              <input
                className={`${inputClass} mt-1`}
                value={asText(row.name)}
                placeholder="e.g. Maruti Suzuki"
                onChange={(event) => update(index, "name", event.target.value)}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-muted">Logo Path / URL</label>
                <label className="cursor-pointer text-xs font-semibold text-signal hover:underline">
                  {uploadingIndex === index ? "Uploading…" : "Upload logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingIndex === index}
                    onChange={(e) => void uploadLogo(index, e.target.files?.[0])}
                  />
                </label>
              </div>
              <input
                className={`${inputClass} mt-1`}
                value={asText(row.logo)}
                placeholder="/clients/maruti-suzuki.jpg or https://..."
                onChange={(event) => update(index, "logo", event.target.value)}
              />
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:self-end">
              <button
                type="button"
                className="rounded border border-line px-2 py-1.5 text-xs text-navy hover:bg-white disabled:opacity-30"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className="rounded border border-line px-2 py-1.5 text-xs text-navy hover:bg-white disabled:opacity-30"
                disabled={index === rows.length - 1}
                onClick={() => move(index, 1)}
                title="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                className="rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                title="Remove client"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={`${secondaryButtonClass} mt-3 flex items-center gap-1.5`}
        onClick={() => setRows((current) => [...current, { name: "", logo: "" }])}
      >
        <span>+</span> Add Client
      </button>
    </div>
  );
}
