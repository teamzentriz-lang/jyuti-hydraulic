"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/cms/actions";
import { inputClass, labelClass, primaryButtonClass } from "@/components/admin/styles";

export function LoginForm({ next, needsSeed }: { next: string; needsSeed: boolean }) {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {needsSeed ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No accounts exist yet. Set ADMIN_EMAIL and ADMIN_PASSWORD, then run <code>npm run db:seed</code>.
        </p>
      ) : null}
      {state?.error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}
      <label className="block">
        <span className={labelClass}>Email</span>
        <input className={inputClass} name="email" type="email" autoComplete="username" required />
      </label>
      <label className="block">
        <span className={labelClass}>Password</span>
        <input className={inputClass} name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className={`${primaryButtonClass} w-full`} type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
