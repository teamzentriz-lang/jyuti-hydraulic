"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/lib/cms/actions";
import { inputClass, labelClass, primaryButtonClass } from "@/components/admin/styles";

export function LoginForm({ next, needsSeed }: { next: string; needsSeed: boolean }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

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
        <span className="relative block">
          <input
            className={`${inputClass} pr-20`}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-semibold text-navy hover:text-signal"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? "Hide" : "View"}
          </button>
        </span>
      </label>
      <button className={`${primaryButtonClass} w-full`} type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
