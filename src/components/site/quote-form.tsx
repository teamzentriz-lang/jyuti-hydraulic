"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  submitInquiryAction,
  type InquiryState,
} from "@/lib/cms/inquiry-action";

export function QuoteForm({
  subject = "",
  pagePath = "/contact/",
}: {
  subject?: string;
  pagePath?: string;
}) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(
    submitInquiryAction,
    null,
  );

  if (state && "ok" in state && state.ok) {
    return (
      <div className="quote-success">
        <p>{state.message}</p>
        <p>We reply on the next working day. You can also call or email the details on this page.</p>
        <Link href="/products/">Browse products</Link>
      </div>
    );
  }

  return (
    <form className="quote-form grid grid-cols-1 gap-4 sm:grid-cols-2" action={action}>
      <input type="hidden" name="source" value="quote" />
      <input type="hidden" name="pagePath" value={pagePath} />
      <p className="quote-honeypot" hidden>
        <label>
          Leave this field empty
          <input name="companyWebsite" tabIndex={-1} autoComplete="off" />
        </label>
      </p>
      <label className="flex flex-col gap-1 text-sm">
        <span>Full Name *</span>
        <input name="name" required placeholder="Your name" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Company Name</span>
        <input name="company" placeholder="Company name" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Email Address *</span>
        <input name="email" type="email" required placeholder="you@company.com" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Phone Number</span>
        <input name="phone" placeholder="+91" />
      </label>
      <label className="quote-form__wide flex flex-col gap-1 text-sm sm:col-span-2">
        <span>Product Interested In</span>
        <input name="subject" defaultValue={subject} placeholder="Product or application" />
      </label>
      <label className="quote-form__wide flex flex-col gap-1 text-sm sm:col-span-2">
        <span>Message / Requirements *</span>
        <textarea name="message" required rows={5} placeholder="Tell us about your requirement..." />
      </label>
      {state && "error" in state ? <p className="quote-error">{state.error}</p> : null}
      <button className="site-btn-primary quote-form__wide sm:col-span-2" type="submit" disabled={pending}>
        {pending ? "Sending..." : "Request a quote"}
      </button>
    </form>
  );
}
