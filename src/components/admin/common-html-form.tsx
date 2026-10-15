"use client";

import { useActionState } from "react";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { primaryButtonClass } from "@/components/admin/styles";
import { saveCommonHtmlAction } from "@/lib/cms/actions";

export function CommonHtmlForm({
  commonHeaderHtml,
  commonFooterHtml,
}: {
  commonHeaderHtml: string;
  commonFooterHtml: string;
}) {
  const [state, action, pending] = useActionState(saveCommonHtmlAction, null);
  return (
    <form
      action={action}
      className="space-y-6 rounded-lg border border-line bg-white p-4"
    >
      {state?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      <section>
        <h2 className="text-base font-semibold text-navy">
          Common header HTML
        </h2>
        <p className="mb-3 mt-1 text-sm text-muted">
          Shown on every public page immediately below the site navigation.
        </p>
        <RichTextEditor
          name="commonHeaderHtml"
          defaultValue={commonHeaderHtml}
        />
      </section>
      <section>
        <h2 className="text-base font-semibold text-navy">
          Common footer HTML
        </h2>
        <p className="mb-3 mt-1 text-sm text-muted">
          Shown on every public page immediately above the site footer.
        </p>
        <RichTextEditor
          name="commonFooterHtml"
          defaultValue={commonFooterHtml}
        />
      </section>
      <p className="text-xs text-muted">
        HTML is cleaned before publishing. Scripts, event handlers and unsafe
        embeds are not allowed.
      </p>
      <button className={primaryButtonClass} disabled={pending}>
        {pending ? "Saving…" : "Save common HTML"}
      </button>
    </form>
  );
}
