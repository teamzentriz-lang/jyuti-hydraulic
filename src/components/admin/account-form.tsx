"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/lib/cms/actions";
import { inputClass, labelClass, primaryButtonClass } from "@/components/admin/styles";

export function AccountForm() {
  const [state, action, pending] = useActionState(changePasswordAction, null);
  return (
    <form action={action} className="max-w-md space-y-4 rounded-lg border border-line bg-white p-4">
      {state?.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}
      <label className="block">
        <span className={labelClass}>Current password</span>
        <input className={inputClass} name="currentPassword" type="password" autoComplete="current-password" required />
      </label>
      <label className="block">
        <span className={labelClass}>New password</span>
        <input className={inputClass} name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <button className={primaryButtonClass} disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
