"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { helpClass } from "@/components/admin/styles";

type EditorMode = "visual" | "html";

function headingTag(value: string) {
  return value === "p" ? "p" : value;
}

export function CKEditorField({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const valueRef = useRef<HTMLInputElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<EditorMode>("visual");

  const sync = useCallback((value?: string) => {
    const next = value ?? visualRef.current?.innerHTML ?? "";
    if (!valueRef.current) return;
    valueRef.current.value = next;
    valueRef.current.dispatchEvent(new Event("input", { bubbles: true }));
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

  const runCommand = (command: string, value?: string) => {
    if (mode !== "visual") return;
    visualRef.current?.focus();
    document.execCommand(command, false, value);
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

  return (
    <div className="admin-ckeditor">
      <div className="admin-editor-toolbar" role="toolbar" aria-label="Content formatting">
        <select
          aria-label="Text style"
          defaultValue="p"
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
        Click in the white area and type. Use Visual for normal writing; use HTML only when pasting or editing HTML.
      </p>
    </div>
  );
}
