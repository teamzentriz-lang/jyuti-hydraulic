"use client";

import { useEffect, useRef, useState } from "react";

type DraftSnapshot = {
  version: 1;
  updatedAt: number;
  values: Record<string, string[]>;
};

function readSnapshot(key: string): DraftSnapshot | null {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(key) ?? "null",
    ) as Partial<DraftSnapshot> | null;
    if (
      parsed?.version !== 1 ||
      !parsed.values ||
      typeof parsed.updatedAt !== "number"
    )
      return null;
    return parsed as DraftSnapshot;
  } catch {
    return null;
  }
}

function capture(form: HTMLFormElement): DraftSnapshot {
  const data = new FormData(form);
  const values: Record<string, string[]> = {};
  for (const element of Array.from(form.elements)) {
    if (!(
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ))
      continue;
    if (!element.name || element.type === "file" || element.type === "password")
      continue;
    values[element.name] ??= [];
  }
  for (const [name, value] of data.entries()) {
    if (typeof value === "string") (values[name] ??= []).push(value);
  }
  return { version: 1, updatedAt: Date.now(), values };
}

function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function restore(form: HTMLFormElement, snapshot: DraftSnapshot) {
  form.dataset.cmsDraft = JSON.stringify(snapshot.values);
  for (const element of Array.from(form.elements)) {
    if (!(
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ))
      continue;
    if (!element.name || element.type === "file" || element.type === "password")
      continue;
    const values = snapshot.values[element.name] ?? [];
    if (
      element instanceof HTMLInputElement &&
      (element.type === "checkbox" || element.type === "radio")
    ) {
      element.checked = values.includes(element.value);
      element.dispatchEvent(new Event("change", { bubbles: true }));
      continue;
    }
    if (element instanceof HTMLSelectElement && element.multiple) {
      for (const option of Array.from(element.options))
        option.selected = values.includes(option.value);
      element.dispatchEvent(new Event("change", { bubbles: true }));
      continue;
    }
    if (values[0] !== undefined) setNativeValue(element, values[0]);
  }
  window.dispatchEvent(
    new CustomEvent("cms:draft-restored", { detail: snapshot.values }),
  );
}

export function FormDraftGuard({
  formRef,
  storageKey,
  serverUpdatedAt,
  pending,
  onRestore,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  storageKey: string;
  serverUpdatedAt?: string | Date | null;
  pending: boolean;
  onRestore?: (values: Record<string, string[]>) => void;
}) {
  const [status, setStatus] = useState<"idle" | "saved" | "restored">("idle");
  const dirtyRef = useRef(false);
  const submittingRef = useRef(false);
  const onRestoreRef = useRef(onRestore);

  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const serverTimestamp = serverUpdatedAt
      ? new Date(serverUpdatedAt).getTime()
      : 0;
    // A successful server action redirects back with `?saved=1`. The draft
    // captured immediately before submit is newer than the database
    // timestamp, so treating it as recoverable here would restore the old
    // values over the freshly saved record. Only recover drafts on a normal
    // revisit; a successful save is the source of truth.
    const saveCompleted = new URLSearchParams(window.location.search).has(
      "saved",
    );
    const existing = saveCompleted ? null : readSnapshot(storageKey);
    if (saveCompleted) {
      window.localStorage.removeItem(storageKey);
      dirtyRef.current = false;
    } else if (
      existing &&
      (!Number.isFinite(serverTimestamp) ||
        existing.updatedAt > serverTimestamp)
    ) {
      window.setTimeout(() => {
        restore(form, existing);
        onRestoreRef.current?.(existing.values);
        dirtyRef.current = true;
        setStatus("restored");
      }, 0);
    } else if (existing) {
      window.localStorage.removeItem(storageKey);
    }

    let timer = 0;
    const save = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const snapshot = capture(form);
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
          form.dataset.cmsDraft = JSON.stringify(snapshot.values);
          dirtyRef.current = true;
          setStatus("saved");
        } catch {
          // Browsers can disable or exhaust local storage. The form itself
          // remains usable and the navigation warning still protects edits.
          dirtyRef.current = true;
        }
      }, 250);
    };
    const submit = () => {
      submittingRef.current = true;
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current || submittingRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const protectLinks = (event: MouseEvent) => {
      if (!dirtyRef.current || submittingRef.current || event.defaultPrevented)
        return;
      const target =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (!target || target.getAttribute("target") === "_blank") return;
      if (
        !window.confirm(
          "You have unsaved product changes. Leave this page? Your local draft will remain available.",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    form.addEventListener("input", save);
    form.addEventListener("change", save);
    form.addEventListener("submit", submit);
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", protectLinks, true);
    return () => {
      window.clearTimeout(timer);
      form.removeEventListener("input", save);
      form.removeEventListener("change", save);
      form.removeEventListener("submit", submit);
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", protectLinks, true);
    };
  }, [formRef, serverUpdatedAt, storageKey]);

  useEffect(() => {
    if (!pending) submittingRef.current = false;
  }, [pending]);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-navy"
      role="status"
    >
      <span>
        {status === "restored"
          ? "Recovered your unsaved local draft."
          : status === "saved"
            ? "Unsaved changes backed up on this device."
            : "Draft protection is on. Changes are backed up on this device."}
      </span>
      {status !== "idle" ? (
        <button
          type="button"
          className="font-semibold underline"
          onClick={() => {
            window.localStorage.removeItem(storageKey);
            delete formRef.current?.dataset.cmsDraft;
            dirtyRef.current = false;
            setStatus("idle");
          }}
        >
          Discard local backup
        </button>
      ) : null}
    </div>
  );
}
