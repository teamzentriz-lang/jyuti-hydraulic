"use client";

import { useEffect, useRef } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  Autoformat,
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  GeneralHtmlSupport,
  Heading,
  Italic,
  Link,
  List,
  Paragraph,
  RemoveFormat,
  SourceEditing,
  Strikethrough,
  Table,
  TableToolbar,
  Underline,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import { helpClass } from "@/components/admin/styles";

const licenseKey =
  process.env.NEXT_PUBLIC_CKEDITOR_LICENSE_KEY?.trim() || "GPL";

export function CKEditorField({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const valueRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ClassicEditor | null>(null);

  useEffect(() => {
    const restore = (event: Event) => {
      const values = (event as CustomEvent<Record<string, string[]>>).detail;
      const restored = values?.[name]?.[0];
      if (restored === undefined) return;
      editorRef.current?.setData(restored);
      if (valueRef.current) valueRef.current.value = restored;
    };
    window.addEventListener("cms:draft-restored", restore);
    return () => window.removeEventListener("cms:draft-restored", restore);
  }, [name]);

  return (
    <div className="admin-ckeditor">
      <CKEditor
        editor={ClassicEditor}
        data={defaultValue ?? ""}
        config={{
          licenseKey,
          plugins: [
            Essentials,
            Paragraph,
            Heading,
            Bold,
            Italic,
            Underline,
            Strikethrough,
            Link,
            List,
            BlockQuote,
            Table,
            TableToolbar,
            Autoformat,
            RemoveFormat,
            SourceEditing,
            GeneralHtmlSupport,
          ],
          toolbar: {
            items: [
              "undo",
              "redo",
              "|",
              "heading",
              "|",
              "bold",
              "italic",
              "underline",
              "strikethrough",
              "removeFormat",
              "|",
              "bulletedList",
              "numberedList",
              "blockQuote",
              "|",
              "link",
              "insertTable",
              "|",
              "sourceEditing",
            ],
            shouldNotGroupWhenFull: false,
          },
          table: {
            contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
          },
          link: { addTargetToExternalLinks: true, defaultProtocol: "https://" },
          htmlSupport: {
            allow: [
              {
                name: /^(p|h2|h3|h4|ul|ol|li|a|strong|em|u|s|blockquote|table|thead|tbody|tr|th|td|br)$/,
                attributes: true,
                classes: true,
                styles: true,
              },
            ],
          },
          placeholder: "Write and format content…",
        }}
        onReady={(editor) => {
          editorRef.current = editor;
          const form = valueRef.current?.closest("form");
          if (!form?.dataset.cmsDraft) return;
          try {
            const values = JSON.parse(form.dataset.cmsDraft) as Record<
              string,
              string[]
            >;
            const restored = values[name]?.[0];
            if (restored !== undefined) {
              editor.setData(restored);
              if (valueRef.current) valueRef.current.value = restored;
            }
          } catch {
            // A malformed local backup should never block the editor.
          }
        }}
        onAfterDestroy={() => {
          editorRef.current = null;
        }}
        onChange={(_event, editor) => {
          if (valueRef.current) {
            valueRef.current.value = editor.getData();
            valueRef.current.dispatchEvent(
              new Event("input", { bubbles: true }),
            );
          }
        }}
      />
      <input
        ref={valueRef}
        type="hidden"
        name={name}
        defaultValue={defaultValue ?? ""}
      />
      <p className={helpClass}>
        CKEditor: headings, formatting, lists, links, quotes, tables and HTML
        source.
      </p>
    </div>
  );
}
