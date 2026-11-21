"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { helpClass } from "@/components/admin/styles";
import {
  hasLegacyBlogEmbed,
  removeLegacyBlogEmbed,
} from "@/lib/cms/legacy-blog-embed";
import type { MediaItem } from "@/lib/cms/queries";
import { isImageMimeType } from "@/lib/media-upload";
import { mediaDeliveryUrl } from "@/lib/media-url";

type EditorMode = "visual" | "html";

function headingTag(value: string) {
  return value === "p" ? "p" : value;
}

export function CKEditorField({
  name,
  defaultValue,
  media = [],
}: {
  name: string;
  defaultValue: string;
  media?: MediaItem[];
}) {
  const valueRef = useRef<HTMLInputElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const [mode, setMode] = useState<EditorMode>("visual");
  const [blockStyle, setBlockStyle] = useState("p");
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [pickerMedia, setPickerMedia] = useState<MediaItem[]>(media);
  const [pickerError, setPickerError] = useState("");
  const [legacyNoteVisible, setLegacyNoteVisible] = useState(() =>
    hasLegacyBlogEmbed(defaultValue ?? ""),
  );

  const rememberSelection = useCallback(() => {
    const root = visualRef.current;
    const selection = window.getSelection();
    if (!root || !selection?.rangeCount || !selection.anchorNode || !root.contains(selection.anchorNode)) return;
    selectionRef.current = selection.getRangeAt(0).cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    const range = selectionRef.current;
    if (!range || !visualRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  const sync = useCallback((value?: string) => {
    const next = value ?? visualRef.current?.innerHTML ?? "";
    if (!valueRef.current) return;
    valueRef.current.value = next;
    valueRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    setLegacyNoteVisible(hasLegacyBlogEmbed(next));
  }, []);

  const setValue = useCallback((value: string) => {
    if (visualRef.current) visualRef.current.innerHTML = value;
    if (sourceRef.current) sourceRef.current.value = value;
    sync(value);
  }, [sync]);

  useEffect(() => {
    const restore = (event: Event) => {
      const values = (event as CustomEvent<Record<string, string[]>>).detail;
      const restored = values?.[name]?.[0];
      if (restored !== undefined) setValue(restored);
    };
    window.addEventListener("cms:draft-restored", restore);
    return () => window.removeEventListener("cms:draft-restored", restore);
  }, [name, setValue]);

  useEffect(() => {
    const updateBlockStyle = () => {
      const root = visualRef.current;
      const selection = window.getSelection();
      if (!root || !selection?.anchorNode || !root.contains(selection.anchorNode)) return;
      rememberSelection();
      const element = selection.anchorNode.nodeType === Node.ELEMENT_NODE
        ? (selection.anchorNode as Element)
        : selection.anchorNode.parentElement;
      const block = element?.closest("h2,h3,p,blockquote");
      setBlockStyle(block?.tagName.toLowerCase() === "h2" ? "h2" : block?.tagName.toLowerCase() === "h3" ? "h3" : "p");
    };
    document.addEventListener("selectionchange", updateBlockStyle);
    return () => document.removeEventListener("selectionchange", updateBlockStyle);
  }, [rememberSelection]);

  const runCommand = (command: string, value?: string) => {
    if (mode !== "visual") return;
    visualRef.current?.focus({ preventScroll: true });
    restoreSelection();
    document.execCommand(command, false, value);
    if (command === "formatBlock") setBlockStyle(value === "h2" || value === "h3" ? value : "p");
    sync();
  };

  const switchMode = (nextMode: EditorMode) => {
    if (nextMode === mode) return;
    if (nextMode === "html") {
      const value = visualRef.current?.innerHTML ?? valueRef.current?.value ?? "";
      if (sourceRef.current) sourceRef.current.value = value;
    } else if (visualRef.current && sourceRef.current) {
      visualRef.current.innerHTML = sourceRef.current.value;
      sync(sourceRef.current.value);
    }
    setMode(nextMode);
  };

  const insertImage = (item: MediaItem) => {
    if (!visualRef.current) return;
    visualRef.current.focus();
    const url = mediaDeliveryUrl(item).replace(/"/g, "&quot;");
    const alt = (item.alt || item.filename).replace(/"/g, "&quot;");
    document.execCommand(
      "insertHTML",
      false,
      `<figure><img src="${url}" alt="${alt}" /><figcaption>${alt}</figcaption></figure><p></p>`,
    );
    sync();
    setImagePickerOpen(false);
  };

  const removeBlogEmbed = () => {
    const current = visualRef.current?.innerHTML ?? valueRef.current?.value ?? "";
    setValue(removeLegacyBlogEmbed(current));
  };

  const images = pickerMedia.filter((item) => isImageMimeType(item.mimeType));

  const openImagePicker = () => {
    setImagePickerOpen(true);
    setPickerError("");
    void fetch("/api/admin/media/")
      .then(async (response) => {
        const data = (await response.json()) as { items?: MediaItem[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Could not load media.");
        setPickerMedia(data.items ?? []);
      })
      .catch((reason: unknown) =>
        setPickerError(reason instanceof Error ? reason.message : "Could not load media."),
      );
  };

  return (
    <div className="admin-ckeditor">
      <div
        className="admin-editor-toolbar"
        role="toolbar"
        aria-label="Content formatting"
        onMouseDownCapture={(event) => {
          const target = event.target;
          if (!(target instanceof Element) || !target.closest("button, select")) return;
          rememberSelection();
          // Buttons must not take focus: doing so collapses the selected text
          // before execCommand runs. Selects retain their native interaction.
          if (target.closest("button")) event.preventDefault();
        }}
      >
        <select
          aria-label="Text style"
          value={blockStyle}
          disabled={mode !== "visual"}
          onChange={(event) => runCommand("formatBlock", headingTag(event.target.value))}
        >
          <option value="p">Paragraph</option>
          <option value="h2">Section heading</option>
          <option value="h3">Small heading</option>
        </select>
        <button type="button" onClick={() => runCommand("bold")} disabled={mode !== "visual"}><strong>B</strong></button>
        <button type="button" onClick={() => runCommand("italic")} disabled={mode !== "visual"}><em>I</em></button>
        <button type="button" onClick={() => runCommand("underline")} disabled={mode !== "visual"}><u>U</u></button>
        <button type="button" onClick={() => runCommand("insertUnorderedList")} disabled={mode !== "visual"}>• List</button>
        <button type="button" onClick={() => runCommand("insertOrderedList")} disabled={mode !== "visual"}>1. List</button>
        <button type="button" onClick={() => runCommand("formatBlock", "blockquote")} disabled={mode !== "visual"}>Quote</button>
        <button
          type="button"
          onClick={() => runCommand("insertHTML", "<table><thead><tr><th>Heading</th><th>Detail</th></tr></thead><tbody><tr><td>Item</td><td>Value</td></tr></tbody></table><p></p>")}
          disabled={mode !== "visual"}
        >
          Table
        </button>
        <button type="button" onClick={openImagePicker} disabled={mode !== "visual"}>Insert image</button>
        <span className="admin-editor-toolbar__spacer" />
        <button type="button" className={mode === "visual" ? "is-active" : ""} onClick={() => switchMode("visual")}>Visual</button>
        <button type="button" className={mode === "html" ? "is-active" : ""} onClick={() => switchMode("html")}>HTML</button>
      </div>
      <div
        ref={visualRef}
        className="admin-editor-surface"
        contentEditable={mode === "visual"}
        suppressContentEditableWarning
        role="textbox"
        aria-label="Product description"
        aria-multiline="true"
        data-placeholder="Write the product description here…"
        hidden={mode !== "visual"}
        dangerouslySetInnerHTML={{ __html: defaultValue ?? "" }}
        onInput={() => sync()}
        onBlur={() => sync()}
      />
      <textarea
        ref={sourceRef}
        className="admin-editor-source"
        hidden={mode !== "html"}
        aria-label="Product description HTML"
        defaultValue={defaultValue ?? ""}
        onInput={(event) => sync(event.currentTarget.value)}
      />
      <input ref={valueRef} type="hidden" name={name} defaultValue={defaultValue ?? ""} />
      <p className={helpClass}>
        Click in the white area and type. Use Visual for normal writing; use Insert image to use an uploaded media-library image.
      </p>
      {legacyNoteVisible ? (
        <div className="admin-editor-legacy-note">
          <span>This description contains an old embedded blog card. Blogs are now managed separately.</span>
          <button type="button" onClick={removeBlogEmbed}>Remove old blog card</button>
        </div>
      ) : null}
      {imagePickerOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy/50 p-4 sm:items-center" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setImagePickerOpen(false);
        }}>
          <section className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl" role="dialog" aria-modal="true" aria-label="Insert an uploaded image">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-navy">Insert uploaded image</h2>
                <p className="mt-1 text-xs text-muted">Choose an image already in the Media library.</p>
              </div>
              <button type="button" className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-navy" onClick={() => setImagePickerOpen(false)}>Close</button>
            </div>
            <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-4">
              {images.map((item) => (
                <button key={item.id} type="button" className="rounded-md border border-line p-2 text-left hover:border-navy" onClick={() => insertImage(item)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaDeliveryUrl(item)} alt="" className="mb-2 aspect-square w-full rounded object-cover" />
                  <span className="block truncate text-xs text-navy">{item.alt || item.filename}</span>
                </button>
              ))}
            </div>
            {pickerError ? <p className="px-4 pb-4 text-sm text-signal">{pickerError}</p> : null}
            {!images.length ? <p className="p-4 text-sm text-muted">No uploaded images yet. Upload one in Product images first, then insert it here.</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
