"use client";

import { useEffect, useState } from "react";
import { helpClass, inputClass, secondaryButtonClass } from "@/components/admin/styles";
import type { MediaItem } from "@/lib/cms/queries";
import { ADMIN_UPLOAD_ACCEPT, isImageMimeType, isVideoMimeType } from "@/lib/media-upload";
import { mediaDeliveryUrl } from "@/lib/media-url";

export function MediaPicker({
  name,
  multiple = false,
  initialIds,
  known,
  onChange,
}: {
  name: string;
  multiple?: boolean;
  initialIds?: string[];
  known: MediaItem[];
  onChange?: (ids: string[]) => void;
}) {
  const [ids, setIds] = useState<string[]>(() => [...(initialIds ?? [])]);

  function updateIds(next: string[] | ((current: string[]) => string[])) {
    setIds((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      onChange?.(resolved);
      return resolved;
    });
  }
  const [items, setItems] = useState(known);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      void fetch(`/api/admin/media/?q=${encodeURIComponent(query)}`)
        .then(async (response) => {
          const data = (await response.json()) as { items?: MediaItem[]; error?: string };
          if (!response.ok) throw new Error(data.error || "Could not load media.");
          const next = data.items ?? [];
          setResults(next);
          setItems((current) => {
            const map = new Map(current.map((item) => [item.id, item]));
            for (const item of next) map.set(item.id, item);
            return [...map.values()];
          });
        })
        .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load media."));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  function remember(next: MediaItem[]) {
    setItems((current) => {
      const map = new Map(current.map((item) => [item.id, item]));
      for (const item of next) map.set(item.id, item);
      return [...map.values()];
    });
  }

  function choose(item: MediaItem) {
    remember([item]);
    updateIds((current) => {
      if (!multiple) return [item.id];
      return current.includes(item.id) ? current : [...current, item.id];
    });
    if (!multiple) setOpen(false);
  }

  function move(index: number, direction: -1 | 1) {
    updateIds((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      const [item] = next.splice(index, 1);
      if (!item) return current;
      next.splice(target, 0, item);
      return next;
    });
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    const body = new FormData();
    for (const file of files) body.append("files", file);
    try {
      const response = await fetch("/api/admin/media/", { method: "POST", body });
      const data = (await response.json()) as { items?: MediaItem[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      const uploaded = data.items ?? [];
      remember(uploaded);
      updateIds((current) => {
        const added = uploaded.map((item) => item.id);
        return multiple ? [...current, ...added] : added.slice(0, 1);
      });
      if (!multiple) setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const selected = ids.map((id) => items.find((item) => item.id === id) ?? { id, url: "", filename: "Missing file", alt: "", mimeType: "" });

  return (
    <div>
      <input type="hidden" name={name} value={multiple ? JSON.stringify(ids) : ids[0] ?? ""} />
      <ul className="mb-2 space-y-2">
        {selected.map((item, index) => (
          <li key={`${item.id}-${index}`} className="flex items-center gap-3 rounded-md border border-line bg-white p-2">
            {isImageMimeType(item.mimeType) && item.url ? (
              // Admin previews are local or R2 URLs that are not worth optimizing here.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaDeliveryUrl(item)} alt="" className="h-14 w-14 rounded object-cover" />
            ) : isVideoMimeType(item.mimeType) ? (
              <span className="flex h-14 w-14 items-center justify-center rounded bg-paper text-xs font-semibold text-muted">Video</span>
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded bg-paper text-xs font-semibold text-muted">PDF</span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{item.filename}</span>
              <span className="block truncate text-xs text-muted">{item.alt || "No alt text"}</span>
            </span>
            {multiple ? (
              <span className="flex gap-2 text-xs font-semibold">
                <button type="button" onClick={() => move(index, -1)}>
                  Up
                </button>
                <button type="button" onClick={() => move(index, 1)}>
                  Down
                </button>
              </span>
            ) : null}
            <button type="button" className="text-xs font-semibold text-signal" onClick={() => updateIds((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className={secondaryButtonClass} onClick={() => setOpen(true)}>
        {multiple ? "Add files" : ids.length ? "Change file" : "Choose file"}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-4 sm:items-center">
          <div className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-base font-semibold text-navy">Media library</h2>
              <button type="button" className={secondaryButtonClass} onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <div className="flex flex-wrap gap-2 border-b border-line px-4 py-3">
              <input className={`${inputClass} min-w-48 flex-1`} value={query} placeholder="Search files" onChange={(event) => setQuery(event.target.value)} />
              <label className={secondaryButtonClass}>
                {uploading ? "Uploading…" : "Upload"}
                <input
                  className="sr-only"
                  type="file"
                  accept={ADMIN_UPLOAD_ACCEPT}
                  multiple={multiple}
                  disabled={uploading}
                  onChange={(event) => {
                    void upload(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            {error ? <p className="px-4 pt-3 text-sm text-signal">{error}</p> : null}
            <ul className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-4">
              {results.map((item) => (
                <li key={item.id}>
                  <button type="button" className="w-full rounded-md border border-line p-2 text-left hover:border-navy" onClick={() => choose(item)}>
                    {isImageMimeType(item.mimeType) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaDeliveryUrl(item)} alt="" className="mb-2 aspect-square w-full rounded object-cover" />
                    ) : isVideoMimeType(item.mimeType) ? (
                      <span className="mb-2 flex aspect-square items-center justify-center rounded bg-paper text-sm font-semibold">Video</span>
                    ) : (
                      <span className="mb-2 flex aspect-square items-center justify-center rounded bg-paper text-sm font-semibold">PDF</span>
                    )}
                    <span className="block truncate text-xs">{item.filename}</span>
                  </button>
                </li>
              ))}
            </ul>
            {!results.length ? (
              <p className={`${helpClass} px-4 pb-4`}>No files yet. Upload an image, video (MP4, WebM, MOV), or PDF.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
