"use client";

import dynamic from "next/dynamic";

const CKEditorField = dynamic(
  () => import("@/components/admin/ckeditor-field").then((module) => module.CKEditorField),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-52 animate-pulse rounded-md border border-line bg-slate-50 p-4 text-sm text-muted">
        Loading editor…
      </div>
    ),
  },
);

export function RichTextEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  return <CKEditorField name={name} defaultValue={defaultValue} />;
}
