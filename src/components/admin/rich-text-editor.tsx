"use client";

import { useEffect, useRef, useState } from "react";
import { helpClass, secondaryButtonClass } from "@/components/admin/styles";

const commands: { label: string; command: string; value?: string }[] = [
  { label: "H2", command: "formatBlock", value: "h2" },
  { label: "H3", command: "formatBlock", value: "h3" },
  { label: "Paragraph", command: "formatBlock", value: "p" },
  { label: "Bold", command: "bold" },
  { label: "Italic", command: "italic" },
  { label: "List", command: "insertUnorderedList" },
  { label: "Numbered", command: "insertOrderedList" },
];

export function RichTextEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const safeDefault = defaultValue ?? "";
  const [html, setHtml] = useState(safeDefault);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== safeDefault) {
      editorRef.current.innerHTML = safeDefault;
    }
  }, [safeDefault]);

  function sync() {
    setHtml(editorRef.current?.innerHTML ?? "");
  }

  function run(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    sync();
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {commands.map((item) => (
          <button
            key={item.label}
            type="button"
            className={secondaryButtonClass}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => run(item.command, item.value)}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className={secondaryButtonClass}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const href = window.prompt("Link URL");
            if (!href) return;
            run("createLink", href);
          }}
        >
          Link
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() =>
            run(
              "insertHTML",
              "<table><tbody><tr><th>Spec</th><th>Value</th></tr><tr><td></td><td></td></tr></tbody></table>",
            )
          }
        >
          Table
        </button>
      </div>
      <div
        ref={editorRef}
        className="rich-text min-h-40 rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
        contentEditable
        role="textbox"
        aria-multiline="true"
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
      />
      <input type="hidden" name={name} value={html ?? ""} />
      <p className={helpClass}>Headings, paragraphs, lists, links, and tables. Elementor styling is not kept.</p>
    </div>
  );
}
