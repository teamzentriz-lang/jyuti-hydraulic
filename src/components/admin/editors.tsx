"use client";

import { useMemo, useState } from "react";
import { helpClass, inputClass, secondaryButtonClass } from "@/components/admin/styles";
import type { SpecRow, WhyItem } from "@/db/schema";

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
