"use client";

import { useState } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  Autoformat, BlockQuote, Bold, ClassicEditor, Essentials, GeneralHtmlSupport,
  Heading, Italic, Link, List, Paragraph, RemoveFormat, SourceEditing,
  Strikethrough, Table, TableToolbar, Underline,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import { helpClass } from "@/components/admin/styles";

const licenseKey = process.env.NEXT_PUBLIC_CKEDITOR_LICENSE_KEY?.trim() || "GPL";

export function CKEditorField({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [html, setHtml] = useState(defaultValue ?? "");
  return (
    <div className="admin-ckeditor">
      <CKEditor
        editor={ClassicEditor}
        data={html}
        config={{
          licenseKey,
          plugins: [Essentials, Paragraph, Heading, Bold, Italic, Underline, Strikethrough, Link, List, BlockQuote, Table, TableToolbar, Autoformat, RemoveFormat, SourceEditing, GeneralHtmlSupport],
          toolbar: {
            items: ["undo", "redo", "|", "heading", "|", "bold", "italic", "underline", "strikethrough", "removeFormat", "|", "bulletedList", "numberedList", "blockQuote", "|", "link", "insertTable", "|", "sourceEditing"],
            shouldNotGroupWhenFull: false,
          },
          table: { contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"] },
          link: { addTargetToExternalLinks: true, defaultProtocol: "https://" },
          htmlSupport: { allow: [{ name: /^(p|h2|h3|h4|ul|ol|li|a|strong|em|u|s|blockquote|table|thead|tbody|tr|th|td|br)$/, attributes: true, classes: true, styles: true }] },
          placeholder: "Write and format content…",
        }}
        onChange={(_event, editor) => setHtml(editor.getData())}
      />
      <input type="hidden" name={name} value={html} />
      <p className={helpClass}>CKEditor: headings, formatting, lists, links, quotes, tables and HTML source.</p>
    </div>
  );
}
