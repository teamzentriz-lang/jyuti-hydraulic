"use client";

import { useActionState } from "react";
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
          HTML source shown on every public page immediately below the site
          navigation. JSON-LD schema blocks are supported.
        </p>
        <textarea
          name="commonHeaderHtml"
          className="min-h-64 w-full rounded-md border border-line bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
          aria-label="Common header HTML source"
          spellCheck={false}
          defaultValue={commonHeaderHtml}
        />
      </section>
      <section>
        <h2 className="text-base font-semibold text-navy">
          Common footer HTML
        </h2>
        <p className="mb-3 mt-1 text-sm text-muted">
          HTML source shown on every public page immediately above the site
          footer. JSON-LD schema blocks are supported.
        </p>
        <textarea
          name="commonFooterHtml"
          className="min-h-64 w-full rounded-md border border-line bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
          aria-label="Common footer HTML source"
          spellCheck={false}
          defaultValue={commonFooterHtml}
        />
      </section>
      <p className="text-xs text-muted">
        HTML is cleaned before publishing. Only valid JSON-LD scripts are
        preserved; executable scripts, event handlers and unsafe embeds are
        removed.
      </p>
      <button className={primaryButtonClass} disabled={pending}>
        {pending ? "Saving…" : "Save common HTML"}
      </button>
    </form>
  );
}
