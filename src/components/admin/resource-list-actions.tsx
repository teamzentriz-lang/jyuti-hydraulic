"use client";

import Link from "next/link";
import { Copy, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { clonePostAction, deleteResourceAction } from "@/lib/cms/actions";
import { publicPath } from "@/lib/paths";

function ActionButton({
  children,
  label,
  tone = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      {...props}
      type="submit"
      title={label}
      aria-label={label}
      className={`grid h-8 w-8 place-items-center rounded-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        tone === "danger"
          ? "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 focus-visible:outline-red-600"
          : "bg-paper text-navy hover:bg-navy hover:text-white focus-visible:outline-navy"
      }`}
    >
      {children}
    </button>
  );
}

const cloneActions: Record<string, ((formData: FormData) => Promise<void>) | undefined> = {
  posts: clonePostAction,
};

export function ResourceListActions({
  resource,
  id,
  path,
  published,
}: {
  resource: string;
  id: string;
  path: string;
  published: boolean;
}) {
  const singular = resource === "posts" ? "post" : resource.replace(/s$/, "");
  const cloneAction = cloneActions[resource];

  return (
    <div className="flex min-w-[148px] items-center gap-1.5">
      {published ? (
        <Link
          href={publicPath(path)}
          target="_blank"
          rel="noopener noreferrer"
          title={`View ${singular}`}
          aria-label={`View ${singular}`}
          className="grid h-8 w-8 place-items-center rounded-md bg-sky-50 text-sky-700 transition hover:bg-sky-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          <Eye className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </Link>
      ) : (
        <span
          title={`Publish this ${singular} to view its page`}
          className="grid h-8 w-8 place-items-center rounded-md bg-paper text-muted"
          aria-hidden="true"
        >
          <EyeOff className="h-4 w-4" strokeWidth={2} />
        </span>
      )}
      <Link
        href={`/admin/${resource}/${id}/`}
        title={`Edit ${singular}`}
        aria-label={`Edit ${singular}`}
        className="grid h-8 w-8 place-items-center rounded-md bg-indigo-50 text-indigo-700 transition hover:bg-indigo-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </Link>
      {cloneAction ? (
        <form action={cloneAction}>
          <input type="hidden" name="id" value={id} />
          <ActionButton label="Clone as draft">
            <Copy className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </ActionButton>
        </form>
      ) : null}
      <form
        action={deleteResourceAction}
        onSubmit={(event) => {
          if (
            !window.confirm(
              `Delete this ${singular} permanently? This cannot be undone.`,
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="resource" value={resource} />
        <input type="hidden" name="id" value={id} />
        <ActionButton label={`Delete ${singular}`} tone="danger">
          <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </ActionButton>
      </form>
    </div>
  );
}
