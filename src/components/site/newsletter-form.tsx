"use client";

import { useActionState } from "react";
import { subscribeNewsletterAction, type InquiryState } from "@/lib/cms/inquiry-action";

export function NewsletterForm() {
  const [state, action, pending] = useActionState<InquiryState, FormData>(subscribeNewsletterAction, null);

  if (state && "ok" in state && state.ok) {
    return <p className="site-footer__news-ok">{state.message}</p>;
  }

  return (
    <form action={action}>
      <p className="quote-honeypot" hidden>
        <label>
          Leave this field empty
          <input name="companyWebsite" tabIndex={-1} autoComplete="off" />
        </label>
      </p>
      <input
        type="email"
        name="email"
        required
        placeholder="Email address"
        aria-label="Email address"
        suppressHydrationWarning
      />
      <button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Subscribe"}
      </button>
      {state && "error" in state ? <p className="site-footer__news-error">{state.error}</p> : null}
    </form>
  );
}
